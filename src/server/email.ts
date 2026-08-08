// Built-in transactional email. Provider-agnostic: SMTP (any host — Brevo,
// Gmail, Mailgun…) via nodemailer, or the Resend HTTP API. Config lives in the
// `email` settings row (admin → Email). All sends are best-effort at the call
// site; sendEmail throws so the admin "test send" can surface errors.
import type { EmailConfig } from "@/lib/config-types";

export type MailAttachment = { filename: string; path?: string; href?: string; content?: string | Buffer; url?: string };
export type Mail = {
  to: string; subject: string; html: string; text?: string;
  cc?: string; bcc?: string; replyTo?: string;
  inReplyTo?: string; // Message-ID being replied to (threads the conversation)
  attachments?: MailAttachment[];
  category?: string; // for the Sent log (welcome | passwordReset | orderConfirm | orderStatus | manual…)
  log?: boolean; // default true — record to the in-panel email client
};

function stripHtml(html: string): string {
  return html.replace(/<style[\s\S]*?<\/style>/gi, "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

type Brand = {
  name: string; url: string; primary: string; logo: string;
  address: string; phone: string; email: string;
  social: { facebook?: string; instagram?: string; youtube?: string };
};

// Gather all brand identity for emails: store name, absolute logo URL, and the
// contact block (address / phone / email / socials) from the store settings.
async function brand(): Promise<Brand> {
  const url = (process.env.APP_URL || "").replace(/\/+$/, "") || "";
  let name = "", logoPath = "/img/logo-light.png";
  let address = "", phone = "", email = "";
  const social: Brand["social"] = {};
  try {
    const { getBrandingConfig } = await import("./site-config");
    const b = await getBrandingConfig();
    if (b?.storeName) name = b.storeName;
    if (b?.logoLight) logoPath = b.logoLight;
  } catch { /* default */ }
  try {
    const { getSettingsValue } = await import("./settings");
    const s = await getSettingsValue();
    if (!name && s.storeName) name = s.storeName;
    address = s.address || "";
    phone = s.storePhone || "";
    email = s.storeEmail || "";
    if (s.facebook) social.facebook = s.facebook;
    if (s.instagram) social.instagram = s.instagram;
    if (s.youtube) social.youtube = s.youtube;
  } catch { /* default */ }
  if (!name) name = "Banglarfish";
  const logo = /^https?:\/\//.test(logoPath) ? logoPath : (url ? url + logoPath : logoPath);
  return { name, url, primary: "#0ea5b7", logo, address, phone, email, social };
}

// Shared branded wrapper — table-based + inline CSS for maximum email-client
// compatibility (Outlook, Gmail, Apple Mail). Clean white card with a logo
// header, brand-teal accent, content area, and a dark contact footer that
// mirrors the website. `bodyHtml` is the admin-editable, already-filled body.
function layout(b: Brand, bodyHtml: string): string {
  const tel = b.phone.replace(/[^+\d]/g, "");
  const contactBits: string[] = [];
  if (b.phone) contactBits.push(`<a href="tel:${tel}" style="color:#cbd5e1;text-decoration:none">${b.phone}</a>`);
  if (b.email) contactBits.push(`<a href="mailto:${b.email}" style="color:#cbd5e1;text-decoration:none">${b.email}</a>`);
  const socialLinks: string[] = [];
  if (b.social.facebook) socialLinks.push(`<a href="${b.social.facebook}" style="color:#5eead4;text-decoration:none;font-weight:600">Facebook</a>`);
  if (b.social.instagram) socialLinks.push(`<a href="${b.social.instagram}" style="color:#5eead4;text-decoration:none;font-weight:600">Instagram</a>`);
  if (b.social.youtube) socialLinks.push(`<a href="${b.social.youtube}" style="color:#5eead4;text-decoration:none;font-weight:600">YouTube</a>`);
  const logoBlock = b.logo
    ? `<a href="${b.url || "#"}" style="text-decoration:none"><img src="${b.logo}" alt="${b.name}" height="40" style="height:40px;width:auto;display:inline-block;border:0;outline:none" /></a>`
    : `<a href="${b.url || "#"}" style="color:${b.primary};font-size:22px;font-weight:800;text-decoration:none">${b.name}</a>`;

  return `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light only">
<meta name="supported-color-schemes" content="light">
<title>${b.name}</title>
</head>
<body style="margin:0;padding:0;background:#eef2f5;-webkit-text-size-adjust:100%">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef2f5;padding:24px 12px">
  <tr><td align="center">
    <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif">
      <!-- Logo header -->
      <tr><td align="center" style="padding:28px 24px 20px;background:#ffffff">${logoBlock}</td></tr>
      <!-- Brand accent bar -->
      <tr><td style="height:4px;line-height:4px;font-size:0;background:${b.primary}">&nbsp;</td></tr>
      <!-- Body -->
      <tr><td style="padding:32px 32px 24px;color:#1f2937;font-size:15px;line-height:1.65">${bodyHtml}</td></tr>
      <!-- Footer -->
      <tr><td style="background:#0f172a;padding:26px 32px;color:#94a3b8;font-size:13px;line-height:1.7">
        <div style="color:#ffffff;font-size:16px;font-weight:700;margin-bottom:6px">${b.name}</div>
        ${b.address ? `<div style="color:#cbd5e1">${b.address}</div>` : ""}
        ${contactBits.length ? `<div style="margin-top:4px">${contactBits.join(' &nbsp;·&nbsp; ')}</div>` : ""}
        ${socialLinks.length ? `<div style="margin-top:12px">${socialLinks.join(' &nbsp;&nbsp; ')}</div>` : ""}
        <div style="border-top:1px solid #1e293b;margin:16px 0 0;padding-top:14px;color:#64748b;font-size:12px">
          © ${b.name}. All rights reserved.${b.url ? ` &nbsp;·&nbsp; <a href="${b.url}" style="color:#94a3b8;text-decoration:none">${b.url.replace(/^https?:\/\//, "")}</a>` : ""}
        </div>
      </td></tr>
    </table>
    <div style="max-width:600px;margin:14px auto 0;color:#94a3b8;font-size:11px;text-align:center;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif">
      You're receiving this email because you have an account or placed an order with ${b.name}.
    </div>
  </td></tr>
</table>
</body></html>`;
}

// Bengali labels for order statuses (used in emails).
const STATUS_LABEL_BN: Record<string, string> = { confirmed: "নিশ্চিত হয়েছে", processing: "প্রস্তুত করা হচ্ছে", packed: "প্যাক করা হয়েছে", shipped: "ডেলিভারির পথে", delivered: "ডেলিভার হয়েছে", cancelled: "বাতিল হয়েছে", refunded: "রিফান্ড হয়েছে" };

/* ---------------- Templates (admin-editable, from settings) ---------------- */
export async function passwordResetTemplate(link: string): Promise<Mail> {
  const b = await brand();
  const { getEmailTemplates, fillTemplate } = await import("./templates");
  const t = (await getEmailTemplates()).passwordReset;
  const vars = { store: b.name, url: b.url, link };
  return { to: "", subject: fillTemplate(t.subject, vars), html: layout(b, fillTemplate(t.body, vars)), text: "" };
}

export async function welcomeTemplate(name: string): Promise<Mail> {
  const b = await brand();
  const { getEmailTemplates, fillTemplate } = await import("./templates");
  const t = (await getEmailTemplates()).welcome;
  const vars = { store: b.name, url: b.url, name: name || "" };
  return { to: "", subject: fillTemplate(t.subject, vars), html: layout(b, fillTemplate(t.body, vars)), text: "" };
}

export async function orderConfirmTemplate(o: { orderNumber: string; total: number; paid: boolean; items?: { name: string; qty: number }[] }): Promise<Mail> {
  const b = await brand();
  const { getEmailTemplates, fillTemplate } = await import("./templates");
  const t = (await getEmailTemplates()).orderConfirm;
  const rows = (o.items ?? []).map((i) =>
    `<tr><td style="padding:9px 0;border-bottom:1px solid #eef2f6;color:#1f2937">${i.name}</td>` +
    `<td style="padding:9px 0;border-bottom:1px solid #eef2f6;text-align:right;color:#6b7280;white-space:nowrap">× ${i.qty}</td></tr>`
  ).join("");
  const itemsHtml = rows
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;font-size:14px;margin:4px 0 16px">${rows}</table>`
    : "";
  const vars = {
    store: b.name, url: b.url ? `${b.url}/account` : "", orderNumber: o.orderNumber, total: String(o.total),
    payStatus: o.paid ? "পরিশোধিত" : "ক্যাশ অন ডেলিভারি",
    items: itemsHtml,
  };
  return { to: "", subject: fillTemplate(t.subject, vars), html: layout(b, fillTemplate(t.body, vars)), text: "" };
}

export async function orderStatusTemplate(orderNumber: string, status: string): Promise<Mail> {
  const b = await brand();
  const { getEmailTemplates, fillTemplate } = await import("./templates");
  const t = (await getEmailTemplates()).orderStatus;
  const vars = { store: b.name, url: b.url ? `${b.url}/account` : "", orderNumber, status: STATUS_LABEL_BN[status] ?? status };
  return { to: "", subject: fillTemplate(t.subject, vars), html: layout(b, fillTemplate(t.body, vars)), text: "" };
}

// Welcome-discount email sent when someone joins the newsletter.
export async function couponEmail(code: string, percent = 10, unsubUrl = ""): Promise<Mail> {
  const b = await brand();
  const shopUrl = b.url ? `${b.url}/shop` : "#";
  const body = `<p style="line-height:1.7;margin:0 0 14px">Thanks for subscribing! Here's your <strong>${percent}% welcome discount</strong> — it's good for a single order.</p>
<div style="text-align:center;margin:8px 0 18px">
  <div style="display:inline-block;border:2px dashed ${b.primary};border-radius:12px;padding:16px 28px">
    <div style="font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:1px">Your code</div>
    <div style="font-size:26px;font-weight:800;letter-spacing:2px;color:${b.primary};font-family:monospace">${code}</div>
  </div>
</div>
<p style="line-height:1.7;margin:0 0 14px">Enter it in the <strong>Coupon code</strong> box at checkout. One-time use.</p>
<p style="margin:0"><a href="${shopUrl}" style="display:inline-block;background:${b.primary};color:#fff;text-decoration:none;font-weight:600;padding:11px 22px;border-radius:9px">Start shopping</a></p>
${unsubUrl ? `<p style="margin:22px 0 0;color:#9ca3af;font-size:12px">Don't want these emails? <a href="${unsubUrl}" style="color:#9ca3af">Unsubscribe</a>.</p>` : ""}`;
  return { to: "", subject: `Your ${percent}% welcome discount 🎉`, html: layout(b, body), category: "newsletter" };
}

/* ---------------- Transport ---------------- */
async function sendViaSmtp(cfg: EmailConfig, mail: Mail): Promise<string> {
  const nodemailer = (await import("nodemailer")).default;
  // A loopback SMTP host (self-hosted Postfix on 127.0.0.1) presents a
  // self-signed TLS cert. The connection never leaves the machine, so skip
  // STARTTLS there instead of failing cert verification. External providers
  // keep strict TLS verification for security.
  const isLoopback = /^(127\.0\.0\.1|localhost|::1|0\.0\.0\.0)$/i.test((cfg.smtpHost || "").trim());
  const transport = nodemailer.createTransport({
    host: cfg.smtpHost,
    port: cfg.smtpPort || 587,
    secure: !!cfg.smtpSecure, // true for 465, false for 587 (STARTTLS)
    auth: cfg.smtpUser ? { user: cfg.smtpUser, pass: cfg.smtpPass } : undefined,
    ...(isLoopback ? { ignoreTLS: true, tls: { rejectUnauthorized: false } } : {}),
  });
  const info = await transport.sendMail({
    from: `"${cfg.fromName}" <${cfg.fromEmail}>`,
    inReplyTo: mail.inReplyTo || undefined,
    references: mail.inReplyTo || undefined,
    to: mail.to,
    cc: mail.cc || undefined,
    bcc: mail.bcc || undefined,
    replyTo: mail.replyTo || cfg.replyTo || undefined,
    subject: mail.subject,
    html: mail.html,
    text: mail.text || stripHtml(mail.html),
    attachments: (mail.attachments ?? []).map((a) => ({ filename: a.filename, path: a.path, href: a.href, content: a.content })),
  });
  // Surface the assigned Message-ID so the Sent record can be threaded.
  return (info as { messageId?: string } | undefined)?.messageId ?? "";
}

async function sendViaResend(cfg: EmailConfig, mail: Mail): Promise<void> {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${cfg.resendApiKey}`, "content-type": "application/json" },
    body: JSON.stringify({
      from: `${cfg.fromName} <${cfg.fromEmail}>`,
      to: [mail.to],
      cc: mail.cc ? [mail.cc] : undefined,
      bcc: mail.bcc ? [mail.bcc] : undefined,
      subject: mail.subject,
      html: mail.html,
      text: mail.text || stripHtml(mail.html),
      reply_to: mail.replyTo || cfg.replyTo || undefined,
      attachments: await Promise.all((mail.attachments ?? []).map(async (a) => {
        if (a.content) return { filename: a.filename, content: Buffer.isBuffer(a.content) ? a.content.toString("base64") : a.content };
        if (a.path) { const { readFile } = await import("node:fs/promises"); return { filename: a.filename, content: (await readFile(a.path)).toString("base64") }; }
        return { filename: a.filename, path: a.href };
      })),
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Resend API ${res.status}: ${body.slice(0, 200)}`);
  }
}

// Send an email using the configured provider. Throws on misconfiguration or
// transport failure (callers that are "best effort" should wrap in try/catch).
export async function sendEmail(mail: Mail): Promise<{ ok: true }> {
  const { getEmailConfig } = await import("./site-config");
  const cfg = await getEmailConfig();
  if (!cfg.enabled) throw new Error("Email is disabled. Enable it in Admin → Email.");
  if (!cfg.fromEmail) throw new Error("A 'From' email address is required (Admin → Email).");
  let messageId = "";
  try {
    if (cfg.mode === "resend") {
      if (!cfg.resendApiKey) throw new Error("Resend API key is missing (Admin → Email).");
      await sendViaResend(cfg, mail);
    } else {
      if (!cfg.smtpHost) throw new Error("SMTP host is missing (Admin → Email).");
      messageId = await sendViaSmtp(cfg, mail);
    }
  } catch (e) {
    await logSent(cfg, mail, "failed", e instanceof Error ? e.message : String(e), "");
    throw e;
  }
  await logSent(cfg, mail, "sent", "", messageId);
  return { ok: true };
}

// Record an outbound message to the in-panel email client (Sent). Best-effort.
async function logSent(cfg: EmailConfig, mail: Mail, status: "sent" | "failed", errorText: string, messageId = ""): Promise<void> {
  if (mail.log === false) return;
  try {
    const { logMail } = await import("./mailbox");
    await logMail({
      folder: "sent", direction: "outbound",
      fromAddr: `${cfg.fromName || ""} <${cfg.fromEmail}>`.trim(),
      toAddr: mail.to, cc: mail.cc ?? "", bcc: mail.bcc ?? "",
      subject: mail.subject, html: mail.html, textBody: mail.text ?? "",
      attachments: (mail.attachments ?? []).map((a) => ({ filename: a.filename, url: a.url ?? "" })),
      messageId, inReplyTo: mail.inReplyTo ?? "", status, errorText, isRead: true,
      category: mail.category ?? "transactional",
    });
  } catch { /* never break a send */ }
}

// Fire-and-forget wrapper for notifications (never throws into the caller).
export async function sendEmailSafe(mail: Mail | null): Promise<void> {
  if (!mail || !mail.to) return;
  try { await sendEmail(mail); } catch (e) { console.error("[email] send failed:", e instanceof Error ? e.message : e); }
}
