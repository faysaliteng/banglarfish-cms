import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { adminGetSms, adminSaveSms, adminTestSms } from "@/lib/site.functions";
import type { SmsConfig } from "@/lib/config-types";
import { MessageSquare, Save, Send } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/sms")({ component: SmsConfigPage });

function SmsConfigPage() {
  const getFn = useServerFn(adminGetSms);
  const saveFn = useServerFn(adminSaveSms);
  const testFn = useServerFn(adminTestSms);
  const [cfg, setCfg] = useState<SmsConfig | null>(null);
  const [saving, setSaving] = useState(false);
  const [testPhone, setTestPhone] = useState("");

  useEffect(() => {
    getFn().then(setCfg).catch((e) => toast.error(e instanceof Error ? e.message : "Failed"));
  }, [getFn]);

  if (!cfg) return <p className="text-sm text-muted-foreground">Loading…</p>;

  const set = (patch: Partial<SmsConfig>) => setCfg({ ...cfg, ...patch });

  async function save() {
    if (!cfg) return;
    setSaving(true);
    try {
      await saveFn({ data: cfg });
      toast.success("SMS gateway saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function test() {
    if (!testPhone.trim()) return toast.error("Enter a phone number to test");
    try {
      const res = await testFn({ data: { phone: testPhone.trim() } });
      if (res.ok) toast.success("Test SMS sent (or logged in dev mode). Check the phone/console.");
      else toast.error(res.error || "Test failed");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Test failed");
    }
  }

  return (
    <div className="pb-16 max-w-3xl">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-1">
        <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2 min-w-0"><MessageSquare className="h-6 w-6 shrink-0" /> SMS Gateway</h1>
        <button onClick={save} disabled={saving} className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-md font-semibold hover:bg-primary/90 disabled:opacity-60">
          <Save className="h-4 w-4" /> {saving ? "Saving…" : "Save"}
        </button>
      </div>
      <p className="text-sm text-muted-foreground mb-6">Used for signup OTP verification and order notifications. Configure your Boomcast (or any HTTP) SMS gateway.</p>

      <div className="border rounded-2xl p-5 bg-card space-y-4">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={cfg.devMode} onChange={(e) => set({ devMode: e.target.checked })} />
          <span>Developer mode — log OTP/SMS to the server console instead of sending (turn OFF for live)</span>
        </label>
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Provider" value={cfg.provider} onChange={(v) => set({ provider: v as SmsConfig["provider"] })} select options={[["boomcast", "Boomcast"], ["custom", "Custom HTTP"]]} />
          <Field label="Sender ID / Masking" value={cfg.senderId} onChange={(v) => set({ senderId: v })} />
          <Field label="API URL" value={cfg.apiUrl} onChange={(v) => set({ apiUrl: v })} wide />
          <Field label="HTTP Method" value={cfg.method} onChange={(v) => set({ method: v as SmsConfig["method"] })} select options={[["GET", "GET"], ["POST", "POST"]]} />
          <Field label="API Key" value={cfg.apiKey} onChange={(v) => set({ apiKey: v })} secret />
          <Field label="Secret Key" value={cfg.secretKey} onChange={(v) => set({ secretKey: v })} secret />
        </div>
      </div>

      <details className="border rounded-2xl p-5 bg-card mt-4">
        <summary className="font-semibold cursor-pointer">Advanced: request parameter names</summary>
        <div className="grid sm:grid-cols-3 gap-3 mt-4">
          <Field label="API key param" value={cfg.paramApikey} onChange={(v) => set({ paramApikey: v })} />
          <Field label="Secret param" value={cfg.paramSecret} onChange={(v) => set({ paramSecret: v })} />
          <Field label="Sender param" value={cfg.paramSender} onChange={(v) => set({ paramSender: v })} />
          <Field label="Recipient param" value={cfg.paramTo} onChange={(v) => set({ paramTo: v })} />
          <Field label="Message param" value={cfg.paramMsg} onChange={(v) => set({ paramMsg: v })} />
          <Field label="POST content-type" value={cfg.contentType} onChange={(v) => set({ contentType: v })} />
        </div>
      </details>

      <div className="border rounded-2xl p-5 bg-card mt-4">
        <h3 className="font-semibold mb-3 flex items-center gap-2"><Send className="h-4 w-4" /> Send a test SMS</h3>
        <div className="flex gap-2">
          <input value={testPhone} onChange={(e) => setTestPhone(e.target.value)} placeholder="017XXXXXXXX" className="flex-1 border rounded-md px-3 py-2 text-sm" />
          <button onClick={test} className="bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-semibold">Send test</button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">Save your settings first. In dev mode the message is logged to the server console.</p>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, secret, wide, select, options }: { label: string; value: string; onChange: (v: string) => void; secret?: boolean; wide?: boolean; select?: boolean; options?: [string, string][] }) {
  return (
    <label className={`block ${wide ? "sm:col-span-2" : ""}`}>
      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{label}</span>
      {select ? (
        <select value={value} onChange={(e) => onChange(e.target.value)} className="mt-1 w-full border rounded-md px-3 py-2 text-sm bg-card">
          {(options ?? []).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      ) : (
        <input type={secret ? "password" : "text"} value={value} onChange={(e) => onChange(e.target.value)} autoComplete="off" className="mt-1 w-full border rounded-md px-3 py-2 text-sm font-mono" />
      )}
    </label>
  );
}
