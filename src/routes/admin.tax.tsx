import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { adminGetTax, adminSaveTax } from "@/lib/site.functions";
import type { TaxConfig, TaxRate, TaxClass } from "@/lib/config-types";
import { Receipt, Save, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/tax")({ component: TaxPage });

const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "class";
const rid = (n: number) => `r${n}-${slugify(String(n))}`;

function TaxPage() {
  const getFn = useServerFn(adminGetTax);
  const saveFn = useServerFn(adminSaveTax);
  const [cfg, setCfg] = useState<TaxConfig | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { getFn().then(setCfg).catch((e) => toast.error(e instanceof Error ? e.message : "Failed")); }, [getFn]);
  if (!cfg) return <p className="text-sm text-muted-foreground">Loading…</p>;

  const set = (patch: Partial<TaxConfig>) => setCfg({ ...cfg, ...patch });

  async function save() {
    if (!cfg) return;
    setSaving(true);
    try { await saveFn({ data: cfg }); toast.success("Tax settings saved"); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
    finally { setSaving(false); }
  }

  function addClass() {
    const name = prompt("New tax class name (e.g. Luxury):");
    if (!name) return;
    const id = slugify(name);
    if (cfg!.classes.some((c) => c.id === id)) { toast.error("A class with that id already exists"); return; }
    set({ classes: [...cfg!.classes, { id, name }] });
  }
  function renameClass(id: string, name: string) {
    set({ classes: cfg!.classes.map((c) => (c.id === id ? { ...c, name } : c)) });
  }
  function removeClass(id: string) {
    if (id === "standard") { toast.error("The Standard class can't be removed"); return; }
    set({ classes: cfg!.classes.filter((c) => c.id !== id), rates: cfg!.rates.filter((r) => r.classId !== id) });
  }

  function addRate() {
    const n = cfg!.rates.length + 1;
    const newRate: TaxRate = { id: rid(Date.now() % 100000 + n), name: "VAT", classId: cfg!.classes[0]?.id ?? "standard", region: "*", rate: 0, priority: 1, compound: false };
    set({ rates: [...cfg!.rates, newRate] });
  }
  function updateRate(id: string, patch: Partial<TaxRate>) {
    set({ rates: cfg!.rates.map((r) => (r.id === id ? { ...r, ...patch } : r)) });
  }
  function removeRate(id: string) { set({ rates: cfg!.rates.filter((r) => r.id !== id) }); }

  return (
    <div className="pb-16">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-1">
        <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2"><Receipt className="h-6 w-6" /> Tax Engine</h1>
        <button onClick={save} disabled={saving} className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-md font-semibold hover:bg-primary/90 disabled:opacity-60"><Save className="h-4 w-4" /> {saving ? "Saving…" : "Save"}</button>
      </div>
      <p className="text-sm text-muted-foreground mb-6">WooCommerce-style tax: define <strong>tax classes</strong>, assign them to products, and add <strong>rates</strong> per region. When disabled, the simple flat rate in Settings is used instead.</p>

      <div className="border rounded-2xl p-5 bg-card mb-5 space-y-3">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={cfg.enabled} onChange={(e) => set({ enabled: e.target.checked })} />
          <span>Enable the advanced tax engine</span>
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={cfg.pricesIncludeTax} onChange={(e) => set({ pricesIncludeTax: e.target.checked })} />
          <span>Product prices already <strong>include</strong> tax (extract instead of add on top)</span>
        </label>
      </div>

      <div className="border rounded-2xl p-5 bg-card mb-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold">Tax classes</h3>
          <button onClick={addClass} className="inline-flex items-center gap-1 text-sm px-3 py-1.5 rounded-md border hover:bg-muted"><Plus className="h-4 w-4" /> Add class</button>
        </div>
        <div className="space-y-2">
          {cfg.classes.map((c: TaxClass) => (
            <div key={c.id} className="flex items-center gap-2">
              <input value={c.name} onChange={(e) => renameClass(c.id, e.target.value)} className="border rounded-md px-3 py-1.5 text-sm flex-1" />
              <code className="text-xs text-muted-foreground w-28 truncate">{c.id}</code>
              <button onClick={() => removeClass(c.id)} disabled={c.id === "standard"} className="p-1.5 rounded hover:bg-muted text-destructive disabled:opacity-30" title="Remove"><Trash2 className="h-4 w-4" /></button>
            </div>
          ))}
        </div>
      </div>

      <div className="border rounded-2xl p-5 bg-card">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold">Tax rates</h3>
          <button onClick={addRate} className="inline-flex items-center gap-1 text-sm px-3 py-1.5 rounded-md border hover:bg-muted"><Plus className="h-4 w-4" /> Add rate</button>
        </div>
        {cfg.rates.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">No rates yet. Add one — e.g. name “VAT”, class “Standard”, region “*”, rate 15%.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[720px]">
              <thead>
                <tr className="text-left text-muted-foreground border-b">
                  <th className="py-2 pr-2">Name</th><th className="pr-2">Class</th><th className="pr-2">Region</th><th className="pr-2">Rate %</th><th className="pr-2">Priority</th><th className="pr-2">Compound</th><th></th>
                </tr>
              </thead>
              <tbody>
                {cfg.rates.map((r) => (
                  <tr key={r.id} className="border-b last:border-0">
                    <td className="py-2 pr-2"><input value={r.name} onChange={(e) => updateRate(r.id, { name: e.target.value })} className="border rounded px-2 py-1 w-full" /></td>
                    <td className="pr-2">
                      <select value={r.classId} onChange={(e) => updateRate(r.id, { classId: e.target.value })} className="border rounded px-2 py-1 bg-card">
                        {cfg.classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </td>
                    <td className="pr-2"><input value={r.region} onChange={(e) => updateRate(r.id, { region: e.target.value })} placeholder="* or city/state" className="border rounded px-2 py-1 w-28" /></td>
                    <td className="pr-2"><input type="number" step="0.01" value={r.rate} onChange={(e) => updateRate(r.id, { rate: Number(e.target.value) || 0 })} className="border rounded px-2 py-1 w-20" /></td>
                    <td className="pr-2"><input type="number" value={r.priority} onChange={(e) => updateRate(r.id, { priority: Number(e.target.value) || 1 })} className="border rounded px-2 py-1 w-16" /></td>
                    <td className="pr-2 text-center"><input type="checkbox" checked={r.compound} onChange={(e) => updateRate(r.id, { compound: e.target.checked })} /></td>
                    <td><button onClick={() => removeRate(r.id)} className="p-1.5 rounded hover:bg-muted text-destructive"><Trash2 className="h-4 w-4" /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="text-xs text-muted-foreground mt-3">Region matching is case-insensitive and matches the buyer's city / district / postcode. Use <code>*</code> for everywhere. Compound rates are calculated on the running total (line + earlier taxes).</p>
      </div>
    </div>
  );
}
