import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { adminGetPayments, adminSavePayments } from "@/lib/site.functions";
import type { PaymentConfig } from "@/lib/config-types";
import { CreditCard, Save, Smartphone, Banknote, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/payments")({ component: PaymentsConfig });

function PaymentsConfig() {
  const getFn = useServerFn(adminGetPayments);
  const saveFn = useServerFn(adminSavePayments);
  const [cfg, setCfg] = useState<PaymentConfig | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getFn().then(setCfg).catch((e) => toast.error(e instanceof Error ? e.message : "Failed"));
  }, [getFn]);

  if (!cfg) return <p className="text-sm text-muted-foreground">Loading…</p>;

  async function save() {
    if (!cfg) return;
    setSaving(true);
    try {
      await saveFn({ data: cfg });
      toast.success("Payment settings saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="pb-16 max-w-4xl">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-1">
        <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2 min-w-0"><CreditCard className="h-6 w-6 shrink-0" /> Payment Gateways</h1>
        <button onClick={save} disabled={saving} className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-md font-semibold hover:bg-primary/90 disabled:opacity-60">
          <Save className="h-4 w-4" /> {saving ? "Saving…" : "Save"}
        </button>
      </div>
      <p className="text-sm text-muted-foreground mb-6">Configure Bangladeshi payment gateways. Credentials are stored securely in your database and used by the checkout.</p>

      <div className="border rounded-2xl p-5 bg-card mb-5">
        <label className="block max-w-xs">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Gateway mode</span>
          <select value={cfg.mode} onChange={(e) => setCfg({ ...cfg, mode: e.target.value as PaymentConfig["mode"] })} className="mt-1 w-full border rounded-md px-3 py-2 text-sm bg-card">
            <option value="simulate">Simulate (test without credentials)</option>
            <option value="sandbox">Sandbox (gateway test credentials)</option>
            <option value="live">Live (real payments)</option>
          </select>
        </label>
        <p className="text-xs text-muted-foreground mt-2">
          {cfg.mode === "simulate" && "Orders go through a mock gateway — perfect for testing the full checkout flow."}
          {cfg.mode === "sandbox" && "Uses the gateways' sandbox/test endpoints with the credentials below."}
          {cfg.mode === "live" && "Real money will be collected. Make sure credentials are correct."}
        </p>
      </div>

      <Gateway title="Cash on Delivery" icon={Banknote} enabled={cfg.cod.enabled} onToggle={(v) => setCfg({ ...cfg, cod: { ...cfg.cod, enabled: v } })}>
        <Field label="Instructions shown to customer" value={cfg.cod.instructions} onChange={(v) => setCfg({ ...cfg, cod: { ...cfg.cod, instructions: v } })} />
      </Gateway>

      <Gateway title="bKash (Tokenized Checkout)" icon={Smartphone} enabled={cfg.bkash.enabled} onToggle={(v) => setCfg({ ...cfg, bkash: { ...cfg.bkash, enabled: v } })}>
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="App Key" value={cfg.bkash.appKey} onChange={(v) => setCfg({ ...cfg, bkash: { ...cfg.bkash, appKey: v } })} />
          <Field label="App Secret" value={cfg.bkash.appSecret} onChange={(v) => setCfg({ ...cfg, bkash: { ...cfg.bkash, appSecret: v } })} secret />
          <Field label="Username" value={cfg.bkash.username} onChange={(v) => setCfg({ ...cfg, bkash: { ...cfg.bkash, username: v } })} />
          <Field label="Password" value={cfg.bkash.password} onChange={(v) => setCfg({ ...cfg, bkash: { ...cfg.bkash, password: v } })} secret />
        </div>
        <p className="text-xs text-muted-foreground mt-2">Get these from your bKash merchant account at developer.bka.sh.</p>
      </Gateway>

      <Gateway title="Nagad" icon={Smartphone} enabled={cfg.nagad.enabled} onToggle={(v) => setCfg({ ...cfg, nagad: { ...cfg.nagad, enabled: v } })}>
        <div className="grid gap-3">
          <Field label="Merchant ID" value={cfg.nagad.merchantId} onChange={(v) => setCfg({ ...cfg, nagad: { ...cfg.nagad, merchantId: v } })} />
          <Field label="Merchant Private Key" value={cfg.nagad.merchantPrivateKey} onChange={(v) => setCfg({ ...cfg, nagad: { ...cfg.nagad, merchantPrivateKey: v } })} secret />
          <Field label="Nagad PG Public Key" value={cfg.nagad.pgPublicKey} onChange={(v) => setCfg({ ...cfg, nagad: { ...cfg.nagad, pgPublicKey: v } })} secret />
        </div>
      </Gateway>

      <Gateway title="SSLCommerz (Cards / MFS aggregator)" icon={ShieldCheck} enabled={cfg.sslcommerz.enabled} onToggle={(v) => setCfg({ ...cfg, sslcommerz: { ...cfg.sslcommerz, enabled: v } })}>
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Store ID" value={cfg.sslcommerz.storeId} onChange={(v) => setCfg({ ...cfg, sslcommerz: { ...cfg.sslcommerz, storeId: v } })} />
          <Field label="Store Password" value={cfg.sslcommerz.storePasswd} onChange={(v) => setCfg({ ...cfg, sslcommerz: { ...cfg.sslcommerz, storePasswd: v } })} secret />
        </div>
        <p className="text-xs text-muted-foreground mt-2">Get these from your SSLCommerz merchant panel at developer.sslcommerz.com.</p>
      </Gateway>
    </div>
  );
}

function Gateway({ title, icon: Icon, enabled, onToggle, children }: { title: string; icon: typeof CreditCard; enabled: boolean; onToggle: (v: boolean) => void; children: React.ReactNode }) {
  return (
    <div className="border rounded-2xl p-5 bg-card mb-4">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <h3 className="font-semibold flex items-center gap-2 min-w-0"><Icon className="h-5 w-5 text-primary shrink-0" /> {title}</h3>
        <label className="flex items-center gap-2 text-sm shrink-0">
          <input type="checkbox" checked={enabled} onChange={(e) => onToggle(e.target.checked)} /> Enabled
        </label>
      </div>
      {enabled && <div>{children}</div>}
    </div>
  );
}

function Field({ label, value, onChange, secret }: { label: string; value: string; onChange: (v: string) => void; secret?: boolean }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{label}</span>
      <input type={secret ? "password" : "text"} value={value} onChange={(e) => onChange(e.target.value)} autoComplete="off" className="mt-1 w-full border rounded-md px-3 py-2 text-sm font-mono" />
    </label>
  );
}
