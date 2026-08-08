// Tamper-evident admin action audit trail. Each entry is hash-chained from the
// previous one; a per-chain advisory lock serializes inserts so the chain stays
// linear under concurrency.
import { db } from "@/server/db";
import { auditLog } from "@/server/db/schema";
import { sql, desc, asc } from "drizzle-orm";
import type { SessionUser } from "@/server/auth/context";
import { chainHash, AUDIT_GENESIS } from "@/server/audit-chain";

const AUDIT_LOCK_KEY = 748920131; // arbitrary constant advisory-lock key

export async function audit(
  actor: SessionUser | null,
  action: string,
  entity: string,
  entityId?: string | null,
  meta?: Record<string, unknown>,
): Promise<void> {
  try {
    await db.transaction(async (tx) => {
      // Serialize audit inserts so prevHash reads the true immediate predecessor.
      await tx.execute(sql`SELECT pg_advisory_xact_lock(${AUDIT_LOCK_KEY})`);
      const [prev] = await tx.select({ hash: auditLog.hash }).from(auditLog).orderBy(desc(auditLog.seq)).limit(1);
      const prevHash = prev?.hash ?? AUDIT_GENESIS;
      const createdAt = new Date();
      const hash = chainHash(prevHash, {
        actorId: actor?.id ?? null,
        actorEmail: actor?.email ?? null,
        action,
        entity,
        entityId: entityId ?? null,
        meta: meta ?? null,
        createdAt: createdAt.toISOString(),
      });
      await tx.insert(auditLog).values({
        actorId: actor?.id ?? null,
        actorEmail: actor?.email ?? null,
        action,
        entity,
        entityId: entityId ?? null,
        meta: meta ?? null,
        prevHash,
        hash,
        createdAt,
      });
    });
  } catch (e) {
    console.error("[audit] failed:", e);
  }
}

export type AuditVerifyResult = {
  ok: boolean;
  checked: number;
  brokenSeq?: number;
  reason?: string;
};

// Walk the chained entries (those with a hash) in order, recompute each hash, and
// confirm the links. Returns the first break, if any.
export async function verifyAuditChain(): Promise<AuditVerifyResult> {
  const rows = await db.select().from(auditLog).orderBy(asc(auditLog.seq));
  let prevHash = AUDIT_GENESIS;
  let checked = 0;
  for (const r of rows) {
    if (!r.hash) continue; // pre-chain legacy rows are not part of the chain
    if ((r.prevHash ?? AUDIT_GENESIS) !== prevHash) {
      return { ok: false, checked, brokenSeq: r.seq, reason: "prev-hash link mismatch (an earlier entry was altered or removed)" };
    }
    const expected = chainHash(prevHash, {
      actorId: r.actorId,
      actorEmail: r.actorEmail,
      action: r.action,
      entity: r.entity,
      entityId: r.entityId,
      meta: r.meta,
      createdAt: r.createdAt.toISOString(),
    });
    if (r.hash !== expected) {
      return { ok: false, checked, brokenSeq: r.seq, reason: "content hash mismatch (this entry was modified)" };
    }
    prevHash = r.hash;
    checked++;
  }
  return { ok: true, checked };
}
