// SMS gateway sender. Reads gateway config from the DB (admin-editable) with env
// fallback. When devMode is on (or no API key), the code is logged instead of sent.
import { getSmsConfig } from "@/server/site-config";

export function normalizeBdPhone(input: string): string {
  const digits = input.replace(/\D/g, "");
  if (digits.startsWith("880")) return digits;
  if (digits.startsWith("0")) return "88" + digits;
  if (digits.startsWith("1")) return "880" + digits;
  return digits;
}

export async function sendSms(to: string, message: string): Promise<{ ok: boolean; error?: string }> {
  const number = normalizeBdPhone(to);
  const cfg = await getSmsConfig();

  if (cfg.devMode || !cfg.apiKey) {
    console.log(`[SMS:dev] to=${number} :: ${message}`);
    return { ok: true };
  }

  try {
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
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return { ok: false, error: `SMS gateway responded ${res.status} ${text.slice(0, 120)}` };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "SMS send failed" };
  }
}
