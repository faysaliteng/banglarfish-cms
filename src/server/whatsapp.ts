// WhatsApp notifications via the Meta WhatsApp Cloud API (free tier available).
// Business-initiated messages (order updates) require a pre-approved template;
// plain text only works inside the 24h customer-service window, so "text" mode is
// mainly for testing. Config comes from the `whatsapp` settings row.
import { getWhatsAppConfig } from "@/server/site-config";
import { normalizeBdPhone } from "@/server/sms/boomcast";

export type WaResult = { ok: boolean; error?: string; info?: string };

async function post(cfg: { apiVersion: string; phoneNumberId: string; accessToken: string }, body: unknown): Promise<WaResult> {
  const res = await fetch(`https://graph.facebook.com/${cfg.apiVersion}/${cfg.phoneNumberId}/messages`, {
    method: "POST",
    headers: { authorization: `Bearer ${cfg.accessToken}`, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = (await res.text().catch(() => "")).slice(0, 400);
  if (!res.ok) return { ok: false, error: `WhatsApp API ${res.status}: ${text}`, info: text };
  return { ok: true, info: text };
}

export async function sendWhatsAppText(to: string, message: string): Promise<WaResult> {
  const cfg = await getWhatsAppConfig();
  if (!cfg.enabled || !cfg.phoneNumberId || !cfg.accessToken) return { ok: false, error: "WhatsApp is not configured/enabled." };
  return post(cfg, { messaging_product: "whatsapp", to: normalizeBdPhone(to), type: "text", text: { body: message } });
}

// Send an approved template with ordered body parameters.
export async function sendWhatsAppTemplate(to: string, template: string, params: string[]): Promise<WaResult> {
  const cfg = await getWhatsAppConfig();
  if (!cfg.enabled || !cfg.phoneNumberId || !cfg.accessToken) return { ok: false, error: "WhatsApp is not configured/enabled." };
  if (!template) return { ok: false, error: "No template name configured." };
  return post(cfg, {
    messaging_product: "whatsapp",
    to: normalizeBdPhone(to),
    type: "template",
    template: {
      name: template,
      language: { code: cfg.langCode || "en" },
      components: params.length ? [{ type: "body", parameters: params.map((t) => ({ type: "text", text: t })) }] : [],
    },
  });
}
