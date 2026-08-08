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
  gift_card_code: z.string().trim().max(40).optional().nullable(),
  idempotency_key: z.string().trim().max(80).optional().nullable(),
  email: z.string().trim().email().max(160).optional().nullable(), // guest checkout
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
    const { getSessionUser } = await import("@/server/auth/session");
    const { db } = await import("@/server/db");
    const schema = await import("@/server/db/schema");
    const { eq, and, gte, inArray, sql } = await import("drizzle-orm");
    const { getSettingsValue } = await import("@/server/settings");
    const { audit } = await import("@/server/audit");

    // Guest checkout: a signed-in user is used when present, else a guest email is required.
    const user = await getSessionUser();
    const guestEmail = (data.email || "").trim().toLowerCase();
    if (!user && !guestEmail) throw new Error("An email is required to place a guest order.");
    const buyerEmail = user?.email ?? guestEmail;
    const settings = await getSettingsValue();

    // Idempotency: a repeated submit with the same key returns the original order
    // instead of creating a duplicate (protects against double-clicks / retries).
    if (data.idempotency_key) {
      const [prev] = await db.select().from(schema.idempotencyKeys).where(eq(schema.idempotencyKeys.key, data.idempotency_key)).limit(1);
      if (prev) return { id: prev.orderId, order_number: prev.orderNumber, redirect_url: `/order-confirmed?id=${encodeURIComponent(prev.orderNumber)}` };
    }

    // Delivery-area coverage config loaded here; the gate is applied below and
    // skipped entirely for all-digital carts (nothing physical ships).
    const { getDeliveryConfig } = await import("@/server/site-config");
    const { isAddressCovered } = await import("@/lib/delivery");
    const deliveryCfg = await getDeliveryConfig();

    // Load authoritative products + variants for the requested items.
    const productIds = [...new Set(data.items.map((i) => i.productId))];
    const products = await db.select().from(schema.products).where(inArray(schema.products.id, productIds));
    const productById = new Map(products.map((p) => [p.id, p]));
    const variantIds = data.items.map((i) => i.variantId).filter((v): v is string => !!v);
    const variants = variantIds.length
      ? await db.select().from(schema.productVariants).where(inArray(schema.productVariants.id, variantIds))
      : [];
    const variantById = new Map(variants.map((v) => [v.id, v]));

    type Line = { productId: string; variantId: string | null; name: string; image: string; weight: string; price: number; qty: number; taxClass: string; shippingClass: string; isDigital: boolean };
    const lines: Line[] = [];
    for (const item of data.items) {
      const product = productById.get(item.productId);
      if (!product || !product.active) throw new Error(`A product in your cart is no longer available.`);

      let price = product.price;
      let variantId: string | null = null;
      let weight = item.weight;
      let available = product.stock;
      const taxClass = (product as { taxClass?: string }).taxClass || "standard";
      const shippingClass = (product as { shippingClass?: string }).shippingClass || "";
      const isDigital = !!(product as { isDigital?: boolean }).isDigital;
      if (item.variantId) {
        const v = variantById.get(item.variantId);
        if (!v || v.productId !== product.id) throw new Error("Invalid product option selected.");
        price = v.price; // authoritative variant price — client price is ignored
        variantId = v.id;
        weight = v.label;
        available = v.stock;
      }
      // Oversell guard (pre-check; a conditional UPDATE below enforces it atomically too).
      // Digital products are not stock-limited — fulfillment is gated by key availability instead.
      if (!isDigital && available < item.qty) throw new Error(`Sorry, only ${available} of "${product.name}"${weight ? ` (${weight})` : ""} left in stock.`);
      lines.push({ productId: product.id, variantId, name: product.name, image: product.image, weight, price, qty: item.qty, taxClass, shippingClass, isDigital });
    }
    const allDigital = lines.length > 0 && lines.every((l) => l.isDigital);

    // Delivery-area gate applies only when something physical ships.
    if (!allDigital && !isAddressCovered({ city: data.city, district: data.district, address_line1: data.address_line1, postal_code: data.postal_code }, deliveryCfg)) {
      throw new Error(deliveryCfg.message || "Sorry, we don't deliver to that area yet.");
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

    // B2B customer-group pricing — an extra % off + optional tax exemption.
    const { getCustomerGroups } = await import("@/server/site-config");
    let groupId = "";
    if (user) {
      const [dbUser] = await db.select({ g: schema.users.customerGroup }).from(schema.users).where(eq(schema.users.id, user.id)).limit(1);
      groupId = dbUser?.g || "";
    }
    let groupTaxExempt = false;
    if (groupId) {
      const grp = (await getCustomerGroups()).groups.find((g) => g.id === groupId);
      if (grp) {
        if (grp.discountPercent > 0) discount += Math.round((subtotal * grp.discountPercent) / 100);
        groupTaxExempt = grp.taxExempt;
      }
    }
    // Automatic promotions (no coupon code): best % / fixed discount + free shipping.
    let promoFreeShip = false;
    try {
      const { getPromotions } = await import("@/server/site-config");
      const promos = (await getPromotions()).promos.filter((p) => p.active && subtotal >= (p.minSubtotal || 0));
      let bestPromo = 0;
      for (const p of promos) {
        if (p.action === "free_shipping") promoFreeShip = true;
        else if (p.action === "percent") bestPromo = Math.max(bestPromo, Math.round((subtotal * p.value) / 100));
        else if (p.action === "fixed") bestPromo = Math.max(bestPromo, Math.min(p.value, subtotal));
      }
      if (bestPromo > 0) discount += bestPromo;
    } catch { /* ignore */ }

    discount = Math.min(discount, subtotal);

    // Shipping — resolve the buyer's city to a shipping zone; fall back to flat settings.
    const zones = await db.select().from(schema.shippingZones).where(eq(schema.shippingZones.active, true));
    const cityLc = data.city.trim().toLowerCase();
    const zone = zones.find((z) => (z.cities ?? []).some((c) => c.toLowerCase() === cityLc || cityLc.includes(c.toLowerCase())));
    const afterDiscount = subtotal - discount;
    const baseShipping = zone
      ? afterDiscount >= zone.freeAbove ? 0 : zone.rate
      : afterDiscount >= (settings.freeShippingThreshold ?? 2000) ? 0 : (settings.standardShipping ?? 80);
    // Per-product shipping-class handling surcharges (added even on free shipping).
    let shippingSurcharge = 0;
    const usedClasses = new Set(lines.map((l) => l.shippingClass).filter(Boolean));
    if (usedClasses.size) {
      const { getShippingClasses } = await import("@/server/site-config");
      const scCfg = await getShippingClasses();
      for (const l of lines) {
        const sc = scCfg.classes.find((c) => c.id === l.shippingClass);
        if (sc) shippingSurcharge += sc.fee;
      }
    }
    // All-digital carts never ship — no base fee, no surcharge.
    const shipping = allDigital ? 0 : (promoFreeShip ? 0 : baseShipping) + shippingSurcharge;

    // Tax — the advanced tax engine (classes + region rates) when enabled, else the legacy flat rate.
    const { getTaxConfig } = await import("@/server/site-config");
    const { computeTax } = await import("@/lib/tax");
    const taxCfg = await getTaxConfig();
    const taxAddress = [data.city, data.district, data.postal_code].filter(Boolean).join(" ");
    let tax: number;
    if (groupTaxExempt) {
      tax = 0;
    } else if (taxCfg.enabled) {
      const taxableLines = lines.map((l) => {
        const lineTotal = l.price * l.qty;
        const alloc = subtotal > 0 ? Math.round(discount * (lineTotal / subtotal)) : 0;
        return { taxClass: l.taxClass, amount: lineTotal - alloc };
      });
      tax = computeTax(taxableLines, taxCfg, taxAddress).total;
    } else {
      tax = Math.round((afterDiscount * (settings.taxPercent ?? 0)) / 100);
    }
    // Tax-inclusive pricing already bakes tax into prices, so don't add it again.
    const addTax = !(taxCfg.enabled && taxCfg.pricesIncludeTax);
    const total = Math.max(0, afterDiscount + shipping + (addTax ? tax : 0));

    // Gift card — validate now; the balance is atomically decremented inside the transaction.
    let giftCardCode: string | null = null;
    let giftCardAmount = 0;
    if (data.gift_card_code) {
      const code = data.gift_card_code.trim().toUpperCase().replace(/\s+/g, "");
      const [gc] = await db.select().from(schema.giftCards).where(eq(schema.giftCards.code, code)).limit(1);
      if (gc && gc.active && gc.balance > 0 && (!gc.expiresAt || gc.expiresAt.getTime() > Date.now())) {
        giftCardAmount = Math.min(gc.balance, total);
        giftCardCode = gc.code;
      }
    }
    const payable = Math.max(0, total - giftCardAmount);

    const result = await db.transaction(async (tx) => {
      // Atomically redeem the gift card first (conditional UPDATE guards against double-spend).
      if (giftCardCode && giftCardAmount > 0) {
        const gcUpd = await tx.update(schema.giftCards).set({ balance: sql`${schema.giftCards.balance} - ${giftCardAmount}` }).where(and(eq(schema.giftCards.code, giftCardCode), gte(schema.giftCards.balance, giftCardAmount))).returning({ id: schema.giftCards.id });
        if (gcUpd.length === 0) { giftCardAmount = 0; giftCardCode = null; }
      }
      let orderNumber = genOrderNumber();
      let inserted: { id: string; orderNumber: string } | undefined;
      for (let attempt = 0; attempt < 5 && !inserted; attempt++) {
        try {
          const [row] = await tx
            .insert(schema.orders)
            .values({
              orderNumber,
              userId: user?.id ?? null,
              status: "pending",
              paymentMethod: data.payment_method,
              paymentStatus: "pending",
              subtotal,
              shipping,
              discount,
              tax,
              total,
              couponCode: appliedCoupon,
              giftCardCode,
              giftCardAmount,
              fullName: data.full_name,
              phone: data.phone,
              email: buyerEmail || null,
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

      await tx.insert(schema.orderStatusHistory).values({ orderId: inserted.id, status: "pending", note: "Order placed", actorId: user?.id ?? null });

      // Atomic stock decrement — conditional UPDATE prevents overselling under concurrency.
      // Digital lines are skipped (inventory is the license-key vault, not the stock count).
      for (const l of lines) {
        if (l.isDigital) continue;
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

    // Record the idempotency key -> created order (best-effort).
    if (data.idempotency_key) {
      try { await db.insert(schema.idempotencyKeys).values({ key: data.idempotency_key, orderId: result.id, orderNumber: result.orderNumber }).onConflictDoNothing(); } catch { /* ignore */ }
    }

    // Mark any matching abandoned cart as converted (best-effort).
    try {
      const { and, or, isNull } = await import("drizzle-orm");
      const conds = [] as ReturnType<typeof eq>[];
      if (data.phone) conds.push(eq(schema.abandonedCarts.phone, data.phone.trim()));
      if (buyerEmail) conds.push(eq(schema.abandonedCarts.email, buyerEmail.toLowerCase().trim()));
      if (conds.length) await db.update(schema.abandonedCarts).set({ convertedAt: new Date() }).where(and(isNull(schema.abandonedCarts.convertedAt), conds.length > 1 ? or(...conds) : conds[0]));
    } catch { /* ignore */ }

    // Low-stock admin alert (best-effort; fires only when an item just crossed its threshold).
    try {
      const lowItems: { name: string; stock: number }[] = [];
      for (const l of lines) {
        if (l.isDigital) continue;
        const [p] = await db.select({ stock: schema.products.stock, low: schema.products.lowStockThreshold, name: schema.products.name }).from(schema.products).where(eq(schema.products.id, l.productId)).limit(1);
        if (p && p.low > 0 && p.stock <= p.low && p.stock + l.qty > p.low) lowItems.push({ name: p.name, stock: p.stock });
      }
      if (lowItems.length) { const { notifyLowStock } = await import("@/server/notify"); void notifyLowStock(lowItems); }
    } catch { /* never block the order */ }

    // Payment: gift card can fully cover the order; otherwise COD confirms immediately and
    // online methods initiate a gateway redirect for the remaining `payable` amount.
    let redirect_url = `/order-confirmed?id=${result.orderNumber}`;
    if (payable <= 0) {
      const { sendOrderConfirmation, sendOrderConfirmationEmail, sendOrderConfirmationWhatsApp } = await import("@/server/notify");
      void sendOrderConfirmation(data.phone, result.orderNumber, total, false);
      void sendOrderConfirmationEmail(buyerEmail, { orderNumber: result.orderNumber, total, items: lines.map((l) => ({ name: l.name, qty: l.qty })) }, true);
      void sendOrderConfirmationWhatsApp(data.phone, result.orderNumber, total, true);
      await db.update(schema.orders).set({ paymentStatus: "paid" }).where(eq(schema.orders.id, result.id));
      await db.insert(schema.payments).values({ orderId: result.id, orderNumber: result.orderNumber, provider: "giftcard", amount: giftCardAmount, status: "paid" });
    } else if (data.payment_method === "cod") {
      const { sendOrderConfirmation, sendOrderConfirmationEmail, sendOrderConfirmationWhatsApp } = await import("@/server/notify");
      void sendOrderConfirmation(data.phone, result.orderNumber, total, false);
      void sendOrderConfirmationEmail(buyerEmail, { orderNumber: result.orderNumber, total, items: lines.map((l) => ({ name: l.name, qty: l.qty })) }, false);
      void sendOrderConfirmationWhatsApp(data.phone, result.orderNumber, total, false);
      await db.insert(schema.payments).values({ orderId: result.id, orderNumber: result.orderNumber, provider: "cod", amount: payable, status: "initiated" });
    } else {
      const { initiatePayment } = await import("@/server/payments");
      const { getRequest } = await import("@tanstack/react-start/server");
      let origin = process.env.APP_URL ?? "";
      if (!origin) { try { origin = new URL(getRequest()!.url).origin; } catch { origin = ""; } }
      try {
        const init = await initiatePayment(data.payment_method, { id: result.id, orderNumber: result.orderNumber, total: payable, fullName: data.full_name, phone: data.phone, email: buyerEmail, city: data.city, address: data.address_line1 }, origin);
        await db.insert(schema.payments).values({ orderId: result.id, orderNumber: result.orderNumber, provider: init.provider, amount: payable, status: "initiated", transactionId: init.transactionId ?? null, sessionKey: init.sessionKey ?? null });
        redirect_url = init.redirectUrl;
      } catch (e) {
        console.error("[payment init]", e);
        redirect_url = `/order-confirmed?id=${result.orderNumber}&payment=error`;
      }
    }

    if (user) await audit(user, "order.create", "order", result.id, { orderNumber: result.orderNumber, total });
    try { const { emit } = await import("@/server/events"); void emit("order.created", { orderId: result.id, orderNumber: result.orderNumber, total }); } catch { /* ignore */ }
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

// Printable invoice for a single order (owner or staff only).
export const getInvoice = createServerFn({ method: "GET" })
  .inputValidator((i: unknown) => z.object({ order_number: z.string().trim().min(1).max(40) }).parse(i))
  .handler(async ({ data }) => {
    const { getSessionUser } = await import("@/server/auth/session");
    const { db } = await import("@/server/db");
    const schema = await import("@/server/db/schema");
    const { eq } = await import("drizzle-orm");
    const user = await getSessionUser();
    if (!user) throw new Error("Please sign in to view this invoice.");
    const [o] = await db.select().from(schema.orders).where(eq(schema.orders.orderNumber, data.order_number)).limit(1);
    if (!o) throw new Error("Order not found.");
    const isStaff = ["staff", "manager", "admin"].includes(user.role);
    if (!isStaff && o.userId !== user.id) throw new Error("You are not allowed to view this invoice.");
    // Store details for the invoice header.
    const { getSettingsValue } = await import("@/server/settings");
    const { getBrandingConfig } = await import("@/server/site-config");
    const s = await getSettingsValue().catch(() => null);
    const b = await getBrandingConfig().catch(() => null);
    const store = {
      name: b?.storeName || s?.storeName || "Banglarfish",
      logo: b?.logoLight || "",
      email: s?.storeEmail || "",
      phone: s?.storePhone || "",
      address: s?.address || "",
    };
    return {
      store,
      order_number: o.orderNumber,
      created_at: o.createdAt.toISOString(),
      full_name: o.fullName, phone: o.phone, email: o.email,
      address_line1: o.addressLine1, address_line2: o.addressLine2, city: o.city, district: o.district, postal_code: o.postalCode,
      payment_method: o.paymentMethod, payment_status: o.paymentStatus, status: o.status,
      items: (o.items ?? []) as { name: string; weight: string; qty: number; price: number }[],
      subtotal: o.subtotal, shipping: o.shipping, discount: o.discount, tax: o.tax, total: o.total,
    };
  });
