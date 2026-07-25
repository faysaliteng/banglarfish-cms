import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const OrderItemInput = z.object({
  productId: z.string().uuid(),
  variantId: z.string().uuid().nullable().optional(),
  weight: z.string().max(40).optional().default(""),
  qty: z.number().int().positive().max(999),
});

const CreateOrderSchema = z.object({
  full_name: z.string().trim().min(2).max(100),
  phone: z.string().trim().min(10).max(20),
  address_line1: z.string().trim().min(3).max(200),
  address_line2: z.string().trim().max(200).optional().nullable(),
  city: z.string().trim().min(2).max(80),
  district: z.string().trim().max(80).optional().nullable(),
  postal_code: z.string().trim().max(20).optional().nullable(),
  notes: z.string().trim().max(500).optional().nullable(),
  payment_method: z.enum(["cod", "bkash", "nagad", "card"]),
  coupon_code: z.string().trim().max(40).optional().nullable(),
  items: z.array(OrderItemInput).min(1).max(50),
});

function genOrderNumber(): string {
  const d = new Date();
  const ymd = `${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  const rand = String(Math.floor(1000 + Math.random() * 9000));
  return `BF-${ymd}-${rand}`;
}

export const createOrder = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => CreateOrderSchema.parse(i))
  .handler(async ({ data }): Promise<{ id: string; order_number: string; redirect_url: string }> => {
    const { requireUser } = await import("@/server/auth/context");
    const { db } = await import("@/server/db");
    const schema = await import("@/server/db/schema");
    const { eq, and, gte, inArray, sql } = await import("drizzle-orm");
    const { getSettingsValue } = await import("@/server/settings");
    const { audit } = await import("@/server/audit");

    const user = await requireUser();
    const settings = await getSettingsValue();

    // Delivery-area coverage gate — reject orders outside the covered zones.
    const { getDeliveryConfig } = await import("@/server/site-config");
    const { isAddressCovered } = await import("@/lib/delivery");
    const deliveryCfg = await getDeliveryConfig();
    if (!isAddressCovered({ city: data.city, district: data.district, address_line1: data.address_line1, postal_code: data.postal_code }, deliveryCfg)) {
      throw new Error(deliveryCfg.message || "Sorry, we don't deliver to that area yet.");
    }

    // Load authoritative products + variants for the requested items.
    const productIds = [...new Set(data.items.map((i) => i.productId))];
    const products = await db.select().from(schema.products).where(inArray(schema.products.id, productIds));
    const productById = new Map(products.map((p) => [p.id, p]));
    const variantIds = data.items.map((i) => i.variantId).filter((v): v is string => !!v);
    const variants = variantIds.length
      ? await db.select().from(schema.productVariants).where(inArray(schema.productVariants.id, variantIds))
      : [];
    const variantById = new Map(variants.map((v) => [v.id, v]));

    type Line = { productId: string; variantId: string | null; name: string; image: string; weight: string; price: number; qty: number };
    const lines: Line[] = [];
    for (const item of data.items) {
      const product = productById.get(item.productId);
      if (!product || !product.active) throw new Error(`A product in your cart is no longer available.`);

      let price = product.price;
      let variantId: string | null = null;
      let weight = item.weight;
      let available = product.stock;
      if (item.variantId) {
        const v = variantById.get(item.variantId);
        if (!v || v.productId !== product.id) throw new Error("Invalid product option selected.");
        price = v.price; // authoritative variant price — client price is ignored
        variantId = v.id;
        weight = v.label;
        available = v.stock;
      }
      // Oversell guard (pre-check; a conditional UPDATE below enforces it atomically too).
      if (available < item.qty) throw new Error(`Sorry, only ${available} of "${product.name}"${weight ? ` (${weight})` : ""} left in stock.`);
      lines.push({ productId: product.id, variantId, name: product.name, image: product.image, weight, price, qty: item.qty });
    }

    const subtotal = lines.reduce((s, l) => s + l.price * l.qty, 0);

    // Coupon (validated + applied server-side).
    let discount = 0;
    let appliedCoupon: string | null = null;
    if (data.coupon_code) {
      const [c] = await db.select().from(schema.coupons).where(eq(schema.coupons.code, data.coupon_code.toUpperCase())).limit(1);
      if (c && c.active && (!c.expiresAt || c.expiresAt.getTime() > Date.now()) && subtotal >= c.minSubtotal && (c.usageLimit === 0 || c.usage < c.usageLimit)) {
        discount = c.type === "percent" ? Math.round((subtotal * c.value) / 100) : Math.min(c.value, subtotal);
        appliedCoupon = c.code;
      }
    }

    // Shipping — resolve the buyer's city to a shipping zone; fall back to flat settings.
    const zones = await db.select().from(schema.shippingZones).where(eq(schema.shippingZones.active, true));
    const cityLc = data.city.trim().toLowerCase();
    const zone = zones.find((z) => (z.cities ?? []).some((c) => c.toLowerCase() === cityLc || cityLc.includes(c.toLowerCase())));
    const afterDiscount = subtotal - discount;
    const shipping = zone
      ? afterDiscount >= zone.freeAbove ? 0 : zone.rate
      : afterDiscount >= (settings.freeShippingThreshold ?? 2000) ? 0 : (settings.standardShipping ?? 80);

    // Tax / VAT from settings.
    const tax = Math.round((afterDiscount * (settings.taxPercent ?? 0)) / 100);
    const total = Math.max(0, afterDiscount + shipping + tax);

    const result = await db.transaction(async (tx) => {
      let orderNumber = genOrderNumber();
      let inserted: { id: string; orderNumber: string } | undefined;
      for (let attempt = 0; attempt < 5 && !inserted; attempt++) {
        try {
          const [row] = await tx
            .insert(schema.orders)
            .values({
              orderNumber,
              userId: user.id,
              status: "pending",
              paymentMethod: data.payment_method,
              paymentStatus: "pending",
              subtotal,
              shipping,
              discount,
              tax,
              total,
              couponCode: appliedCoupon,
              fullName: data.full_name,
              phone: data.phone,
              addressLine1: data.address_line1,
              addressLine2: data.address_line2 ?? null,
              city: data.city,
              district: data.district ?? null,
              postalCode: data.postal_code ?? null,
              notes: data.notes ?? null,
              items: lines,
            })
            .returning({ id: schema.orders.id, orderNumber: schema.orders.orderNumber });
          inserted = row;
        } catch {
          orderNumber = genOrderNumber();
        }
      }
      if (!inserted) throw new Error("Could not create order. Please try again.");

      await tx.insert(schema.orderStatusHistory).values({ orderId: inserted.id, status: "pending", note: "Order placed", actorId: user.id });

      // Atomic stock decrement — conditional UPDATE prevents overselling under concurrency.
      for (const l of lines) {
        const prod = await tx.update(schema.products).set({ stock: sql`${schema.products.stock} - ${l.qty}` }).where(and(eq(schema.products.id, l.productId), gte(schema.products.stock, l.qty))).returning({ id: schema.products.id });
        if (prod.length === 0) throw new Error(`"${l.name}" just sold out. Please adjust your cart.`);
        if (l.variantId) {
          const vr = await tx.update(schema.productVariants).set({ stock: sql`${schema.productVariants.stock} - ${l.qty}` }).where(and(eq(schema.productVariants.id, l.variantId), gte(schema.productVariants.stock, l.qty))).returning({ id: schema.productVariants.id });
          if (vr.length === 0) throw new Error(`"${l.name}"${l.weight ? ` (${l.weight})` : ""} just sold out.`);
        }
        await tx.insert(schema.inventoryLedger).values({ productId: l.productId, variantId: l.variantId, delta: -l.qty, reason: "sale", note: inserted.orderNumber });
      }

      if (appliedCoupon) {
        await tx.update(schema.coupons).set({ usage: sql`${schema.coupons.usage} + 1` }).where(eq(schema.coupons.code, appliedCoupon));
      }

      return inserted;
    });

    // Payment: COD confirms immediately; online methods initiate a gateway redirect.
    let redirect_url = `/order-confirmed?id=${result.orderNumber}`;
    if (data.payment_method === "cod") {
      const { sendOrderConfirmation } = await import("@/server/notify");
      void sendOrderConfirmation(data.phone, result.orderNumber, total, false);
      await db.insert(schema.payments).values({ orderId: result.id, orderNumber: result.orderNumber, provider: "cod", amount: total, status: "initiated" });
    } else {
      const { initiatePayment } = await import("@/server/payments");
      const { getRequest } = await import("@tanstack/react-start/server");
      let origin = process.env.APP_URL ?? "";
      if (!origin) { try { origin = new URL(getRequest()!.url).origin; } catch { origin = ""; } }
      try {
        const init = await initiatePayment(data.payment_method, { id: result.id, orderNumber: result.orderNumber, total, fullName: data.full_name, phone: data.phone, email: user.email, city: data.city, address: data.address_line1 }, origin);
        await db.insert(schema.payments).values({ orderId: result.id, orderNumber: result.orderNumber, provider: init.provider, amount: total, status: "initiated", transactionId: init.transactionId ?? null, sessionKey: init.sessionKey ?? null });
        redirect_url = init.redirectUrl;
      } catch (e) {
        console.error("[payment init]", e);
        redirect_url = `/order-confirmed?id=${result.orderNumber}&payment=error`;
      }
    }

    await audit(user, "order.create", "order", result.id, { orderNumber: result.orderNumber, total });
    return { id: result.id, order_number: result.orderNumber, redirect_url };
  });

export const listMyOrders = createServerFn({ method: "GET" }).handler(async () => {
  const { requireUser } = await import("@/server/auth/context");
  const { db } = await import("@/server/db");
  const { orders } = await import("@/server/db/schema");
  const { eq, desc } = await import("drizzle-orm");
  const user = await requireUser();
  const rows = await db.select().from(orders).where(eq(orders.userId, user.id)).orderBy(desc(orders.createdAt));
  return rows.map((o) => ({
    id: o.id,
    order_number: o.orderNumber,
    status: o.status,
    payment_status: o.paymentStatus,
    subtotal: o.subtotal,
    shipping: o.shipping,
    discount: o.discount,
    total: o.total,
    items: o.items,
    created_at: o.createdAt.toISOString(),
  }));
});

export const getOrderByNumber = createServerFn({ method: "GET" })
  .inputValidator((i: unknown) => z.object({ order_number: z.string() }).parse(i))
  .handler(async ({ data }) => {
    const { requireUser } = await import("@/server/auth/context");
    const { db } = await import("@/server/db");
    const { orders } = await import("@/server/db/schema");
    const { and, eq } = await import("drizzle-orm");
    const user = await requireUser();
    const [o] = await db.select().from(orders).where(and(eq(orders.orderNumber, data.order_number), eq(orders.userId, user.id))).limit(1);
    if (!o) return null;
    return { id: o.id, order_number: o.orderNumber, status: o.status, payment_status: o.paymentStatus, total: o.total, items: o.items, created_at: o.createdAt.toISOString() };
  });
