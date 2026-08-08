import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const FIELD_TYPES = ["text", "textarea", "richtext", "number", "boolean", "select", "date", "media", "url"] as const;
export type FieldType = (typeof FIELD_TYPES)[number];
export type ContentField = { key: string; label: string; type: FieldType; required?: boolean; options?: string[] };
export type ContentTypeDef = { id: string; slug: string; name: string; namePlural: string; icon: string; fields: ContentField[]; hasPublicPage: boolean };
export type FieldVal = string | number | boolean | null;
export type ContentEntry = { id: string; typeSlug: string; slug: string; title: string; status: "draft" | "published"; data: Record<string, FieldVal>; metaTitle: string | null; metaDescription: string | null; publishedAt: string | null; updatedAt: string };

const slugify = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const FieldSchema = z.object({ key: z.string().min(1).max(40), label: z.string().min(1).max(80), type: z.enum(FIELD_TYPES), required: z.boolean().optional(), options: z.array(z.string().max(80)).optional() });

/* ---------------- Content types (schema definitions) ---------------- */
export const adminListContentTypes = createServerFn({ method: "GET" }).handler(async (): Promise<ContentTypeDef[]> => {
  const { requireStaff } = await import("@/server/auth/context");
  const { db } = await import("@/server/db");
  const { contentTypes } = await import("@/server/db/schema");
  const { desc } = await import("drizzle-orm");
  await requireStaff();
  const rows = await db.select().from(contentTypes).orderBy(desc(contentTypes.createdAt));
  return rows.map((t) => ({ id: t.id, slug: t.slug, name: t.name, namePlural: t.namePlural || t.name, icon: t.icon, fields: (t.fields ?? []) as ContentField[], hasPublicPage: t.hasPublicPage }));
});

export const getContentTypesPublic = createServerFn({ method: "GET" }).handler(async (): Promise<{ slug: string; name: string; namePlural: string }[]> => {
  const { db } = await import("@/server/db");
  const { contentTypes } = await import("@/server/db/schema");
  const { eq } = await import("drizzle-orm");
  const rows = await db.select().from(contentTypes).where(eq(contentTypes.hasPublicPage, true));
  return rows.map((t) => ({ slug: t.slug, name: t.name, namePlural: t.namePlural || t.name }));
});

export const adminUpsertContentType = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid().optional(), slug: z.string().max(40).optional(), name: z.string().trim().min(1).max(80), namePlural: z.string().max(80).optional(), icon: z.string().max(40).optional(), fields: z.array(FieldSchema).max(40), hasPublicPage: z.boolean().default(true) }).parse(i))
  .handler(async ({ data }): Promise<{ id: string }> => {
    const { requireManager } = await import("@/server/auth/context");
    const { db } = await import("@/server/db");
    const { contentTypes } = await import("@/server/db/schema");
    const { eq } = await import("drizzle-orm");
    await requireManager();
    const slug = data.slug || slugify(data.name);
    const values = { slug, name: data.name, namePlural: data.namePlural || data.name, icon: data.icon || "FileText", fields: data.fields, hasPublicPage: data.hasPublicPage };
    if (data.id) { await db.update(contentTypes).set(values).where(eq(contentTypes.id, data.id)); return { id: data.id }; }
    const [row] = await db.insert(contentTypes).values(values).returning({ id: contentTypes.id });
    return { id: row.id };
  });

export const adminDeleteContentType = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const { requireManager } = await import("@/server/auth/context");
    const { db } = await import("@/server/db");
    const { contentTypes } = await import("@/server/db/schema");
    const { eq } = await import("drizzle-orm");
    await requireManager();
    await db.delete(contentTypes).where(eq(contentTypes.id, data.id)); // cascades entries
    return { ok: true };
  });

/* ---------------- Entries ---------------- */
export const adminListEntries = createServerFn({ method: "GET" })
  .inputValidator((i: unknown) => z.object({ typeSlug: z.string().max(40) }).parse(i))
  .handler(async ({ data }): Promise<ContentEntry[]> => {
    const { requireStaff } = await import("@/server/auth/context");
    const { db } = await import("@/server/db");
    const { contentEntries } = await import("@/server/db/schema");
    const { desc, eq } = await import("drizzle-orm");
    await requireStaff();
    const rows = await db.select().from(contentEntries).where(eq(contentEntries.typeSlug, data.typeSlug)).orderBy(desc(contentEntries.updatedAt));
    return rows.map(mapEntry);
  });

