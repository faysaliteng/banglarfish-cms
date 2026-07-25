import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { adminSetupStatus, type SetupStatus } from "@/lib/admin-setup.functions";
import { adminGetSettings, adminSaveSettings } from "@/lib/admin-content.functions";
import type { Settings } from "@/lib/types";
import { Rocket, Check, Store, Sparkles, Palette, Package, CreditCard, MapPin, ArrowRight, LayoutTemplate, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/setup")({ component: SetupPage });

function SetupPage() {
  const statusFn = useServerFn(adminSetupStatus);
  const getSettingsFn = useServerFn(adminGetSettings);
  const saveSettingsFn = useServerFn(adminSaveSettings);

  const [status, setStatus] = useState<SetupStatus | null>(null);
  const [s, setS] = useState<Settings | null>(null);
  const [saving, setSaving] = useState(false);

  const load = () => {
    statusFn().then(setStatus).catch(() => {});
    getSettingsFn().then(setS).catch(() => {});
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  async function saveBasics(e: React.FormEvent) {
    e.preventDefault();
    if (!s) return;
    setSaving(true);
    try {
      await saveSettingsFn({ data: s });
      toast.success("Store basics saved");
      statusFn().then(setStatus).catch(() => {});
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setSaving(false);
    }
  }

  const steps = status
    ? [
        { done: status.storeConfigured, label: "Store basics & currency", icon: Store, to: "/admin/settings" },
        { done: status.brandingSet, label: "Branding — logo & name", icon: Sparkles, to: "/admin/branding" },
        { done: status.themeChosen, label: "Choose a theme", icon: Palette, to: "/admin/theme" },
        { done: status.hasProducts, label: "Add products (or load demo)", icon: Package, to: "/admin/products" },
        { done: status.paymentsReady, label: "Payment methods", icon: CreditCard, to: "/admin/payments" },
        { done: status.deliverySet, label: "Delivery areas", icon: MapPin, to: "/admin/delivery" },
      ]
    : [];
  const doneCount = steps.filter((x) => x.done).length;
  const pct = steps.length ? Math.round((doneCount / steps.length) * 100) : 0;

  return (
    <div className="pb-16 max-w-4xl">
      <div className="mb-5">
        <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2"><Rocket className="h-6 w-6" /> Setup Wizard</h1>
        <p className="text-sm text-muted-foreground mt-1">Get your store live in a few steps. Follow the checklist — it tracks your progress automatically.</p>
      </div>

      {/* Progress */}
      <div className="bg-card border rounded-2xl p-5 mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="font-semibold text-sm">Setup progress</span>
          <span className="text-sm text-muted-foreground">{doneCount}/{steps.length} · {pct}%</span>
        </div>
        <div className="h-2.5 rounded-full bg-muted overflow-hidden">
          <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: "var(--bf-grad3, linear-gradient(90deg,var(--color-primary),var(--color-brand)))" }} />
        </div>
        {pct === 100 && <p className="text-sm text-emerald-600 font-medium mt-3 flex items-center gap-1.5"><Check className="h-4 w-4" /> All set — your store is ready to go live!</p>}
      </div>

      <div className="grid lg:grid-cols-[1fr_320px] gap-6">
        {/* Step 1 inline: store basics */}
        <div className="bg-card border rounded-2xl p-5">
          <h2 className="font-semibold flex items-center gap-2 mb-1"><Store className="h-5 w-5" /> Store basics &amp; currency</h2>
          <p className="text-sm text-muted-foreground mb-4">Name your store and set your currency — works for any country.</p>
          {!s ? (
            <p className="text-sm text-muted-foreground flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</p>
          ) : (
            <form onSubmit={saveBasics} className="grid sm:grid-cols-2 gap-3">
              <F label="Store name" value={s.storeName} onChange={(v) => setS({ ...s, storeName: v })} />
              <F label="Phone" value={s.storePhone} onChange={(v) => setS({ ...s, storePhone: v })} />
              <F label="Email" value={s.storeEmail} onChange={(v) => setS({ ...s, storeEmail: v })} />
              <F label="Currency code" value={s.currency} onChange={(v) => setS({ ...s, currency: v })} />
              <F label="Currency symbol" value={s.currencySymbol ?? ""} onChange={(v) => setS({ ...s, currencySymbol: v })} />
              <label className="block">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Symbol position</span>
                <select value={s.currencyPosition ?? "before"} onChange={(e) => setS({ ...s, currencyPosition: e.target.value === "after" ? "after" : "before" })} className="mt-1 w-full border rounded-md px-3 py-2 text-sm bg-card">
                  <option value="before">Before — {s.currencySymbol || "$"}100</option>
                  <option value="after">After — 100 {s.currencySymbol || "$"}</option>
                </select>
              </label>
              <F label="Decimal places" type="number" value={String(s.currencyDecimals ?? 0)} onChange={(v) => setS({ ...s, currencyDecimals: Number(v) })} />
              <div className="sm:col-span-2">
                <button disabled={saving} className="bg-primary text-primary-foreground px-5 py-2.5 rounded-md text-sm font-semibold hover:bg-primary/90 disabled:opacity-60">{saving ? "Saving…" : "Save store basics"}</button>
              </div>
            </form>
          )}

          <div className="mt-5 pt-4 border-t">
            <p className="text-sm font-medium mb-2 flex items-center gap-2"><LayoutTemplate className="h-4 w-4" /> Shortcut: start from a demo store</p>
            <p className="text-xs text-muted-foreground mb-2">Load a ready-made vertical (Fashion, Electronics, Grocery, Restaurant…) with theme, currency &amp; demo products in one click.</p>
            <Link to="/admin/starter" className="inline-flex items-center gap-1.5 border rounded-md px-3 py-2 text-sm font-medium hover:bg-muted">Browse starter templates <ArrowRight className="h-4 w-4" /></Link>
          </div>
        </div>

        {/* Checklist */}
        <div className="bg-card border rounded-2xl p-5 h-fit">
          <h2 className="font-semibold mb-3">Checklist</h2>
          <ul className="space-y-2">
            {steps.map((step) => {
              const Icon = step.icon;
              const row = (
                <div className={`flex items-center gap-3 rounded-lg px-3 py-2.5 ${step.done ? "bg-emerald-50" : "hover:bg-muted"}`}>
                  <span className={`grid place-items-center h-6 w-6 rounded-full shrink-0 ${step.done ? "bg-emerald-500 text-white" : "bg-muted text-muted-foreground"}`}>
                    {step.done ? <Check className="h-3.5 w-3.5" /> : <Icon className="h-3.5 w-3.5" />}
                  </span>
                  <span className={`text-sm flex-1 ${step.done ? "text-emerald-700 font-medium" : ""}`}>{step.label}</span>
                  {!step.done && step.to && <ArrowRight className="h-4 w-4 text-muted-foreground" />}
                </div>
              );
              return <li key={step.label}>{step.to ? <Link to={step.to as "/admin"}>{row}</Link> : row}</li>;
            })}
            {!status && <li className="text-sm text-muted-foreground flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</li>}
          </ul>
          <Link to="/" className="mt-4 inline-flex items-center gap-1.5 text-sm text-primary font-semibold hover:underline">View your store <ArrowRight className="h-4 w-4" /></Link>
        </div>
      </div>
    </div>
  );
}

function F({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{label}</span>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} className="mt-1 w-full border rounded-md px-3 py-2 text-sm" />
    </label>
  );
}
