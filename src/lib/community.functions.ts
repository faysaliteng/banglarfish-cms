import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/* ============================================================
   Blog comments (with moderation) + contact-form inbox.
   All public submissions are sanitised and land as "pending".
   ============================================================ */

export type PublicComment = { id: string; authorName: string; body: string; createdAt: string; parentId: string | null };
export type AdminComment = PublicComment & { authorEmail: string; status: "pending" | "approved" | "rejected"; postId: string; postTitle: string };
export type ContactRow = { id: string; name: string; email: string; subject: string; message: string; isRead: boolean; createdAt: string };

const clean = (s: string) => s.replace(/[<>]/g, "").trim();

/* ---------- Comments: public ---------- */

export const submitComment = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) =>
    z.object({
      postId: z.string().uuid(),
      authorName: z.string().trim().min(2).max(80),
      authorEmail: z.string().trim().email().max(160).or(z.literal("")).optional(),
      body: z.string().trim().min(2).max(4000),
      parentId: z.string().uuid().optional().nullable(),
    }).parse(i),
  )
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const { db } = await import("@/server/db");
    const { comments, blogPosts } = await import("@/server/db/schema");
    const { eq } = await import("drizzle-orm");
    // Post must exist.
    const [post] = await db.select({ id: blogPosts.id }).from(blogPosts).where(eq(blogPosts.id, data.postId)).limit(1);
    if (!post) throw new Error("Post not found");
    // Comments can be disabled from the Modules panel (homepage.sections.comments === false).
    const { getHomepageValue } = await import("@/server/settings");
    const home = await getHomepageValue();
    if (home.sections.comments === false) throw new Error("Comments are disabled");
    await db.insert(comments).values({
      postId: data.postId,
      parentId: data.parentId ?? null,
      authorName: clean(data.authorName),
      authorEmail: (data.authorEmail ?? "").toLowerCase(),
      body: clean(data.body),
      status: "pending",
    });
    return { ok: true };
  });

export const getComments = createServerFn({ method: "GET" })
  .inputValidator((i: unknown) => z.object({ postId: z.string().uuid() }).parse(i))
  .handler(async ({ data }): Promise<PublicComment[]> => {
    const { db } = await import("@/server/db");
    const { comments } = await import("@/server/db/schema");
    const { and, eq, asc } = await import("drizzle-orm");
    const rows = await db
      .select()
      .from(comments)
      .where(and(eq(comments.postId, data.postId), eq(comments.status, "approved")))
      .orderBy(asc(comments.createdAt));
    return rows.map((c) => ({ id: c.id, authorName: c.authorName, body: c.body, createdAt: c.createdAt.toISOString(), parentId: c.parentId }));
  });

/* ---------- Comments: admin moderation ---------- */

export const adminListComments = createServerFn({ method: "GET" })
  .inputValidator((i: unknown) => z.object({ status: z.enum(["pending", "approved", "rejected", "all"]).default("all") }).parse(i))
  .handler(async ({ data }): Promise<AdminComment[]> => {
    const { requireStaff } = await import("@/server/auth/context");
    const { db } = await import("@/server/db");
    const { comments, blogPosts } = await import("@/server/db/schema");
    const { desc, eq } = await import("drizzle-orm");
    await requireStaff();
    const cond = data.status === "all" ? undefined : eq(comments.status, data.status);
    const rows = await db
      .select({
        id: comments.id, authorName: comments.authorName, authorEmail: comments.authorEmail, body: comments.body,
        status: comments.status, createdAt: comments.createdAt, parentId: comments.parentId, postId: comments.postId, postTitle: blogPosts.title,
      })
      .from(comments)
      .leftJoin(blogPosts, eq(comments.postId, blogPosts.id))
      .where(cond)
      .orderBy(desc(comments.createdAt));
    return rows.map((c) => ({
      id: c.id, authorName: c.authorName, authorEmail: c.authorEmail, body: c.body, status: c.status,
      createdAt: c.createdAt.toISOString(), parentId: c.parentId, postId: c.postId, postTitle: c.postTitle ?? "(deleted post)",
    }));
  });

export const adminModerateComment = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid(), status: z.enum(["pending", "approved", "rejected"]) }).parse(i))
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const { requireStaff } = await import("@/server/auth/context");
    const { db } = await import("@/server/db");
    const { comments } = await import("@/server/db/schema");
    const { eq } = await import("drizzle-orm");
    await requireStaff();
    await db.update(comments).set({ status: data.status }).where(eq(comments.id, data.id));
    return { ok: true };
  });

export const adminDeleteComment = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const { requireStaff } = await import("@/server/auth/context");
    const { db } = await import("@/server/db");
    const { comments } = await import("@/server/db/schema");
    const { eq } = await import("drizzle-orm");
    await requireStaff();
    await db.delete(comments).where(eq(comments.id, data.id));
    return { ok: true };
  });

/* ---------- Contact form ---------- */

export type StoreContact = { storeName: string; email: string; phone: string; address: string; facebook: string; instagram: string; youtube: string; enabled: boolean };

export const getStoreContact = createServerFn({ method: "GET" }).handler(async (): Promise<StoreContact> => {
  const { getSettingsValue, getHomepageValue } = await import("@/server/settings");
  const s = await getSettingsValue();
  let enabled = true;
  try {
    const home = await getHomepageValue();
    enabled = home.sections.contact !== false;
  } catch {
    /* default enabled */
  }
  return {
    storeName: s.storeName, email: s.storeEmail, phone: s.storePhone, address: s.address,
    facebook: s.facebook, instagram: s.instagram, youtube: s.youtube, enabled,
  };
});

export const submitContact = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) =>
    z.object({
      name: z.string().trim().min(2).max(120),
      email: z.string().trim().email().max(160),
      subject: z.string().trim().max(200).default(""),
      message: z.string().trim().min(2).max(5000),
    }).parse(i),
  )
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const { db } = await import("@/server/db");
    const { contactMessages } = await import("@/server/db/schema");
    await db.insert(contactMessages).values({
      name: clean(data.name), email: data.email.toLowerCase(), subject: clean(data.subject), message: clean(data.message),
    });
    return { ok: true };
  });

export const adminListContact = createServerFn({ method: "GET" }).handler(async (): Promise<ContactRow[]> => {
  const { requireStaff } = await import("@/server/auth/context");
  const { db } = await import("@/server/db");
  const { contactMessages } = await import("@/server/db/schema");
  const { desc } = await import("drizzle-orm");
  await requireStaff();
  const rows = await db.select().from(contactMessages).orderBy(desc(contactMessages.createdAt));
  return rows.map((m) => ({ id: m.id, name: m.name, email: m.email, subject: m.subject, message: m.message, isRead: m.isRead, createdAt: m.createdAt.toISOString() }));
});

export const adminMarkContactRead = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid(), isRead: z.boolean() }).parse(i))
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const { requireStaff } = await import("@/server/auth/context");
    const { db } = await import("@/server/db");
    const { contactMessages } = await import("@/server/db/schema");
    const { eq } = await import("drizzle-orm");
    await requireStaff();
    await db.update(contactMessages).set({ isRead: data.isRead }).where(eq(contactMessages.id, data.id));
    return { ok: true };
  });

export const adminDeleteContact = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const { requireStaff } = await import("@/server/auth/context");
    const { db } = await import("@/server/db");
    const { contactMessages } = await import("@/server/db/schema");
    const { eq } = await import("drizzle-orm");
    await requireStaff();
    await db.delete(contactMessages).where(eq(contactMessages.id, data.id));
    return { ok: true };
  });
