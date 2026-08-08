// Tamper-evident hashing for the audit log. Each entry's hash chains from the
// previous entry's hash, so altering or deleting any past entry breaks the chain.
import { createHash } from "node:crypto";

export const AUDIT_GENESIS = "GENESIS";

// Deterministic JSON: object keys sorted recursively, so a value read back from
// jsonb (which does not preserve key order) hashes identically to insert time.
export function stableStringify(v: unknown): string {
  if (v === null || typeof v !== "object") return JSON.stringify(v) ?? "null";
  if (Array.isArray(v)) return "[" + v.map(stableStringify).join(",") + "]";
  const obj = v as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return "{" + keys.map((k) => JSON.stringify(k) + ":" + stableStringify(obj[k])).join(",") + "}";
}

export type ChainFields = {
  actorId: string | null;
  actorEmail: string | null;
  action: string;
  entity: string;
  entityId: string | null;
  meta: Record<string, unknown> | null;
  createdAt: string; // ISO string (millisecond precision)
};

export function chainHash(prevHash: string, f: ChainFields): string {
  const canonical = stableStringify({
    actorId: f.actorId,
    actorEmail: f.actorEmail,
    action: f.action,
    entity: f.entity,
    entityId: f.entityId,
    meta: f.meta ?? null,
    createdAt: f.createdAt,
  });
  return createHash("sha256").update(prevHash + "\n" + canonical).digest("hex");
}
