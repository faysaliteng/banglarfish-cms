import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const orderStatus = z.enum(["pending", "confirmed", "processing", "packed", "shipped", "delivered", "cancelled", "refunded"]);
const paymentStatus = z.enum(["pending", "paid", "failed", "refunded"]);

function genOrderNumber(): string {
  const d = new Date();
  const ymd = `${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  return `BF-${ymd}-${String(Math.floor(1000 + Math.random() * 9000))}`;
}

// Staff-created (offline / phone / WhatsApp) order. Picks products, snapshots the
// customer, optionally creates a customer account, and notifies by SMS + email.
const ManualOrderInput = z.object({
  customer: z.object({
    full_name: z.string().trim().min(1).max(120),
    phone: z.string().trim().min(6).max(20),
    email: z.string().trim().email().max(255).optional().or(z.literal("")),
    address_line1: z.string().trim().max(300).default(""),
    address_line2: z.string().trim().max(300).optional().or(z.literal("")),
    city: z.string().trim().max(120).default(""),
    district: z.string().trim().max(120).optional().or(z.literal("")),
    postal_code: z.string().trim().max(20).optional().or(z.literal("")),
  }),
  items: z.array(z.object({ productId: z.string().uuid(), variantId: z.string().uuid().nullable().optional(), qty: z.number().int().positive().max(999) })).min(1),
  payment_method: z.enum(["cod", "bkash", "nagad", "card"]).default("cod"),
  payment_status: z.enum(["pending", "paid"]).default("pending"),
  status: orderStatus.default("confirmed"),
  shipping: z.number().int().nonnegative().default(0),
  discount: z.number().int().nonnegative().default(0),
  notes: z.string().trim().max(1000).optional().or(z.literal("")),
  create_account: z.boolean().default(false),
  notify_sms: z.boolean().default(true),
  notify_email: z.boolean().default(true),
});

export const adminCreateManualOrder = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => ManualOrderInput.parse(i))
  .handler(async ({ data }): Promise<{ id: string; order_number: string; account_created: boolean; sms: boolean; email: boolean }> => {
    const { requireStaff } = await import("@/server/auth/context");
    const { db } = await import("@/server/db");
    const schema = await import("@/server/db/schema");
    const { hashPassword } = await import("@/server/auth/password");
    const { audit } = await import("@/server/audit");
    const { eq, and, inArray, gte, sql } = await import("drizzle-orm");
    const { randomBytes } = await import("node:crypto");
    const actor = await requireStaff();

    // Authoritative product/variant lookup (never trust client prices).
    const productIds = [...new Set(data.items.map((i) => i.productId))];
    const products = await db.select().from(schema.products).where(inArray(schema.products.id, productIds));
    const productById = new Map(products.map((p) => [p.id, p]));
    const variantIds = data.items.map((i) => i.variantId).filter((v): v is string => !!v);
    const variants = variantIds.length ? await db.select().from(schema.productVariants).where(inArray(schema.productVariants.id, variantIds)) : [];
    const variantById = new Map(variants.map((v) => [v.id, v]));

    type Line = { productId: string; variantId: string | null; name: string; image: string; weight: string; price: number; qty: number; isDigital: boolean };
    const lines: Line[] = [];
    for (const item of data.items) {
      const p = productById.get(item.productId);
      if (!p) throw new Error("A selected product no longer exists.");
      let price = p.price, weight = p.weightOptions?.[0] ?? "", variantId: string | null = null;
      const isDigital = !!(p as { isDigital?: boolean }).isDigital;
      if (item.variantId) {
        const v = variantById.get(item.variantId);
        if (!v || v.productId !== p.id) throw new Error("Invalid product option selected.");
        price = v.price; weight = v.label; variantId = v.id;
      }
      lines.push({ productId: p.id, variantId, name: p.name, image: p.image, weight, price, qty: item.qty, isDigital });
    }

    const subtotal = lines.reduce((s, l) => s + l.price * l.qty, 0);
    const discount = Math.min(data.discount, subtotal);
    const total = Math.max(0, subtotal - discount + data.shipping);

    // Find-or-create the customer account.
    const email = (data.customer.email || "").toLowerCase().trim();
    const phone = data.customer.phone.trim();
    let userId: string | null = null;
    let accountCreated = false;
    if (email) {
      const [byEmail] = await db.select({ id: schema.users.id }).from(schema.users).where(eq(schema.users.email, email)).limit(1);
      if (byEmail) userId = byEmail.id;
      else if (data.create_account) {
        const pwHash = await hashPassword(randomBytes(18).toString("hex"));
        const [u] = await db.insert(schema.users).values({
          email, phone, passwordHash: pwHash, fullName: data.customer.full_name, role: "customer",
        }).returning({ id: schema.users.id });
        userId = u.id; accountCreated = true;
        // Default address lives in the addresses table.
        try {
          await db.insert(schema.addresses).values({
            userId: u.id, label: "Home", fullName: data.customer.full_name, phone,
            addressLine1: data.customer.address_line1 || "", addressLine2: data.customer.address_line2 || null,
            city: data.customer.city || "", district: data.customer.district || null, postalCode: data.customer.postal_code || null,
            isDefault: true,
          });
        } catch { /* address is optional */ }
      }
    } else if (phone) {
      const [byPhone] = await db.select({ id: schema.users.id }).from(schema.users).where(eq(schema.users.phone, phone)).limit(1);
      if (byPhone) userId = byPhone.id;
    }

    // Insert order (retry on order-number collision).
    let orderNumber = genOrderNumber();
    let inserted: { id: string; orderNumber: string } | undefined;
    for (let attempt = 0; attempt < 5 && !inserted; attempt++) {
      try {
        const [row] = await db.insert(schema.orders).values({
          orderNumber, userId, status: data.status, paymentMethod: data.payment_method, paymentStatus: data.payment_status,
          subtotal, shipping: data.shipping, discount, tax: 0, total,
          couponCode: null, giftCardCode: null, giftCardAmount: 0,
          fullName: data.customer.full_name, phone, email: email || null,
          addressLine1: data.customer.address_line1 || "", addressLine2: data.customer.address_line2 || null,
          city: data.customer.city || "", district: data.customer.district || null, postalCode: data.customer.postal_code || null,
          notes: data.notes || null, items: lines,
        }).returning({ id: schema.orders.id, orderNumber: schema.orders.orderNumber });
        inserted = row;
      } catch { orderNumber = genOrderNumber(); }
    }
    if (!inserted) throw new Error("Could not create the order. Please try again.");

    await db.insert(schema.orderStatusHistory).values({ orderId: inserted.id, status: data.status, note: `Manual order by ${actor.email}`, actorId: actor.id });

    // Decrement stock for physical lines (best-effort; won't block a phone order).
    for (const l of lines) {
      if (l.isDigital) continue;
      try {
        await db.update(schema.products).set({ stock: sql`GREATEST(${schema.products.stock} - ${l.qty}, 0)` }).where(eq(schema.products.id, l.productId));
        if (l.variantId) await db.update(schema.productVariants).set({ stock: sql`GREATEST(${schema.productVariants.stock} - ${l.qty}, 0)` }).where(eq(schema.productVariants.id, l.variantId));
        await db.insert(schema.inventoryLedger).values({ productId: l.productId, variantId: l.variantId, delta: -l.qty, reason: "sale", note: inserted.orderNumber, actorId: actor.id });
      } catch { /* stock is advisory for manual orders */ }
    }
    void and; void gte;

    // If marked paid, fire order.paid (digital fulfilment + webhooks/plugins).
    if (data.payment_status === "paid") {
      try { const { emit } = await import("@/server/events"); void emit("order.paid", { orderId: inserted.id, orderNumber: inserted.orderNumber, total, provider: data.payment_method }); } catch { /* ignore */ }
    }

    // Notify the customer (best-effort).
    const paid = data.payment_status === "paid";
    let smsOk = false, emailOk = false;
    if (data.notify_sms && phone) {
      try { const { sendOrderConfirmation } = await import("@/server/notify"); smsOk = await sendOrderConfirmation(phone, inserted.orderNumber, total, paid); } catch { /* ignore */ }
    }
    if (data.notify_email && email) {
      try { const { sendOrderConfirmationEmail } = await import("@/server/notify"); emailOk = await sendOrderConfirmationEmail(email, { orderNumber: inserted.orderNumber, total, items: lines.map((l) => ({ name: l.name, qty: l.qty })) }, paid); } catch { /* ignore */ }
    }
    if (data.notify_sms && phone) {
      try { const { sendOrderConfirmationWhatsApp } = await import("@/server/notify"); void sendOrderConfirmationWhatsApp(phone, inserted.orderNumber, total, paid); } catch { /* ignore */ }
    }

    await audit(actor, "order.manual_create", "order", inserted.id, { total, items: lines.length, account_created: accountCreated });
    return { id: inserted.id, order_number: inserted.orderNumber, account_created: accountCreated, sms: smsOk, email: emailOk };
  });

export const adminListOrders = createServerFn({ method: "GET" }).handler(async () => {
  const { requireStaff } = await import("@/server/auth/context");
  const { db } = await import("@/server/db");
  const { orders } = await import("@/server/db/schema");
  const { desc } = await import("drizzle-orm");
  await requireStaff();
  const rows = await db.select().from(orders).orderBy(desc(orders.createdAt));
  return rows.map((o) => ({
    id: o.id,
    order_number: o.orderNumber,
    full_name: o.fullName,
    phone: o.phone,
    address_line1: o.addressLine1,
    address_line2: o.addressLine2,
    city: o.city,
    district: o.district,
    postal_code: o.postalCode,
    notes: o.notes,
    payment_method: o.paymentMethod,
    payment_status: o.paymentStatus,
    status: o.status,
    items: o.items,
    subtotal: o.subtotal,
    shipping: o.shipping,
    discount: o.discount,
    total: o.total,
    coupon_code: o.couponCode,
    created_at: o.createdAt.toISOString(),
  }));
});

export const adminUpdateOrderStatus = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid(), status: orderStatus, payment_status: paymentStatus.optional() }).parse(i))
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const { requireStaff } = await import("@/server/auth/context");
    const { db } = await import("@/server/db");
    const { orders, orderStatusHistory } = await import("@/server/db/schema");
    const { audit } = await import("@/server/audit");
    const { eq } = await import("drizzle-orm");
    const user = await requireStaff();

    const [before] = await db.select().from(orders).where(eq(orders.id, data.id)).limit(1);
    const update: Record<string, unknown> = { status: data.status, updatedAt: new Date() };
    if (data.payment_status) update.paymentStatus = data.payment_status;
    await db.update(orders).set(update).where(eq(orders.id, data.id));

    // Cancelling / refunding returns the reserved units to stock. Guarded on the
    // PREVIOUS status so re-saving a cancelled order never double-restocks.
    const RESTOCK = new Set(["cancelled", "refunded"]);
    if (before && RESTOCK.has(data.status) && !RESTOCK.has(before.status)) {
      try {
        const schema = await import("@/server/db/schema");
        const { sql } = await import("drizzle-orm");
        for (const it of (before.items ?? []) as { productId: string; variantId?: string | null; qty: number }[]) {
          if (!it.productId || !it.qty) continue;
          await db.update(schema.products).set({ stock: sql`${schema.products.stock} + ${it.qty}` }).where(eq(schema.products.id, it.productId));
          if (it.variantId) {
            await db.update(schema.productVariants).set({ stock: sql`${schema.productVariants.stock} + ${it.qty}` }).where(eq(schema.productVariants.id, it.variantId));
          }
          await db.insert(schema.inventoryLedger).values({ productId: it.productId, variantId: it.variantId ?? null, delta: it.qty, reason: data.status === "refunded" ? "refund" : "cancel", note: before.orderNumber, actorId: user.id });
        }
      } catch (e) {
        console.error("[orders] stock restore failed", e);
      }
    }
    await db.insert(orderStatusHistory).values({ orderId: data.id, status: data.status, note: data.payment_status ? `Payment: ${data.payment_status}` : null, actorId: user.id });
    // Notify the customer when the status changes — only for statuses enabled in
    // the per-status notification settings.
    if (before && before.status !== data.status && before.phone) {
      const { getOrderNotifyConfig } = await import("@/server/site-config");
      const notify = await getOrderNotifyConfig();
      if (notify[data.status as keyof typeof notify]) {
        const { sendStatusUpdate, sendStatusEmail, sendStatusWhatsApp } = await import("@/server/notify");
        void sendStatusUpdate(before.phone, before.orderNumber, data.status);
        void sendStatusEmail(before.email, before.orderNumber, data.status);
        void sendStatusWhatsApp(before.phone, before.orderNumber, data.status);
      }
    }
    // Marking an order paid triggers digital fulfillment + webhooks/plugins.
    if (data.payment_status === "paid" && before && before.paymentStatus !== "paid") {
      try { const { emit } = await import("@/server/events"); void emit("order.paid", { orderId: data.id, orderNumber: before.orderNumber, total: before.total, provider: before.paymentMethod }); } catch { /* ignore */ }
    }
    await audit(user, "order.update", "order", data.id, { status: data.status, payment_status: data.payment_status });
    return { ok: true };
  });

// Refund an order: restore stock (optional), record a refund payment + history,
// set status, and attempt a gateway refund (best-effort). Partial via `amount`.
export const adminRefundOrder = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid(), amount: z.number().int().nonnegative().optional(), restock: z.boolean().default(true) }).parse(i))
  .handler(async ({ data }): Promise<{ ok: true; amount: number; partial: boolean }> => {
    const { requireManager } = await import("@/server/auth/context");
    const { db } = await import("@/server/db");
    const { orders, orderStatusHistory, payments, products, productVariants, inventoryLedger } = await import("@/server/db/schema");
    const { audit } = await import("@/server/audit");
    const { eq, sql } = await import("drizzle-orm");
    const actor = await requireManager();

    const [o] = await db.select().from(orders).where(eq(orders.id, data.id)).limit(1);
    if (!o) throw new Error("Order not found");
    if (o.paymentStatus === "refunded") throw new Error("Order is already refunded");
    const amount = data.amount && data.amount > 0 ? Math.min(data.amount, o.total) : o.total;
    const partial = amount < o.total;

    if (data.restock) {
      for (const it of (o.items ?? []) as { productId: string; variantId: string | null; qty: number }[]) {
        if (it.productId) await db.update(products).set({ stock: sql`${products.stock} + ${it.qty}` }).where(eq(products.id, it.productId));
        if (it.variantId) await db.update(productVariants).set({ stock: sql`${productVariants.stock} + ${it.qty}` }).where(eq(productVariants.id, it.variantId));
        await db.insert(inventoryLedger).values({ productId: it.productId, variantId: it.variantId, delta: it.qty, reason: "cancel", note: `refund ${o.orderNumber}`, actorId: actor.id });
      }
    }
    await db.update(orders).set({ paymentStatus: "refunded", status: "refunded", updatedAt: new Date() }).where(eq(orders.id, o.id));
    await db.insert(payments).values({ orderId: o.id, orderNumber: o.orderNumber, provider: o.paymentMethod, amount, status: "refunded" });
    await db.insert(orderStatusHistory).values({ orderId: o.id, status: "refunded", note: `Refunded ৳${amount}${partial ? " (partial)" : ""}${data.restock ? " · stock restored" : ""}`, actorId: actor.id });
    await audit(actor, "order.refund", "order", o.id, { amount, partial });
    // Best-effort gateway refund (real money movement where the adapter supports it).
    try { const { refundPayment } = await import("@/server/payments"); await refundPayment(o.paymentMethod, { orderNumber: o.orderNumber, transactionId: o.transactionId }, amount); } catch (e) { console.error("[refund] gateway", e); }
    return { ok: true, amount, partial };
  });

export const adminOrderHistory = createServerFn({ method: "GET" })
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data }) => {
    const { requireStaff } = await import("@/server/auth/context");
    const { db } = await import("@/server/db");
    const { orderStatusHistory } = await import("@/server/db/schema");
    const { eq, asc } = await import("drizzle-orm");
    await requireStaff();
    const rows = await db.select().from(orderStatusHistory).where(eq(orderStatusHistory.orderId, data.id)).orderBy(asc(orderStatusHistory.createdAt));
    return rows.map((h) => ({ id: h.id, status: h.status, note: h.note, created_at: h.createdAt.toISOString() }));
  });
