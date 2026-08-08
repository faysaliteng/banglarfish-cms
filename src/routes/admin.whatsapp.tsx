import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { adminGetWhatsApp, adminSaveWhatsApp, adminTestWhatsApp } from "@/lib/site.functions";
import type { WhatsAppConfig } from "@/lib/config-types";
import { MessageCircle, Save, Send, BookOpen } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/whatsapp")({
  head: () => ({ meta: [{ title: "WhatsApp — Admin" }, { name: "robots", content: "noindex" }] }),
  component: WhatsAppPage,
});

function WhatsAppPage() {
  const getFn = useServerFn(adminGetWhatsApp);
  const saveFn = useServerFn(adminSaveWhatsApp);
  const testFn = useServerFn(adminTestWhatsApp);
  const [cfg, setCfg] = useState<WhatsAppConfig | null>(null);
  const [saving, setSaving] = useState(false);
  const [testTo, setTestTo] = useState("");
  const [resp, setResp] = useState("");

  useEffect(() => { getFn().then(setCfg).catch((e) => toast.error(e instanceof Error ? e.message : "Failed")); }, [getFn]);
  if (!cfg) return <p className="p-6 text-sm text-muted-foreground">Loading…</p>;
  const set = (p: Partial<WhatsAppConfig>) => setCfg({ ...cfg, ...p });

  async function save() {
    if (!cfg) return;
    setSaving(true);
    try { await saveFn({ data: cfg }); toast.success("WhatsApp settings saved"); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); } finally { setSaving(false); }
  }
  async function test() {
    if (!testTo.trim()) return toast.error("Enter a WhatsApp number");
    setResp("");
    try {
      const r = await testFn({ data: { to: testTo.trim(), template: cfg?.mode === "template" ? cfg.orderTemplate : "" } });
      if (r.info) setResp(r.info);
      if (r.ok) toast.success("Sent — check WhatsApp on that number."); else toast.error(r.error || "Failed");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
  }

  return (
    <div className="p-6 max-w-3xl pb-16">
      <div className="flex items-center justify-between gap-3 mb-1">
        <h1 className="text-2xl font-bold flex items-center gap-2"><MessageCircle className="h-6 w-6 text-emerald-600" /> WhatsApp</h1>
        <button onClick={save} disabled={saving} className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-md font-semibold disabled:opacity-60"><Save className="h-4 w-4" /> {saving ? "Saving…" : "Save"}</button>
      </div>
      <p className="text-sm text-muted-foreground mb-4">Auto-send order confirmations &amp; status updates on WhatsApp via the free Meta WhatsApp Cloud API. Business-initiated messages need a Meta-approved <strong>message template</strong> (see the guide below).</p>

      <div className="border rounded-2xl p-5 bg-card space-y-4">
        <label className="flex items-center gap-2 text-sm font-medium"><input type="checkbox" checked={cfg.enabled} onChange={(e) => set({ enabled: e.target.checked })} /> Enable WhatsApp notifications</label>
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Phone Number ID" value={cfg.phoneNumberId} onChange={(v) => set({ phoneNumberId: v })} placeholder="from Meta → WhatsApp → API Setup" />
          <Field label="Access Token" value={cfg.accessToken} onChange={(v) => set({ accessToken: v })} secret placeholder="permanent token" />
          <Field label="API version" value={cfg.apiVersion} onChange={(v) => set({ apiVersion: v })} placeholder="v21.0" />
          <label className="block text-sm"><span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Mode</span>
            <select value={cfg.mode} onChange={(e) => set({ mode: e.target.value as WhatsAppConfig["mode"] })} className="mt-1 w-full border rounded-md px-3 py-2 text-sm bg-card">
              <option value="template">Template (for real order alerts)</option>
              <option value="text">Plain text (testing / 24h window only)</option>
            </select>
          </label>
        </div>
        {cfg.mode === "template" && (
          <div className="grid sm:grid-cols-3 gap-3">
            <Field label="Language code" value={cfg.langCode} onChange={(v) => set({ langCode: v })} placeholder="en" />
            <Field label="Order-confirm template" value={cfg.orderTemplate} onChange={(v) => set({ orderTemplate: v })} placeholder="order_confirmation" />
            <Field label="Order-status template" value={cfg.statusTemplate} onChange={(v) => set({ statusTemplate: v })} placeholder="order_status" />
          </div>
        )}
        <div className="flex flex-wrap gap-4 text-sm">
          <label className="flex items-center gap-2"><input type="checkbox" checked={cfg.notifyOrderConfirm} onChange={(e) => set({ notifyOrderConfirm: e.target.checked })} /> Send order confirmations</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={cfg.notifyOrderStatus} onChange={(e) => set({ notifyOrderStatus: e.target.checked })} /> Send status updates</label>
        </div>
      </div>

      <div className="border rounded-2xl p-5 bg-card mt-4">
        <h3 className="font-semibold mb-3 flex items-center gap-2"><Send className="h-4 w-4" /> Send a test</h3>
        <div className="flex gap-2">
          <input value={testTo} onChange={(e) => setTestTo(e.target.value)} placeholder="Recipient WhatsApp number" className="flex-1 border rounded-md px-3 py-2 text-sm" />
          <button onClick={test} className="bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-semibold">Send test</button>
        </div>
        {resp && <pre className="text-xs whitespace-pre-wrap break-all mt-2 bg-muted/40 rounded p-2">{resp}</pre>}
        <p className="text-xs text-muted-foreground mt-2">Save first. In text mode, the recipient must have messaged your business number in the last 24h. In template mode, uses your order-confirm template with sample values.</p>
      </div>

      <details className="mt-4 border rounded-xl bg-muted/20 group">
        <summary className="cursor-pointer select-none px-4 py-3 font-semibold text-sm flex items-center gap-2 hover:bg-muted/40"><BookOpen className="h-4 w-4 text-primary" /> 📖 How to set up WhatsApp (free Meta Cloud API)</summary>
        <div className="px-4 pb-4 text-sm text-muted-foreground space-y-2 leading-relaxed">
          <p><strong>1.</strong> Go to developers.facebook.com → your app → add the <strong>WhatsApp</strong> product (you can use the same business app).</p>
          <p><strong>2.</strong> WhatsApp → <strong>API Setup</strong>: note the <strong>Phone number ID</strong>. Add + verify a sender phone number (or use the free test number to start).</p>
          <p><strong>3.</strong> Create a <strong>permanent access token</strong> (System User in Meta Business Settings → assign the app → generate token with <code>whatsapp_business_messaging</code>). Paste Phone Number ID + token above.</p>
          <p><strong>4.</strong> WhatsApp → <strong>Message templates</strong> → create a template, e.g. name <code>order_confirmation</code>, category <em>Utility</em>, body: <em>"Your order {"{{1}}"} of ৳{"{{2}}"} is confirmed. Thank you!"</em> (2 variables). Do the same for a status template with 2 variables (order #, status). Wait for Meta approval (usually minutes–hours).</p>
          <p><strong>5.</strong> Put those template names above, set Mode = Template, tick Enable, Save. Order alerts now go out on WhatsApp automatically.</p>
          <p className="text-amber-700"><strong>Note:</strong> Meta requires approved templates for business-initiated messages; you can't send free-form text to customers who haven't messaged you first. The free tier includes a generous number of conversations per month.</p>
        </div>
      </details>
    </div>
  );
}

function Field({ label, value, onChange, secret, placeholder }: { label: string; value: string; onChange: (v: string) => void; secret?: boolean; placeholder?: string }) {
  return (
    <label className="block text-sm">
      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{label}</span>
      <input type={secret ? "password" : "text"} value={value} onChange={(e) => onChange(e.target.value)} autoComplete="off" placeholder={placeholder} className="mt-1 w-full border rounded-md px-3 py-2 text-sm font-mono" />
    </label>
  );
}
