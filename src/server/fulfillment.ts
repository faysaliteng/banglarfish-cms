// Digital-goods fulfillment: on payment, assign available license keys to the
// order for each digital line item. Idempotent (skips items already fulfilled).
import { db } from "./db";
import { products, licenseKeys, orders } from "./db/schema";
import { and, eq, sql } from "drizzle-orm";

export async function assignKeysForOrder(orderId: string): Promise<void> {
  try {
    const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
    if (!order) return;
    const items = (order.items ?? []) as { productId: string; qty: number }[];
    for (const it of items) {
      if (!it.productId) continue;
      const [p] = await db.select({ isDigital: products.isDigital }).from(products).where(eq(products.id, it.productId)).limit(1);
      if (!p?.isDigital) continue;
      // Already fulfilled for this product+order? skip.
      const [existing] = await db.select({ id: licenseKeys.id }).from(licenseKeys).where(and(eq(licenseKeys.orderId, orderId), eq(licenseKeys.productId, it.productId))).limit(1);
      if (existing) continue;
      // Claim up to `qty` unassigned keys atomically.
      await db.execute(sql`
        UPDATE license_keys SET order_id = ${orderId}, order_number = ${order.orderNumber}, assigned_at = now()
        WHERE id IN (
          SELECT id FROM license_keys WHERE product_id = ${it.productId} AND order_id IS NULL
          ORDER BY created_at ASC LIMIT ${it.qty} FOR UPDATE SKIP LOCKED
        )`);
    }
  } catch (e) {
    console.error("[fulfillment] assignKeysForOrder failed", e);
  }
}

// Wire order.paid -> fulfillment (idempotent). Called once at boot.
const g = globalThis as unknown as { __bfFulfillWired?: boolean };
export async function wireFulfillment(): Promise<void> {
  if (g.__bfFulfillWired) return;
  g.__bfFulfillWired = true;
  const { on } = await import("./events");
  on("order.paid", async (p) => { await assignKeysForOrder((p as { orderId: string }).orderId); });
}
