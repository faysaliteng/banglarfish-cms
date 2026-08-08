// Mailbox persistence for the in-panel email client. Every send is logged to
// the `email_messages` table (Sent); inbound mail lands here too once receiving
// is configured. All writes are best-effort — logging must never break a send.
import { db } from "./db";
import { emailMessages } from "./db/schema";

export type LogMailInput = {
  folder?: "inbox" | "sent" | "drafts";
  direction?: "outbound" | "inbound";
  fromAddr?: string;
  toAddr?: string;
  cc?: string;
  bcc?: string;
  subject?: string;
  html?: string;
  textBody?: string;
  attachments?: { filename: string; url: string; size?: number }[];
  messageId?: string;
  inReplyTo?: string;
  status?: "sent" | "failed" | "received" | "draft";
  errorText?: string;
  isRead?: boolean;
  category?: string;
};

// Insert a message row. Never throws.
export async function logMail(m: LogMailInput): Promise<void> {
  try {
    await db.insert(emailMessages).values({
      folder: m.folder ?? "sent",
      direction: m.direction ?? "outbound",
      fromAddr: m.fromAddr ?? "",
      toAddr: m.toAddr ?? "",
      cc: m.cc ?? "",
      bcc: m.bcc ?? "",
      subject: m.subject ?? "",
      html: m.html ?? "",
      textBody: m.textBody ?? "",
      attachments: m.attachments ?? [],
      messageId: m.messageId ?? "",
      inReplyTo: m.inReplyTo ?? "",
      status: m.status ?? "sent",
      errorText: (m.errorText ?? "").slice(0, 1000),
      isRead: m.isRead ?? true,
      category: m.category ?? "manual",
    });
  } catch (e) {
    console.error("[mailbox] logMail failed", e instanceof Error ? e.message : e);
  }
}
