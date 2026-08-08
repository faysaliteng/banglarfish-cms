import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { EmailMessage } from "./config-types";

type Row = {
  id: string; folder: string; direction: string; fromAddr: string; toAddr: string; cc: string; bcc: string;
  subject: string; html: string; textBody: string; attachments: { filename: string; url: string; size?: number }[];
  messageId: string; inReplyTo: string; status: string; errorText: string; isRead: boolean; category: string; createdAt: Date;
};

function toMsg(r: Row): EmailMessage {
  return {
    id: r.id, folder: r.folder as EmailMessage["folder"], direction: r.direction as EmailMessage["direction"],
    fromAddr: r.fromAddr, toAddr: r.toAddr, cc: r.cc, bcc: r.bcc, subject: r.subject, html: r.html, textBody: r.textBody,
    attachments: r.attachments ?? [], messageId: r.messageId, inReplyTo: r.inReplyTo,
    status: r.status as EmailMessage["status"], errorText: r.errorText, isRead: r.isRead, category: r.category,
    createdAt: (r.createdAt instanceof Date ? r.createdAt : new Date(r.createdAt)).toISOString(),
  };
}

// List a folder (newest first) + per-folder counts for the sidebar.
export const adminListMail = createServerFn({ method: "GET" })
  .inputValidator((i: unknown) => z.object({ folder: z.enum(["inbox", "sent", "drafts"]).default("sent"), limit: z.number().int().min(1).max(100).default(50), offset: z.number().int().min(0).default(0) }).parse(i))
  .handler(async ({ data }): Promise<{ messages: EmailMessage[]; counts: { inbox: number; sent: number; drafts: number; inboxUnread: number } }> => {
    const { requireMailAccess } = await import("@/server/auth/context");
    await requireMailAccess();
    const { db } = await import("@/server/db");
    const { emailMessages } = await import("@/server/db/schema");
    const { eq, desc, and, count } = await import("drizzle-orm");
    const rows = await db.select().from(emailMessages).where(eq(emailMessages.folder, data.folder)).orderBy(desc(emailMessages.createdAt)).limit(data.limit).offset(data.offset);
    const countFor = async (folder: string, unreadOnly = false) => {
      const [r] = await db.select({ n: count() }).from(emailMessages).where(unreadOnly ? and(eq(emailMessages.folder, folder), eq(emailMessages.isRead, false)) : eq(emailMessages.folder, folder));
      return Number(r?.n ?? 0);
    };
    const [inbox, sent, drafts, inboxUnread] = await Promise.all([countFor("inbox"), countFor("sent"), countFor("drafts"), countFor("inbox", true)]);
    return { messages: (rows as Row[]).map(toMsg), counts: { inbox, sent, drafts, inboxUnread } };
  });

// Fetch one message + mark it read.
export const adminGetMail = createServerFn({ method: "GET" })
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data }): Promise<EmailMessage | null> => {
    const { requireMailAccess } = await import("@/server/auth/context");
    await requireMailAccess();
    const { db } = await import("@/server/db");
    const { emailMessages } = await import("@/server/db/schema");
    const { eq } = await import("drizzle-orm");
    const [row] = await db.select().from(emailMessages).where(eq(emailMessages.id, data.id)).limit(1);
    if (!row) return null;
    if (!row.isRead) { try { await db.update(emailMessages).set({ isRead: true }).where(eq(emailMessages.id, data.id)); } catch { /* ignore */ } }
    return toMsg(row as Row);
  });

// Recipient suggestions (registered users) for the compose "To" field.
export const adminListRecipients = createServerFn({ method: "GET" }).handler(async (): Promise<{ email: string; name: string }[]> => {
  const { requireMailAccess } = await import("@/server/auth/context");
  await requireMailAccess();
  const { db } = await import("@/server/db");
  const { users } = await import("@/server/db/schema");
  const { isNotNull, desc } = await import("drizzle-orm");
  const rows = await db.select({ email: users.email, name: users.fullName }).from(users).where(isNotNull(users.email)).orderBy(desc(users.createdAt)).limit(500);
  return rows.filter((r) => r.email).map((r) => ({ email: r.email as string, name: r.name ?? "" }));
});

// Compose & send an email to any address from the store's own address.
export const adminSendMail = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) =>
    z.object({
      to: z.string().trim().min(3).max(320),
      cc: z.string().trim().max(320).default(""),
      bcc: z.string().trim().max(320).default(""),
      subject: z.string().trim().max(300).default(""),
      html: z.string().max(200_000).default(""),
      inReplyTo: z.string().max(200).default(""),
      attachments: z.array(z.object({ filename: z.string().max(260), url: z.string().max(500) })).max(10).default([]),
    }).parse(i),
  )
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const { requireMailAccess } = await import("@/server/auth/context");
    const actor = await requireMailAccess();
    const { sendEmail } = await import("@/server/email");
    const path = await import("node:path");

    // Resolve /uploads/<name> attachments to on-disk paths (only allow the uploads dir).
    const uploadDir = process.env.UPLOAD_DIR ?? path.join(process.cwd(), "public", "uploads");
    const atts = (data.attachments ?? [])
      .filter((a) => a.url.startsWith("/uploads/"))
      .map((a) => ({ filename: a.filename || path.basename(a.url), path: path.join(uploadDir, path.basename(a.url)), url: a.url }));

    await sendEmail({
      to: data.to, cc: data.cc || undefined, bcc: data.bcc || undefined,
      subject: data.subject, html: data.html, attachments: atts, category: "manual",
      inReplyTo: data.inReplyTo || undefined,
    });
    try {
      const { audit } = await import("@/server/audit");
      await audit(actor, "email.send", "email", data.to);
    } catch { /* audit best-effort */ }
    return { ok: true };
  });

