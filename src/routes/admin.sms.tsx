import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { adminGetSms, adminSaveSms, adminTestSms, adminSendSms, adminGetSmsTemplates, adminSaveSmsTemplates, adminGetOrderNotify, adminSaveOrderNotify } from "@/lib/site.functions";
import type { SmsConfig, SmsTemplates, OrderNotifyConfig } from "@/lib/config-types";

const STATUS_KEYS: (keyof OrderNotifyConfig)[] = ["confirmed", "processing", "packed", "shipped", "delivered", "cancelled", "refunded"];
import { MessageSquare, Save, Send, FileText } from "lucide-react";
import { toast } from "sonner";

const SMS_TPL_INFO: { key: keyof SmsTemplates; label: string; vars: string }[] = [
  { key: "otp", label: "OTP / verification code", vars: "{{code}} {{store}}" },
  { key: "orderConfirm", label: "Order confirmation", vars: "{{orderNumber}} {{total}} {{payStatus}} {{store}}" },
  { key: "orderStatus", label: "Order status update", vars: "{{orderNumber}} {{status}} {{store}}" },
];

export const Route = createFileRoute("/admin/sms")({ component: SmsConfigPage });

function hasBengali(s: string): boolean {
  for (let i = 0; i < s.length; i++) if (s.charCodeAt(i) > 127) return true;
  return false;
}