export const adminUpsertEntry = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid().optional(), typeSlug: z.string().max(40), slug: z.string().max(120).optional(), title: z.string().trim().min(1).max(200), status: z.enum(["draft", "published"]), data: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])), metaTitle: z.string().max(200).optional().nullable(), metaDescription: z.string().max(400).optional().nullable() }).parse(i))
  .handler(async ({ data }): Promise<{ id: string }> => {
    const { requireStaff } = await import("@/server/auth/context");
    const { db } = await import("@/server/db");
    const { contentTypes, contentEntries } = await import("@/server/db/schema");
    const { eq } = await import("drizzle-orm");
    await requireStaff();
    const [type] = await db.select({ id: contentTypes.id }).from(contentTypes).where(eq(contentTypes.slug, data.typeSlug)).limit(1);
    if (!type) throw new Error("Content type not found");
    const slug = data.slug || slugify(data.title);
    const values = { typeId: type.id, typeSlug: data.typeSlug, slug, title: data.title, status: data.status, data: data.data as Record<string, unknown>, metaTitle: data.metaTitle ?? null, metaDescription: data.metaDescription ?? null, publishedAt: data.status === "published" ? new Date() : null, updatedAt: new Date() };
    if (data.id) { await db.update(contentEntries).set(values).where(eq(contentEntries.id, data.id)); return { id: data.id }; }
    const [row] = await db.insert(contentEntries).values(values).returning({ id: contentEntries.id });
    return { id: row.id };
  });

export const adminDeleteEntry = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const { requireStaff } = await import("@/server/auth/context");
    const { db } = await import("@/server/db");
    const { contentEntries } = await import("@/server/db/schema");
    const { eq } = await import("drizzle-orm");
    await requireStaff();
    await db.delete(contentEntries).where(eq(contentEntries.id, data.id));
    return { ok: true };
  });

/* ---------------- Public ---------------- */
export const getEntryPublic = createServerFn({ method: "GET" })
  .inputValidator((i: unknown) => z.object({ typeSlug: z.string().max(40), slug: z.string().max(120) }).parse(i))
  .handler(async ({ data }): Promise<{ type: ContentTypeDef; entry: ContentEntry } | null> => {
    const { db } = await import("@/server/db");
    const { contentTypes, contentEntries } = await import("@/server/db/schema");
    const { and, eq } = await import("drizzle-orm");
    const [type] = await db.select().from(contentTypes).where(and(eq(contentTypes.slug, data.typeSlug), eq(contentTypes.hasPublicPage, true))).limit(1);
    if (!type) return null;
    const [e] = await db.select().from(contentEntries).where(and(eq(contentEntries.typeSlug, data.typeSlug), eq(contentEntries.slug, data.slug), eq(contentEntries.status, "published"))).limit(1);
    if (!e) return null;
    return { type: { id: type.id, slug: type.slug, name: type.name, namePlural: type.namePlural || type.name, icon: type.icon, fields: (type.fields ?? []) as ContentField[], hasPublicPage: type.hasPublicPage }, entry: mapEntry(e) };
  });

export const listEntriesPublic = createServerFn({ method: "GET" })
  .inputValidator((i: unknown) => z.object({ typeSlug: z.string().max(40) }).parse(i))
  .handler(async ({ data }): Promise<{ type: { slug: string; name: string; namePlural: string } | null; entries: ContentEntry[] }> => {
    const { db } = await import("@/server/db");
    const { contentTypes, contentEntries } = await import("@/server/db/schema");
    const { and, eq, desc, or, isNull, lte } = await import("drizzle-orm");
    const [type] = await db.select().from(contentTypes).where(and(eq(contentTypes.slug, data.typeSlug), eq(contentTypes.hasPublicPage, true))).limit(1);
    if (!type) return { type: null, entries: [] };
    const rows = await db.select().from(contentEntries).where(and(eq(contentEntries.typeSlug, data.typeSlug), eq(contentEntries.status, "published"), or(isNull(contentEntries.publishedAt), lte(contentEntries.publishedAt, new Date())))).orderBy(desc(contentEntries.publishedAt));
    return { type: { slug: type.slug, name: type.name, namePlural: type.namePlural || type.name }, entries: rows.map(mapEntry) };
  });

function mapEntry(e: { id: string; typeSlug: string; slug: string; title: string; status: string; data: Record<string, unknown>; metaTitle: string | null; metaDescription: string | null; publishedAt: Date | null; updatedAt: Date }): ContentEntry {
  return { id: e.id, typeSlug: e.typeSlug, slug: e.slug, title: e.title, status: e.status as "draft" | "published", data: (e.data ?? {}) as Record<string, FieldVal>, metaTitle: e.metaTitle, metaDescription: e.metaDescription, publishedAt: e.publishedAt?.toISOString() ?? null, updatedAt: e.updatedAt.toISOString() };
}
