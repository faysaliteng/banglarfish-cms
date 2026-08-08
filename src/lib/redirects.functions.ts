import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type RedirectRow = { id: string; fromPath: string; toPath: string; code: number; active: boolean; hits: number };

const norm = (p: string) => {
  let s = (p || "").trim();
  if (s.startsWith("http")) return s;
  if (!s.startsWith("/")) s = "/" + s;
  return s.replace(/\/+$/, "") || "/";
};

export const adminListRedirects = createServerFn({ method: "GET" }).handler(async (): Promise<RedirectRow[]> => {
  const { requireStaff } = await import("@/server/auth/context");
  const { db } = await import("@/server/db");
  const { redirects } = await import("@/server/db/schema");
  const { desc } = await import("drizzle-orm");
  await requireStaff();
  const rows = await db.select().from(redirects).orderBy(desc(redirects.createdAt));
  return rows.map((r) => ({ id: r.id, fromPath: r.fromPath, toPath: r.toPath, code: r.code, active: r.active, hits: r.hits }));
});

const redirectCode = z.union([z.literal(301), z.literal(302), z.literal(410)]);

export const adminUpsertRedirect = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) =>
    z.object({ id: z.string().uuid().optional(), fromPath: z.string().trim().min(1).max(400), toPath: z.string().trim().max(600).default(""), code: redirectCode.default(301), active: z.boolean().default(true) }).parse(i),
  )
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const { requireManager } = await import("@/server/auth/context");
    const { db } = await import("@/server/db");
    const { redirects } = await import("@/server/db/schema");
    const { eq } = await import("drizzle-orm");
    const { audit } = await import("@/server/audit");
    const actor = await requireManager();
    const fromPath = norm(data.fromPath);
    // 410 (Gone) has no destination; store the from-path as a placeholder.
    const toPath = data.code === 410 ? fromPath : norm(data.toPath);
    if (data.code !== 410 && !data.toPath.trim()) throw new Error("A destination is required for 301/302 redirects.");
    if (data.code !== 410 && fromPath === toPath) throw new Error("From and To cannot be the same.");
    if (data.id) {
      await db.update(redirects).set({ fromPath, toPath, code: data.code, active: data.active }).where(eq(redirects.id, data.id));
    } else {
      await db.insert(redirects).values({ fromPath, toPath, code: data.code, active: data.active })
        .onConflictDoUpdate({ target: redirects.fromPath, set: { toPath, code: data.code, active: data.active } });
    }
    await audit(actor, "redirect.save", "redirect", fromPath, { toPath, code: data.code });
    return { ok: true };
  });

// Export all redirects as CSV (from,to,code,active).
export const adminExportRedirectsCsv = createServerFn({ method: "GET" }).handler(async (): Promise<string> => {
  const { requireStaff } = await import("@/server/auth/context");
  const { db } = await import("@/server/db");
  const { redirects } = await import("@/server/db/schema");
  const { desc } = await import("drizzle-orm");
  await requireStaff();
  const rows = await db.select().from(redirects).orderBy(desc(redirects.createdAt));
  const esc = (s: string) => (/[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);
  const lines = ["from,to,code,active", ...rows.map((r) => [r.fromPath, r.toPath, String(r.code), r.active ? "1" : "0"].map(esc).join(","))];
  return lines.join("\n");
});

// Bulk import redirects from CSV. Header optional; columns: from,to,code,active.
export const adminImportRedirectsCsv = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => z.object({ csv: z.string().max(2_000_000) }).parse(i))
  .handler(async ({ data }): Promise<{ imported: number; errors: number }> => {
    const { requireManager } = await import("@/server/auth/context");
    const { db } = await import("@/server/db");
    const { redirects } = await import("@/server/db/schema");
    const { audit } = await import("@/server/audit");
    const actor = await requireManager();
    const rows = data.csv.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    let imported = 0, errors = 0;
    for (const line of rows) {
      // Skip a header row if present.
      if (/^\s*from\s*,\s*to\s*,/i.test(line)) continue;
      const cells = line.match(/(".*?"|[^,]+)(?=\s*,|\s*$)/g)?.map((c) => c.replace(/^"|"$/g, "").replace(/""/g, '"').trim()) ?? [];
      const [fromRaw, toRaw, codeRaw, activeRaw] = cells;
      if (!fromRaw) { errors++; continue; }
      const code = codeRaw === "302" ? 302 : codeRaw === "410" ? 410 : 301;
      const fromPath = norm(fromRaw);
      const toPath = code === 410 ? fromPath : norm(toRaw || "");
      if (code !== 410 && (!toRaw || fromPath === toPath)) { errors++; continue; }
      const active = activeRaw === undefined ? true : !["0", "false", "no", "off"].includes(activeRaw.toLowerCase());
      try {
        await db.insert(redirects).values({ fromPath, toPath, code, active })
          .onConflictDoUpdate({ target: redirects.fromPath, set: { toPath, code, active } });
        imported++;
      } catch { errors++; }
    }
    await audit(actor, "redirect.import", "redirect", null, { imported, errors });
    return { imported, errors };
  });

export const adminDeleteRedirect = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const { requireManager } = await import("@/server/auth/context");
    const { db } = await import("@/server/db");
    const { redirects } = await import("@/server/db/schema");
    const { eq } = await import("drizzle-orm");
    await requireManager();
    await db.delete(redirects).where(eq(redirects.id, data.id));
    return { ok: true };
  });

/* ---------- 404 monitor ---------- */
export type NotFoundRow = { id: string; path: string; hits: number; referrer: string | null; lastSeen: string };

// Public: log a 404 (best-effort, deduped by path). Called from the not-found page.
export const recordNotFound = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => z.object({ path: z.string().trim().min(1).max(400), referrer: z.string().max(400).optional().nullable() }).parse(i))
  .handler(async ({ data }): Promise<{ ok: true }> => {
    try {
      const { db } = await import("@/server/db");
      const { notFoundLog } = await import("@/server/db/schema");
      const { sql } = await import("drizzle-orm");
      const p = norm(data.path);
      if (p.startsWith("/admin") || p.startsWith("/api/") || p.startsWith("/_serverFn") || p.includes(".")) return { ok: true };
      await db.insert(notFoundLog).values({ path: p, referrer: data.referrer ?? null })
        .onConflictDoUpdate({ target: notFoundLog.path, set: { hits: sql`${notFoundLog.hits} + 1`, lastSeen: new Date(), referrer: data.referrer ?? null } });
    } catch {
      /* best-effort */
    }
    return { ok: true };
  });

export const adminListNotFound = createServerFn({ method: "GET" }).handler(async (): Promise<NotFoundRow[]> => {
  const { requireStaff } = await import("@/server/auth/context");
  const { db } = await import("@/server/db");
  const { notFoundLog } = await import("@/server/db/schema");
  const { desc } = await import("drizzle-orm");
  await requireStaff();
  const rows = await db.select().from(notFoundLog).orderBy(desc(notFoundLog.hits)).limit(100);
  return rows.map((r) => ({ id: r.id, path: r.path, hits: r.hits, referrer: r.referrer, lastSeen: r.lastSeen.toISOString() }));
});

export const adminClearNotFound = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid().optional() }).parse(i))
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const { requireManager } = await import("@/server/auth/context");
    const { db } = await import("@/server/db");
    const { notFoundLog } = await import("@/server/db/schema");
    const { eq } = await import("drizzle-orm");
    await requireManager();
    if (data.id) await db.delete(notFoundLog).where(eq(notFoundLog.id, data.id));
    else await db.delete(notFoundLog);
    return { ok: true };
  });