function SmsConfigPage() {
  const getFn = useServerFn(adminGetSms);
  const saveFn = useServerFn(adminSaveSms);
  const testFn = useServerFn(adminTestSms);
  const sendFn = useServerFn(adminSendSms);
  const [cfg, setCfg] = useState<SmsConfig | null>(null);
  const [saving, setSaving] = useState(false);
  const [testPhone, setTestPhone] = useState("");
  const [lastResponse, setLastResponse] = useState("");
  const [smsPhone, setSmsPhone] = useState("");
  const [smsMsg, setSmsMsg] = useState("");
  const [sending, setSending] = useState(false);
  const getTpl = useServerFn(adminGetSmsTemplates);
  const saveTpl = useServerFn(adminSaveSmsTemplates);
  const [tpl, setTpl] = useState<SmsTemplates | null>(null);
  const [tplSaving, setTplSaving] = useState(false);
  const getNotify = useServerFn(adminGetOrderNotify);
  const saveNotify = useServerFn(adminSaveOrderNotify);
  const [notify, setNotify] = useState<OrderNotifyConfig | null>(null);
  const [notifySaving, setNotifySaving] = useState(false);

  useEffect(() => {
    getFn().then(setCfg).catch((e) => toast.error(e instanceof Error ? e.message : "Failed"));
    getTpl().then(setTpl).catch(() => {});
    getNotify().then(setNotify).catch(() => {});
  }, [getFn, getTpl, getNotify]);

  async function saveNotifyCfg() {
    if (!notify) return;
    setNotifySaving(true);
    try { await saveNotify({ data: notify }); toast.success("Notification settings saved"); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
    finally { setNotifySaving(false); }
  }

  async function saveTemplates() {
    if (!tpl) return;
    setTplSaving(true);
    try { await saveTpl({ data: tpl }); toast.success("SMS templates saved"); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
    finally { setTplSaving(false); }
  }

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
    setLastResponse("");
    try {
      const res = await testFn({ data: { phone: testPhone.trim() } });
      if (res.info) setLastResponse(res.info);
      if (res.ok) toast.success("Test SMS sent (or logged in dev mode). Check the phone/console.");
      else toast.error(res.error || "Test failed");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Test failed");
    }
  }

  async function sendCustom() {
    if (!smsPhone.trim() || !smsMsg.trim()) return toast.error("Enter a phone number and a message");
    setSending(true);
    setLastResponse("");
    try {
      const res = await sendFn({ data: { phone: smsPhone.trim(), message: smsMsg.trim() } });
      if (res.info) setLastResponse(res.info);
      if (res.ok) { toast.success(`SMS sent to ${smsPhone.trim()}`); setSmsMsg(""); }
      else toast.error(res.error || "Send failed");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Send failed");
    } finally {
      setSending(false);
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
      <p className="text-sm text-muted-foreground mb-6">Used for signup OTP, password reset, and order notifications (Bengali). Configure your Boomcast SMS gateway.</p>

      <div className="border rounded-2xl p-5 bg-card space-y-4">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={cfg.devMode} onChange={(e) => set({ devMode: e.target.checked })} />
          <span>Developer mode — log OTP/SMS to the server console instead of sending (turn OFF for live)</span>
        </label>
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Provider" value={cfg.provider} onChange={(v) => set({ provider: v as SmsConfig["provider"] })} select options={[["boomcast-web", "Boomcast (boom-cast.com)"], ["boomcast", "Boomcast (legacy)"], ["custom", "Custom HTTP"]]} />
          <Field label="API URL" value={cfg.apiUrl} onChange={(v) => set({ apiUrl: v })} wide />
        </div>

        {cfg.provider === "boomcast-web" ? (
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="User name" value={cfg.userName} onChange={(v) => set({ userName: v })} />
            <Field label="Password / API key" value={cfg.password} onChange={(v) => set({ password: v })} secret />
            <Field label="Masking (NOMASK or approved sender)" value={cfg.masking} onChange={(v) => set({ masking: v })} />
            <div className="text-xs text-muted-foreground self-end pb-2">Bengali messages auto-send as Unicode. Use <code>NOMASK</code> unless you have an approved masking/sender.</div>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Sender ID / Masking" value={cfg.senderId} onChange={(v) => set({ senderId: v })} />
            <Field label="HTTP Method" value={cfg.method} onChange={(v) => set({ method: v as SmsConfig["method"] })} select options={[["GET", "GET"], ["POST", "POST"]]} />
            <Field label="API Key" value={cfg.apiKey} onChange={(v) => set({ apiKey: v })} secret />
            <Field label="Secret Key" value={cfg.secretKey} onChange={(v) => set({ secretKey: v })} secret />
          </div>
        )}
        <div className="grid sm:grid-cols-2 gap-3 pt-1 border-t">
          <Field label="Low-stock alert phone (admin)" value={cfg.alertPhone} onChange={(v) => set({ alertPhone: v })} />
          <div className="text-xs text-muted-foreground self-end pb-2">Get an SMS here when an order drops a product to its low-stock threshold.</div>
        </div>
      </div>

      <details className="border rounded-2xl p-5 bg-card mt-4">
        <summary className="font-semibold cursor-pointer">Advanced: legacy/custom request parameter names</summary>
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

      <div className="border rounded-2xl p-5 bg-card mt-4">
        <h3 className="font-semibold mb-3 flex items-center gap-2"><MessageSquare className="h-4 w-4" /> Send a custom SMS to any user</h3>
        <div className="space-y-2">
          <input value={smsPhone} onChange={(e) => setSmsPhone(e.target.value)} placeholder="Recipient phone (017XXXXXXXX)" className="w-full border rounded-md px-3 py-2 text-sm" />
          <textarea value={smsMsg} onChange={(e) => setSmsMsg(e.target.value)} rows={3} placeholder="আপনার বার্তা লিখুন… (Bengali or English)" className="w-full border rounded-md px-3 py-2 text-sm" />
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-muted-foreground">{smsMsg.length} chars{hasBengali(smsMsg) ? " · Unicode (Bengali)" : ""}</span>
            <button onClick={sendCustom} disabled={sending} className="bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-semibold disabled:opacity-60">{sending ? "Sending…" : "Send SMS"}</button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-2">Tip: you can also send to a specific customer from <strong>Users &amp; Roles</strong> using the SMS button on each row.</p>
      </div>

      {lastResponse && (
        <div className="border rounded-2xl p-4 bg-muted/30 mt-4">
          <p className="text-xs font-semibold text-muted-foreground mb-1">Gateway response</p>
          <pre className="text-xs whitespace-pre-wrap break-all">{lastResponse}</pre>
        </div>
      )}

      {notify && (
        <div className="border rounded-2xl p-5 bg-card mt-4">
          <div className="flex items-center justify-between mb-1">
            <h3 className="font-semibold flex items-center gap-2"><MessageSquare className="h-4 w-4" /> Order-status notifications</h3>
            <button onClick={saveNotifyCfg} disabled={notifySaving} className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-semibold disabled:opacity-60"><Save className="h-4 w-4" /> {notifySaving ? "Saving…" : "Save"}</button>
          </div>
          <p className="text-xs text-muted-foreground mb-3">Choose which order statuses send a notification (SMS + email + WhatsApp) to the customer.</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {STATUS_KEYS.map((k) => (
              <label key={k} className="flex items-center gap-2 text-sm capitalize border rounded-md px-3 py-2"><input type="checkbox" checked={notify[k]} onChange={(e) => setNotify({ ...notify, [k]: e.target.checked })} /> {k}</label>
            ))}
          </div>
        </div>
      )}

      {tpl && (
        <div className="border rounded-2xl p-5 bg-card mt-4">
          <div className="flex items-center justify-between mb-1">
            <h3 className="font-semibold flex items-center gap-2"><FileText className="h-4 w-4" /> SMS templates (Bengali)</h3>
            <button onClick={saveTemplates} disabled={tplSaving} className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-semibold disabled:opacity-60"><Save className="h-4 w-4" /> {tplSaving ? "Saving…" : "Save templates"}</button>
          </div>
          <p className="text-xs text-muted-foreground mb-3">Edit the wording. Use the <code>{"{{variables}}"}</code> shown — they're filled in automatically at send time.</p>
          <div className="space-y-3">
            {SMS_TPL_INFO.map((info) => (
              <label key={info.key} className="block">
                <span className="text-xs font-semibold text-muted-foreground">{info.label} <span className="font-normal">· vars: <code>{info.vars}</code></span></span>
                <textarea value={tpl[info.key]} onChange={(e) => setTpl({ ...tpl, [info.key]: e.target.value })} rows={2} className="mt-1 w-full border rounded-md px-3 py-2 text-sm" />
              </label>
            ))}
          </div>
        </div>
      )}
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
