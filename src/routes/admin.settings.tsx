import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { Save } from "lucide-react";
import { toast } from "sonner";
import type { Settings } from "@/lib/types";
import { adminGetSettings, adminSaveSettings } from "@/lib/admin-content.functions";

export const Route = createFileRoute("/admin/settings")({ component: SettingsPage });

function SettingsPage() {
  const getSettings = useServerFn(adminGetSettings);
  const saveSettings = useServerFn(adminSaveSettings);

  const [s, setS] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const data = await getSettings();
        if (mounted) setS(data);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const set = <K extends keyof Settings>(k: K, v: Settings[K]) =>
    setS((prev) => (prev ? { ...prev, [k]: v } : prev));

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!s) return;
    setSaving(true);
    try {
      await saveSettings({ data: s });
      toast.success("Settings saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="text-sm text-muted-foreground">Loading settings…</div>;
  }
  if (!s) {
    return <div className="text-sm text-muted-foreground">Failed to load settings.</div>;
  }

  return (
    <form onSubmit={save}>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Store Settings</h1>
          <p className="text-sm text-muted-foreground">Configure your Banglarfish storefront</p>
        </div>
        <div className="flex gap-2">
          <button
            disabled={saving}
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2 rounded-md text-sm font-semibold disabled:opacity-60"
          >
            <Save className="h-4 w-4" /> {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6 max-w-5xl">
        <Card title="Store Information">
          <Field label="Store name" value={s.storeName} onChange={(v) => set("storeName", v)} />
          <Field label="Store email" value={s.storeEmail} onChange={(v) => set("storeEmail", v)} />
          <Field label="Store phone" value={s.storePhone} onChange={(v) => set("storePhone", v)} />
          <Field label="Address" value={s.address} onChange={(v) => set("address", v)} />
          <Field label="WhatsApp number (order button)" value={s.whatsappNumber ?? ""} onChange={(v) => set("whatsappNumber", v)} placeholder="Leave blank to use the store phone" />
          <Field label="WhatsApp greeting" value={s.whatsappGreeting ?? ""} onChange={(v) => set("whatsappGreeting", v)} placeholder="Assalamu alaikum, I want to order:" />
          <Field label="Product page note" value={s.productNote ?? ""} onChange={(v) => set("productNote", v)} placeholder="ওজন গ্রাম হিসেবে কম/ বেশি হলে মূল বিল কিছু কমতে/ বাড়তে পারে" />
          <Field label="Currency code (USD, EUR, BDT…)" value={s.currency} onChange={(v) => set("currency", v)} />
          <Field label="Currency symbol ($, €, ৳)" value={s.currencySymbol ?? ""} onChange={(v) => set("currencySymbol", v)} />
          <label className="block">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Symbol position</span>
            <select value={s.currencyPosition ?? "before"} onChange={(e) => set("currencyPosition", e.target.value === "after" ? "after" : "before")} className="mt-1 w-full border rounded-md px-3 py-2 text-sm bg-card">
              <option value="before">Before — {s.currencySymbol || "$"}100</option>
              <option value="after">After — 100 {s.currencySymbol || "$"}</option>
            </select>
          </label>
          <Field label="Decimal places (0 or 2)" type="number" value={String(s.currencyDecimals ?? 0)} onChange={(v) => set("currencyDecimals", Number(v))} />
          <Field label="Thousands separator" value={s.currencyThousandSep ?? ","} onChange={(v) => set("currencyThousandSep", v)} />
        </Card>

        <Card title="Announcement Bar">
          <p className="text-sm text-muted-foreground">
            The announcement bar text is part of your branding, so it is edited there and applies immediately.
          </p>
          <a href="/admin/branding" className="inline-block mt-2 text-sm font-semibold text-primary hover:underline">Open Branding →</a>
        </Card>

        <Card title="Delivery">
          <Field label="Free delivery threshold (৳)" type="number" value={String(s.freeShippingThreshold)} onChange={(v) => set("freeShippingThreshold", Number(v))} />
          <Field label="Standard delivery charge (৳)" type="number" value={String(s.standardShipping)} onChange={(v) => set("standardShipping", Number(v))} />
          <Field label="Tax / VAT (%)" type="number" value={String(s.taxPercent)} onChange={(v) => set("taxPercent", Number(v))} />
        </Card>

        <Card title="Payment Gateways">
          <p className="text-sm text-muted-foreground">
            Payment methods, credentials and live/sandbox mode are managed on their own page so there is a single source of truth.
          </p>
          <a href="/admin/payments" className="inline-block mt-2 text-sm font-semibold text-primary hover:underline">Open Payment Gateways →</a>
        </Card>

        <Card title="Social Links">
          <Field label="Facebook URL" value={s.facebook} onChange={(v) => set("facebook", v)} />
          <Field label="Instagram URL" value={s.instagram} onChange={(v) => set("instagram", v)} />
          <Field label="YouTube URL" value={s.youtube} onChange={(v) => set("youtube", v)} />
        </Card>

        <Card title="SEO Defaults">
          <p className="text-sm text-muted-foreground">
            Site title templates, meta defaults, social cards and verification codes live in the SEO engine.
          </p>
          <a href="/admin/seo" className="inline-block mt-2 text-sm font-semibold text-primary hover:underline">Open SEO Engine →</a>
        </Card>
      </div>
    </form>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-card border rounded-xl p-5">
      <h3 className="font-semibold mb-4">{title}</h3>
      <div className="space-y-3">{children}</div>
    </div>
  );
}
function Field({ label, value, onChange, type = "text", placeholder }: { label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{label}</span>
      <input type={type} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className="mt-1 w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
    </label>
  );
}
function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between py-1.5 cursor-pointer">
      <span className="text-sm">{label}</span>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4" />
    </label>
  );
}
