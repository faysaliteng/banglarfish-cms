// Customer notifications — SMS via Boomcast + email via the built-in mailer.
import { sendSms } from "./sms/boomcast";

// Order confirmation by EMAIL (best-effort; gated by the email config toggle).
export async function sendOrderConfirmationEmail(
  email: string | null | undefined,
  order: { orderNumber: string; total: number; items?: { name: string; qty: number }[] },
  paid: boolean,
): Promise<boolean> {
  if (!email) return false;
  try {
    const { getEmailConfig } = await import("./site-config");
    const cfg = await getEmailConfig();
    if (!cfg.enabled || !cfg.notifyOrderConfirm) return false;
    const { sendEmailSafe, orderConfirmTemplate } = await import("./email");
    const t = await orderConfirmTemplate({ orderNumber: order.orderNumber, total: order.total, paid, items: order.items });
    // Attach the real PDF invoice (best-effort — never block the email).
    let attachments: { filename: string; content: Buffer }[] = [];
    try {
      const { loadInvoiceData, renderInvoicePdf } = await import("./invoice");
      const inv = await loadInvoiceData(order.orderNumber);
      if (inv) attachments = [{ filename: `invoice-${order.orderNumber}.pdf`, content: await renderInvoicePdf(inv) }];
    } catch (e) { console.error("[notify] invoice PDF attach failed", e); }
    void sendEmailSafe({ ...t, to: email, attachments });
    return true;
  } catch (e) {
    console.error("[notify] order email failed", e);
    return false;
  }
}

// Order status update by EMAIL (best-effort; gated by the email config toggle).
export async function sendStatusEmail(email: string | null | undefined, orderNumber: string, status: string): Promise<void> {
  if (!email) return;
  try {
    const { getEmailConfig } = await import("./site-config");
    const cfg = await getEmailConfig();
    if (!cfg.enabled || !cfg.notifyOrderStatus) return;
    const { sendEmailSafe, orderStatusTemplate } = await import("./email");
    const t = await orderStatusTemplate(orderNumber, status);
    void sendEmailSafe({ ...t, to: email });
  } catch (e) {
    console.error("[notify] status email failed", e);
  }
}

// --- WhatsApp (best-effort; gated by whatsapp config toggles) ---
export async function sendOrderConfirmationWhatsApp(phone: string | null | undefined, orderNumber: string, total: number, paid: boolean): Promise<boolean> {
  if (!phone) return false;
  try {
    const { getWhatsAppConfig } = await import("./site-config");
    const cfg = await getWhatsAppConfig();
    if (!cfg.enabled || !cfg.notifyOrderConfirm) return false;
    const { sendWhatsAppTemplate, sendWhatsAppText } = await import("./whatsapp");
    const store = await storeName();
    const r = cfg.mode === "template"
      ? await sendWhatsAppTemplate(phone, cfg.orderTemplate, [orderNumber, String(total)])
      : await sendWhatsAppText(phone, `${store}: Order #${orderNumber} (৳${total}) confirmed${paid ? " (paid)" : ""}. Thank you!`);
    return r.ok;
  } catch { return false; }
}

export async function sendStatusWhatsApp(phone: string | null | undefined, orderNumber: string, status: string): Promise<boolean> {
  if (!phone) return false;
  try {
    const { getWhatsAppConfig } = await import("./site-config");
    const cfg = await getWhatsAppConfig();
    if (!cfg.enabled || !cfg.notifyOrderStatus) return false;
    const { sendWhatsAppTemplate, sendWhatsAppText } = await import("./whatsapp");
    const label = STATUS_LABEL[status] ?? status;
    const store = await storeName();
    const r = cfg.mode === "template"
      ? await sendWhatsAppTemplate(phone, cfg.statusTemplate, [orderNumber, label])
      : await sendWhatsAppText(phone, `${store}: Order #${orderNumber} is now ${label}.`);
    return r.ok;
  } catch { return false; }
}

// Low-stock alert to the admin phone (best-effort). Fires when an order leaves a
// product at or below its low-stock threshold.
export async function notifyLowStock(items: { name: string; stock: number }[]): Promise<void> {
  if (!items.length) return;
  try {
    const { getSmsConfig } = await import("./site-config");
    const cfg = await getSmsConfig();
    if (!cfg.alertPhone) return;
    const { sendSms } = await import("./sms/boomcast");
    const list = items.map((i) => `${i.name} (${i.stock} left)`).join(", ");
    await sendSms(cfg.alertPhone, `${await storeName()} low-stock alert: ${list}. Please restock.`);
  } catch (e) {
    console.error("[notify] low-stock alert failed", e);
  }
}

async function storeName(): Promise<string> {
  try { const { getBrandingConfig } = await import("./site-config"); const b = await getBrandingConfig(); if (b?.storeName) return b.storeName; } catch { /* default */ }
  return "Banglarfish";
}

export async function sendOrderConfirmation(phone: string, orderNumber: string, total: number, paid: boolean): Promise<boolean> {
  try {
    const { getSmsTemplates, fillTemplate } = await import("./templates");
    const tpl = (await getSmsTemplates()).orderConfirm;
    const msg = fillTemplate(tpl, { store: await storeName(), orderNumber, total: String(total), payStatus: paid ? "এবং পরিশোধিত" : "(ক্যাশ অন ডেলিভারি)" });
    const r = await sendSms(phone, msg);
    return r.ok;
  } catch (e) {
    console.error("[notify] order confirmation failed", e);
    return false;
  }
}

const STATUS_LABEL: Record<string, string> = {
  confirmed: "নিশ্চিত হয়েছে",
  processing: "প্রস্তুত করা হচ্ছে",
  packed: "প্যাক করা হয়েছে",
  shipped: "ডেলিভারির পথে",
  delivered: "ডেলিভার হয়েছে",
  cancelled: "বাতিল হয়েছে",
  refunded: "রিফান্ড হয়েছে",
};

export async function sendStatusUpdate(phone: string, orderNumber: string, status: string): Promise<boolean> {
  const label = STATUS_LABEL[status] ?? status;
  try {
    const { getSmsTemplates, fillTemplate } = await import("./templates");
    const tpl = (await getSmsTemplates()).orderStatus;
    const r = await sendSms(phone, fillTemplate(tpl, { store: await storeName(), orderNumber, status: label }));
    return r.ok;
  } catch (e) {
    console.error("[notify] status update failed", e);
    return false;
  }
}
