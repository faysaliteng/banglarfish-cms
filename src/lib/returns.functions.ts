import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type ReturnRow = {
  id: string; orderId: string; orderNumber: string; userId: string | null;
  reason: string; items: { name: string; qty: number }[]; status: string; adminNote: string | null; createdAt: string;
};

/* ---------- Customer ---------- */
export const submitReturn = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => z.object({ orderId: z.string().uuid(), reason: z.string().trim().min(5).max(2000) }).parse(i))
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const { requireUser } = await import("@/server/auth/context");
    const { db } = await import("@/server/db");
    const { orders, returnRequests } = await import("@/server/db/schema");
    const { and, eq } = await import("drizzle-orm");
    const user = await requireUser();
    const [order] = await db.select().from(orders).where(and(eq(orders.id, data.orderId), eq(orders.userId, user.id))).limit(1);
    if (!order) throw new Error("Order not found");
    const [existing] = await db.select({ id: returnRequests.id }).from(returnRequests).where(and(eq(returnRequests.orderId, order.id), eq(returnRequests.userId, user.id))).limit(1);
    if (existing) throw new Error("A return request already exists for this order.");
    await db.insert(returnRequests).values({
      orderId: order.id, orderNumber: order.orderNumber, userId: user.id, reason: data.reason,
      items: (order.items ?? []).map((it) => ({ name: it.name, qty: it.qty })), status: "requested",
    });
    return { ok: true };
  });

export const listMyReturns = createServerFn({ method: "GET" }).handler(async (): Promise<ReturnRow[]> => {
  const { requireUser } = await import("@/server/auth/context");
  const { db } = await import("@/server/db");
  const { returnRequests } = await import("@/server/db/schema");
  const { desc, eq } = await import("drizzle-orm");
  const user = await requireUser();
  const rows = await db.select().from(returnRequests).where(eq(returnRequests.userId, user.id)).orderBy(desc(returnRequests.createdAt));
  return rows.map(mapRow);
});

/* ---------- Admin ---------- */
export const adminListReturns = createServerFn({ method: "GET" }).handler(async (): Promise<ReturnRow[]> => {
  const { requireStaff } = await import("@/server/auth/context");
  const { db } = await import("@/server/db");
  const { returnRequests } = await import("@/server/db/schema");
  const { desc } = await import("drizzle-orm");
  await requireStaff();
  const rows = await db.select().from(returnRequests).orderBy(desc(returnRequests.createdAt));
  return rows.map(mapRow);
});

export const adminUpdateReturn = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid(), status: z.enum(["requested", "approved", "rejected", "refunded"]), adminNote: z.string().max(2000).optional() }).parse(i))
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const { requireStaff } = await import("@/server/auth/context");
    const { db } = await import("@/server/db");
    const { returnRequests } = await import("@/server/db/schema");
    const { eq } = await import("drizzle-orm");
    const { audit } = await import("@/server/audit");
    const actor = await requireStaff();
    await db.update(returnRequests).set({ status: data.status, adminNote: data.adminNote ?? null, updatedAt: new Date() }).where(eq(returnRequests.id, data.id));
    await audit(actor, "return.update", "return", data.id, { status: data.status });
    return { ok: true };
  });

function mapRow(r: {
  id: string; orderId: string; orderNumber: string; userId: string | null; reason: string;
  items: { name: string; qty: number }[]; status: string; adminNote: string | null; createdAt: Date;
}): ReturnRow {
  return { id: r.id, orderId: r.orderId, orderNumber: r.orderNumber, userId: r.userId, reason: r.reason, items: r.items ?? [], status: r.status, adminNote: r.adminNote, createdAt: r.createdAt.toISOString() };
}