// Save (or update) a draft so the Drafts folder is a real, working folder.
export const adminSaveDraft = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) =>
    z.object({
      id: z.string().uuid().optional(),
      to: z.string().trim().max(320).default(""),
      cc: z.string().trim().max(320).default(""),
      bcc: z.string().trim().max(320).default(""),
      subject: z.string().trim().max(300).default(""),
      html: z.string().max(200_000).default(""),
      inReplyTo: z.string().max(200).default(""),
      attachments: z.array(z.object({ filename: z.string().max(260), url: z.string().max(500) })).max(10).default([]),
    }).parse(i),
  )
  .handler(async ({ data }): Promise<{ ok: true; id: string }> => {
    const { requireMailAccess } = await import("@/server/auth/context");
    await requireMailAccess();
    const { db } = await import("@/server/db");
    const { emailMessages } = await import("@/server/db/schema");
    const { eq } = await import("drizzle-orm");
    const values = {
      folder: "drafts", direction: "outbound", status: "draft", isRead: true, category: "manual",
      toAddr: data.to, cc: data.cc, bcc: data.bcc, subject: data.subject, html: data.html,
      inReplyTo: data.inReplyTo, attachments: data.attachments,
    };
    if (data.id) {
      await db.update(emailMessages).set(values).where(eq(emailMessages.id, data.id));
      return { ok: true, id: data.id };
    }
    const [row] = await db.insert(emailMessages).values(values).returning({ id: emailMessages.id });
    return { ok: true, id: row.id };
  });

// Upload an attachment (mail-access role, incl. support). Reuses the media core.
export const adminMailUpload = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => z.object({ filename: z.string().trim().min(1).max(200), dataUrl: z.string().min(10) }).parse(i))
  .handler(async ({ data }): Promise<{ id: string; url: string; name: string; size: string }> => {
    const { requireMailAccess } = await import("@/server/auth/context");
    await requireMailAccess();
    const { storeUpload } = await import("@/server/uploads");
    return storeUpload(data);
  });

// Delete several messages at once (bulk selection in the list view).
export const adminDeleteMails = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => z.object({ ids: z.array(z.string().uuid()).min(1).max(200) }).parse(i))
  .handler(async ({ data }): Promise<{ ok: true; deleted: number }> => {
    const { requireMailAccess } = await import("@/server/auth/context");
    const actor = await requireMailAccess();
    const { db } = await import("@/server/db");
    const { emailMessages } = await import("@/server/db/schema");
    const { inArray } = await import("drizzle-orm");
    const rows = await db.delete(emailMessages).where(inArray(emailMessages.id, data.ids)).returning({ id: emailMessages.id });
    try { const { audit } = await import("@/server/audit"); await audit(actor, "email.delete.bulk", "email", `${rows.length} message(s)`); } catch { /* ignore */ }
    return { ok: true, deleted: rows.length };
  });

// Empty a whole folder in one action.
export const adminEmptyMailFolder = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => z.object({ folder: z.enum(["inbox", "sent", "drafts"]) }).parse(i))
  .handler(async ({ data }): Promise<{ ok: true; deleted: number }> => {
    const { requireMailAccess } = await import("@/server/auth/context");
    const actor = await requireMailAccess();
    const { db } = await import("@/server/db");
    const { emailMessages } = await import("@/server/db/schema");
    const { eq } = await import("drizzle-orm");
    const rows = await db.delete(emailMessages).where(eq(emailMessages.folder, data.folder)).returning({ id: emailMessages.id });
    try { const { audit } = await import("@/server/audit"); await audit(actor, "email.folder.empty", "email", `${data.folder}: ${rows.length}`); } catch { /* ignore */ }
    return { ok: true, deleted: rows.length };
  });

// Delete a message from the client.
export const adminDeleteMail = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const { requireMailAccess } = await import("@/server/auth/context");
    const actor = await requireMailAccess();
    const { db } = await import("@/server/db");
    const { emailMessages } = await import("@/server/db/schema");
    const { eq } = await import("drizzle-orm");
    await db.delete(emailMessages).where(eq(emailMessages.id, data.id));
    try { const { audit } = await import("@/server/audit"); await audit(actor, "email.delete", "email", data.id); } catch { /* ignore */ }
    return { ok: true };
  });
