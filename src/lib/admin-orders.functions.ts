import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const orderStatus = z.enum(["pending", "confirmed", "processing", "packed", "shipped", "delivered", "cancelled", "refunded"]);
const paymentStatus = z.enum(["pending", "paid", "failed", "refunded"]);

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
    await db.insert(orderStatusHistory).values({ orderId: data.id, status: data.status, note: data.payment_status ? `Payment: ${data.payment_status}` : null, actorId: user.id });
    // Notify the customer by SMS when the order status actually changes.
    if (before && before.status !== data.status && before.phone) {
      const { sendStatusUpdate } = await import("@/server/notify");
      void sendStatusUpdate(before.phone, before.orderNumber, data.status);
    }
    await audit(user, "order.update", "order", data.id, { status: data.status, payment_status: data.payment_status });
    return { ok: true };
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
