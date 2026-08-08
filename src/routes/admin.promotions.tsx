import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { adminGetPromotions, adminSavePromotions } from "@/lib/site.functions";
import type { PromotionsConfig, Promotion } from "@/lib/config-types";
import { BadgePercent, Save, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/promotions")({ component: PromotionsPage });

function PromotionsPage() {
  const getFn = useServerFn(adminGetPromotions);
  const saveFn = useServerFn(adminSavePromotions);
  const [cfg, setCfg] = useState<PromotionsConfig | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { getFn().then(setCfg).catch((e) => toast.error(e instanceof Error ? e.message : "Failed")); }, [getFn]);
  if (!cfg) return <p className="text-sm text-muted-foreground">Loading…</p>;

  const update = (id: string, patch: Partial<Promotion>) => setCfg({ ...cfg, promos: cfg.promos.map((p) => (p.id === id ? { ...p, ...patch } : p)) });
  const add = () => setCfg({ ...cfg, promos: [...cfg.promos, { id: `p${cfg.promos.length + 1}-${Math.round(Math.random() * 1e6)}`, name: "New promotion", active: true, minSubtotal: 0, action: "percent", value: 10 }] });
  const remove = (id: string) => setCfg({ ...cfg, promos: cfg.promos.filter((p) => p.id !== id) });
  async function save() { setSaving(true); try { await saveFn({ data: cfg! }); toast.success("Promotions saved"); } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); } finally { setSaving(false); } }

  return (
    <div className="pb-16 max-w-3xl">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-1">
        <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2"><BadgePercent className="h-6 w-6" /> Promotions</h1>
        <div className="flex gap-2">
          <button onClick={add} className="inline-flex items-center gap-1 text-sm px-3 py-1.5 rounded-md border hover:bg-muted"><Plus className="h-4 w-4" /> Add</button>
          <button onClick={save} disabled={saving} className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-md font-semibold disabled:opacity-60"><Save className="h-4 w-4" /> {saving ? "Saving…" : "Save"}</button>
        </div>
      </div>
      <p className="text-sm text-muted-foreground mb-6">Automatic cart discounts — no coupon code needed. Applied at checkout when conditions match (the best % / fixed discount wins; free-shipping stacks). For code-based discounts use <strong>Coupons</strong>.</p>

      <div className="space-y-3">
        {cfg.promos.map((p) => (
          <div key={p.id} className="border rounded-2xl p-4 bg-card grid sm:grid-cols-[1fr_130px_130px_110px_auto] gap-3 items-end">
            <label className="block"><span className="text-xs font-semibold text-muted-foreground uppercase">Name</span><input value={p.name} onChange={(e) => update(p.id, { name: e.target.value })} className="mt-1 w-full border rounded-md px-3 py-2 text-sm" /></label>
            <label className="block"><span className="text-xs font-semibold text-muted-foreground uppercase">Min subtotal ৳</span><input type="number" value={p.minSubtotal} onChange={(e) => update(p.id, { minSubtotal: Number(e.target.value) || 0 })} className="mt-1 w-full border rounded-md px-3 py-2 text-sm" /></label>
            <label className="block"><span className="text-xs font-semibold text-muted-foreground uppercase">Action</span>
              <select value={p.action} onChange={(e) => update(p.id, { action: e.target.value as Promotion["action"] })} className="mt-1 w-full border rounded-md px-2 py-2 text-sm bg-card">
                <option value="percent">% off</option><option value="fixed">৳ off</option><option value="free_shipping">Free ship</option>
              </select>
            </label>
            <label className="block"><span className="text-xs font-semibold text-muted-foreground uppercase">Value</span><input type="number" value={p.value} disabled={p.action === "free_shipping"} onChange={(e) => update(p.id, { value: Number(e.target.value) || 0 })} className="mt-1 w-full border rounded-md px-3 py-2 text-sm disabled:opacity-40" /></label>
            <div className="flex items-center gap-2 pb-2">
              <label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={p.active} onChange={(e) => update(p.id, { active: e.target.checked })} /> on</label>
              <button onClick={() => remove(p.id)} className="p-1.5 rounded hover:bg-muted text-destructive"><Trash2 className="h-4 w-4" /></button>
            </div>
          </div>
        ))}
        {cfg.promos.length === 0 && <p className="text-muted-foreground py-8 text-center border rounded-2xl">No promotions. Add one — e.g. "10% off orders over ৳2000".</p>}
      </div>
    </div>
  );
}
