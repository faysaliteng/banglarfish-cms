// SMS gateway sender. Reads gateway config from the DB (admin-editable) with env
// fallback. When devMode is on (or not configured), the message is logged instead
// of sent. Bengali (non-ASCII) messages are auto-sent as UNICODE.
import { getSmsConfig } from "@/server/site-config";

export function normalizeBdPhone(input: string): string {
  const digits = input.replace(/\D/g, "");
  if (digits.startsWith("880")) return digits;
  if (digits.startsWith("0")) return "88" + digits;
  if (digits.startsWith("1")) return "880" + digits;
  return digits;
}

// Bengali / any non-ASCII content must go out as a Unicode SMS.
function isUnicode(msg: string): boolean {
  for (let i = 0; i < msg.length; i++) {
    if (msg.charCodeAt(i) > 127) return true;
  }
  return false;
}

export type SmsResult = { ok: boolean; error?: string; info?: string };

export async function sendSms(to: string, message: string): Promise<SmsResult> {
  const number = normalizeBdPhone(to);
  const cfg = await getSmsConfig();

  const configured = cfg.provider === "boomcast-web" ? !!(cfg.userName && cfg.apiUrl) : !!cfg.apiKey;
  if (cfg.devMode || !configured) {
    console.log(`[SMS:dev] to=${number} :: ${message}`);
    return { ok: true, info: "dev-mode (logged, not sent)" };
  }

  try {
    // --- Boomcast Web API (api.boom-cast.com externalApiSendTextMessage.php) ---
    if (cfg.provider === "boomcast-web") {
      const url = new URL(cfg.apiUrl);
      url.searchParams.set("masking", cfg.masking || "NOMASK");
      url.searchParams.set("userName", cfg.userName);
      url.searchParams.set("password", cfg.password);
      url.searchParams.set("MsgType", isUnicode(message) ? "UNICODE" : "TEXT");
      url.searchParams.set("receiver", number);
      url.searchParams.set("message", message);
      const res = await fetch(url, { method: "GET" });
      const text = (await res.text().catch(() => "")).trim();
      if (!res.ok) return { ok: false, error: `SMS gateway ${res.status}: ${text.slice(0, 180)}`, info: text.slice(0, 300) };
      // Boomcast returns JSON: [{success:0|1, message, msgid, jobid, msisdn}].
      try {
        const parsed = JSON.parse(text);
        const first = Array.isArray(parsed) ? parsed[0] : parsed;
        if (first && typeof first.success !== "undefined") {
          if (Number(first.success) === 1) return { ok: true, info: text.slice(0, 300) };
          return { ok: false, error: String(first.message || "SMS not accepted"), info: text.slice(0, 300) };
        }
      } catch { /* non-JSON response — fall back to a keyword heuristic */ }
      if (/error|invalid|fail|denied|unauthor|insufficient|balance|not\s*found/i.test(text)) {
        return { ok: false, error: text.slice(0, 200), info: text.slice(0, 300) };
      }
      return { ok: true, info: text.slice(0, 300) };
    }

    // --- Generic / legacy Boomcast (param-mapped) ---
    const params: Record<string, string> = {
      [cfg.paramApikey]: cfg.apiKey,
      [cfg.paramSender]: cfg.senderId || "Banglarfish",
      [cfg.paramTo]: number,
      [cfg.paramMsg]: message,
    };
    if (cfg.secretKey) params[cfg.paramSecret] = cfg.secretKey;

    let res: Response;
    if (cfg.method === "GET") {
      const url = new URL(cfg.apiUrl);
      for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
      res = await fetch(url, { method: "GET" });
    } else {
      const body = cfg.contentType === "application/json" ? JSON.stringify(params) : new URLSearchParams(params).toString();
      res = await fetch(cfg.apiUrl, { method: "POST", headers: { "content-type": cfg.contentType }, body });
    }
    const text = (await res.text().catch(() => "")).trim();
    if (!res.ok) return { ok: false, error: `SMS gateway responded ${res.status} ${text.slice(0, 120)}`, info: text.slice(0, 300) };
    return { ok: true, info: text.slice(0, 300) };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "SMS send failed" };
  }
}
