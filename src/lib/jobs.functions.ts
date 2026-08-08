import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type JobRow = { id: string; type: string; status: string; attempts: number; maxAttempts: number; runAt: string; lastError: string | null; createdAt: string };

export const adminListJobs = createServerFn({ method: "GET" }).handler(async (): Promise<{ jobs: JobRow[]; counts: Record<string, number> }> => {
  const { requireStaff } = await import("@/server/auth/context");
  const { db } = await import("@/server/db");
  const { jobs } = await import("@/server/db/schema");
  const { desc, sql } = await import("drizzle-orm");
  await requireStaff();
  const rows = await db.select().from(jobs).orderBy(desc(jobs.createdAt)).limit(100);
  const countRows = await db.select({ status: jobs.status, n: sql<number>`count(*)::int` }).from(jobs).groupBy(jobs.status);
  const counts: Record<string, number> = {};
  for (const c of countRows) counts[c.status] = Number(c.n);
  return {
    jobs: rows.map((j) => ({ id: j.id, type: j.type, status: j.status, attempts: j.attempts, maxAttempts: j.maxAttempts, runAt: j.runAt.toISOString(), lastError: j.lastError, createdAt: j.createdAt.toISOString() })),
    counts,
  };
});

export const adminRetryJob = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const { requireManager } = await import("@/server/auth/context");
    const { db } = await import("@/server/db");
    const { jobs } = await import("@/server/db/schema");
    const { eq } = await import("drizzle-orm");
    await requireManager();
    await db.update(jobs).set({ status: "pending", runAt: new Date(), attempts: 0, lastError: null, updatedAt: new Date() }).where(eq(jobs.id, data.id));
    return { ok: true };
  });

export const adminClearJobs = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => z.object({ status: z.enum(["done", "failed"]) }).parse(i))
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const { requireManager } = await import("@/server/auth/context");
    const { db } = await import("@/server/db");
    const { jobs } = await import("@/server/db/schema");
    const { eq } = await import("drizzle-orm");
    await requireManager();
    await db.delete(jobs).where(eq(jobs.status, data.status));
    return { ok: true };
  });
