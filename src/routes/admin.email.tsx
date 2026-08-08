import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { adminGetEmail, adminSaveEmail, adminTestEmail, adminGetEmailTemplates, adminSaveEmailTemplates } from "@/lib/site.functions";
import type { EmailConfig, EmailTemplates } from "@/lib/config-types";
import { Mail, Send, Save, FileText } from "lucide-react";
import { toast } from "sonner";

const EMAIL_TPL_INFO: { key: keyof EmailTemplates; label: string; vars: string }[] = [
  { key: "welcome", label: "Welcome (signup)", vars: "{{name}} {{store}} {{url}}" },
  { key: "passwordReset", label: "Password reset", vars: "{{link}} {{store}}" },
  { key: "orderConfirm", label: "Order confirmation", vars: "{{orderNumber}} {{total}} {{payStatus}} {{items}} {{store}} {{url}}" },
  { key: "orderStatus", label: "Order status update", vars: "{{orderNumber}} {{status}} {{store}} {{url}}" },
];

export const Route = createFileRoute("/admin/email")({
  head: () => ({ meta: [{ title: "Email — Admin" }, { name: "robots", content: "noindex" }] }),
  component: EmailPage,
});

function EmailPage() {
  const getFn = useServerFn(adminGetEmail);
  const saveFn = useServerFn(adminSaveEmail);
  const testFn = useServerFn(adminTestEmail);
  const [cfg, setCfg] = useState<EmailConfig | null>(null);
  const [saving, setSaving] = useState(false);
  const [testTo, setTestTo] = useState("");
  const [testing, setTesting] = useState(false);
  const getTpl = useServerFn(adminGetEmailTemplates);
  const saveTpl = useServerFn(adminSaveEmailTemplates);
  const [tpl, setTpl] = useState<EmailTemplates | null>(null);
  const [tplKey, setTplKey] = useState<keyof EmailTemplates>("orderConfirm");
  const [tplSaving, setTplSaving] = useState(false);

  useEffect(() => {
    getFn().then(setCfg).catch((e) => toast.error(e instanceof Error ? e.message : "Failed to load"));
    getTpl().then(setTpl).catch(() => {});
  }, [getFn, getTpl]);

  async function saveTemplates() {
    if (!tpl) return;
    setTplSaving(true);
    try { await saveTpl({ data: tpl }); toast.success("Email templates saved"); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
    finally { setTplSaving(false); }
  }

  const set = <K extends keyof EmailConfig>(k: K, v: EmailConfig[K]) => setCfg((p) => (p ? { ...p, [k]: v } : p));

  async function onSave() {
    if (!cfg) return;
    setSaving(true);
    try { await saveFn({ data: cfg }); toast.success("Email settings saved."); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Save failed"); }
    finally { setSaving(false); }
  }
  async function onTest() {
    if (!testTo.trim()) return toast.error("Enter an address to send the test to.");
    setTesting(true);
    try {
      const res = await testFn({ data: { to: testTo.trim() } });
      if (res.ok) toast.success(`Test email sent to ${testTo}. Check the inbox (and spam).`);
      else toast.error(res.error || "Test failed");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Test failed"); }
    finally { setTesting(false); }
  }

  if (!cfg) return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;

  return (
    <div className="p-6 max-w-3xl">
      <div className="flex items-center gap-3 mb-1">
        <div className="p-2 rounded-lg bg-primary/10 text-primary"><Mail className="h-5 w-5" /></div>
        <h1 className="text-2xl font-bold">Email</h1>
      </div>
      <p className="text-sm text-muted-foreground mb-4">Send password-reset links, welcome emails, and order notifications from your own mail server (no third party). Wording is editable below and under SMS Gateway.</p>

      <div className="mb-6 rounded-2xl border border-primary/30 bg-primary/5 p-4 text-sm">
        <p className="font-semibold mb-1">📖 Mail server &amp; DNS setup guide</p>
        <p className="text-muted-foreground">Full instructions — SPF / DKIM / DMARC records, the MX record for receiving, the in-panel <strong>Inbox / Send</strong> client, and the <strong>Support</strong> login — are in <a href="/admin/docs?doc=email-system" className="text-primary font-medium hover:underline">Help &amp; Docs → Email system, mail server &amp; DKIM</a>. Keep exactly <strong>one</strong> SPF record.</p>
      </div>

      <div className="space-y-5">
        <div className="border rounded-2xl p-5 bg-card space-y-4">
          <label className="flex items-center gap-2 text-sm font-medium">
            <input type="checkbox" checked={cfg.enabled} onChange={(e) => set("enabled", e.target.checked)} /> Enable email sending
          </label>

          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="From name" value={cfg.fromName} onChange={(v) => set("fromName", v)} placeholder="Banglarfish" />
            <Field label="From email" value={cfg.fromEmail} onChange={(v) => set("fromEmail", v)} placeholder="no-reply@banglarfish.com" />
            <Field label="Reply-to (optional)" value={cfg.replyTo} onChange={(v) => set("replyTo", v)} placeholder="support@banglarfish.com" />
            <label className="block text-sm">
              <span className="block mb-1 text-muted-foreground text-xs font-medium">Sending method</span>
              <select value={cfg.mode} onChange={(e) => set("mode", e.target.value as EmailConfig["mode"])} className="w-full border rounded-md px-3 py-2 text-sm bg-card">
                <option value="smtp">SMTP (Brevo / Gmail / any host)</option>
                <option value="resend">Resend API</option>
              </select>
            </label>
          </div>
        </div>

        {cfg.mode === "smtp" ? (
          <div className="border rounded-2xl p-5 bg-card space-y-4">
            <h3 className="font-semibold text-sm">SMTP server</h3>
            <div className="grid sm:grid-cols-2 gap-3">
              <Field label="Host" value={cfg.smtpHost} onChange={(v) => set("smtpHost", v)} placeholder="smtp-relay.brevo.com" />
              <Field label="Port" type="number" value={String(cfg.smtpPort)} onChange={(v) => set("smtpPort", Number(v) || 587)} placeholder="587" />
              <Field label="Username" value={cfg.smtpUser} onChange={(v) => set("smtpUser", v)} placeholder="your SMTP login" />
              <Field label="Password / API key" type="password" value={cfg.smtpPass} onChange={(v) => set("smtpPass", v)} placeholder="••••••••" />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={cfg.smtpSecure} onChange={(e) => set("smtpSecure", e.target.checked)} /> Use SSL (port 465). Leave off for STARTTLS (port 587 — most common).
            </label>
          </div>
        ) : (
          <div className="border rounded-2xl p-5 bg-card space-y-3">
            <h3 className="font-semibold text-sm">Resend API</h3>
            <Field label="API key" type="password" value={cfg.resendApiKey} onChange={(v) => set("resendApiKey", v)} placeholder="re_xxxxxxxx" />
            <p className="text-xs text-muted-foreground">Create a free key at resend.com → API Keys, and verify your domain there (adds DNS records).</p>
          </div>
        )}

        <div className="border rounded-2xl p-5 bg-card space-y-2">
          <h3 className="font-semibold text-sm mb-1">Which emails to send</h3>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={cfg.notifyWelcome} onChange={(e) => set("notifyWelcome", e.target.checked)} /> Welcome email on signup</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={cfg.notifyOrderConfirm} onChange={(e) => set("notifyOrderConfirm", e.target.checked)} /> Order confirmation</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={cfg.notifyOrderStatus} onChange={(e) => set("notifyOrderStatus", e.target.checked)} /> Order status updates</label>
          <p className="text-xs text-muted-foreground pt-1">Password-reset emails always send when email is enabled.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button onClick={onSave} disabled={saving} className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-md text-sm font-semibold disabled:opacity-60"><Save className="h-4 w-4" /> {saving ? "Saving…" : "Save settings"}</button>
        </div>

        <div className="border rounded-2xl p-5 bg-card">
          <h3 className="font-semibold text-sm mb-2">Send a test email</h3>
          <div className="flex flex-wrap gap-2">
            <input value={testTo} onChange={(e) => setTestTo(e.target.value)} type="email" placeholder="you@example.com" className="flex-1 min-w-[220px] border rounded-md px-3 py-2 text-sm" />
            <button onClick={onTest} disabled={testing} className="inline-flex items-center gap-2 border rounded-md px-4 py-2 text-sm font-semibold hover:bg-muted disabled:opacity-60"><Send className="h-4 w-4" /> {testing ? "Sending…" : "Send test"}</button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">Save your settings first, then send a test to confirm everything works.</p>
        </div>

        {tpl && (
          <div className="border rounded-2xl p-5 bg-card">
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-semibold flex items-center gap-2"><FileText className="h-4 w-4" /> Email templates</h3>
              <button onClick={saveTemplates} disabled={tplSaving} className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-semibold disabled:opacity-60"><Save className="h-4 w-4" /> {tplSaving ? "Saving…" : "Save templates"}</button>
            </div>
            <p className="text-xs text-muted-foreground mb-3">Pick a template and edit its subject + body (HTML allowed). It's wrapped in your branded header/footer automatically. Use the <code>{"{{variables}}"}</code> shown.</p>
            <select value={tplKey} onChange={(e) => setTplKey(e.target.value as keyof EmailTemplates)} className="w-full border rounded-md px-3 py-2 text-sm bg-card mb-3">
              {EMAIL_TPL_INFO.map((info) => <option key={info.key} value={info.key}>{info.label}</option>)}
            </select>
            <p className="text-xs text-muted-foreground mb-2">Variables: <code>{EMAIL_TPL_INFO.find((i) => i.key === tplKey)?.vars}</code></p>
            <label className="block mb-3">
              <span className="text-xs font-semibold text-muted-foreground">Subject</span>
              <input value={tpl[tplKey].subject} onChange={(e) => setTpl({ ...tpl, [tplKey]: { ...tpl[tplKey], subject: e.target.value } })} className="mt-1 w-full border rounded-md px-3 py-2 text-sm" />
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-muted-foreground">Body (HTML)</span>
              <textarea value={tpl[tplKey].body} onChange={(e) => setTpl({ ...tpl, [tplKey]: { ...tpl[tplKey], body: e.target.value } })} rows={8} className="mt-1 w-full border rounded-md px-3 py-2 text-sm font-mono" />
            </label>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, type = "text" }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <label className="block text-sm">
      <span className="block mb-1 text-muted-foreground text-xs font-medium">{label}</span>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
    </label>
  );
}
