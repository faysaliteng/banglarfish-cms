// Best-effort admin action audit trail.
import { db } from "@/server/db";
import { auditLog } from "@/server/db/schema";
import type { SessionUser } from "@/server/auth/context";

export async function audit(
  actor: SessionUser | null,
  action: string,
  entity: string,
  entityId?: string | null,
  meta?: Record<string, unknown>,
): Promise<void> {
  try {
    await db.insert(auditLog).values({
      actorId: actor?.id ?? null,
      actorEmail: actor?.email ?? null,
      action,
      entity,
      entityId: entityId ?? null,
      meta: meta ?? null,
    });
  } catch (e) {
    console.error("[audit] failed:", e);
  }
}
