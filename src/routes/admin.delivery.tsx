import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { adminGetDelivery, adminSaveDelivery } from "@/lib/site.functions";
import type { DeliveryConfig, DeliveryArea } from "@/lib/config-types";
import { MapPin, Save, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/delivery")({ component: DeliveryPage });

function DeliveryPage() {
  const getFn = useServerFn(adminGetDelivery);
  const saveFn = useServerFn(adminSaveDelivery);
  const [cfg, setCfg] = useState<DeliveryConfig | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getFn().then(setCfg).catch((e) => toast.error(e instanceof Error ? e.message : "Failed"));
  }, [getFn]);

  if (!cfg) return <p className="text-sm text-muted-foreground">Loading…</p>;

  async function save() {
    if (!cfg) return;
    setSaving(true);
    try {
      // Normalise: split any comma-joined terms, drop empties.
      const clean: DeliveryConfig = {
        ...cfg,
        areas: cfg.areas.map((a) => ({ ...a, terms: a.terms.map((t) => t.trim()).filter(Boolean) })),
      };
      await saveFn({ data: clean });
      toast.success("Delivery coverage saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  const addArea = () => setCfg({ ...cfg, areas: [...cfg.areas, { id: `area-${cfg.areas.length + 1}-${cfg.areas.length}`, name: "", terms: [] }] });
  const removeArea = (id: string) => setCfg({ ...cfg, areas: cfg.areas.filter((a) => a.id !== id) });
  const patchArea = (id: string, patch: Partial<DeliveryArea>) => setCfg({ ...cfg, areas: cfg.areas.map((a) => (a.id === id ? { ...a, ...patch } : a)) });

  return (
    <div className="pb-16 max-w-3xl">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-1">
        <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2 min-w-0"><MapPin className="h-6 w-6 shrink-0" /> Delivery Areas</h1>
        <button onClick={save} disabled={saving} className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-md font-semibold hover:bg-primary/90 disabled:opacity-60">
          <Save className="h-4 w-4" /> {saving ? "Saving…" : "Save"}
        </button>
      </div>
      <p className="text-sm text-muted-foreground mb-6">Define where you deliver. When restriction is on, customers entering an address outside these areas are told you don't cover it — enforced at signup, on the account page, and at checkout.</p>

      <div className="border rounded-2xl p-5 bg-card mb-4 space-y-4">
        <label className="flex items-center justify-between gap-3">
          <span>
            <span className="text-sm font-semibold block">Restrict to covered areas</span>
            <span className="text-xs text-muted-foreground">Off = deliver everywhere. On = only the areas below.</span>
          </span>
          <button type="button" onClick={() => setCfg({ ...cfg, enabled: !cfg.enabled })} className={`relative h-6 w-11 shrink-0 rounded-full transition ${cfg.enabled ? "bg-primary" : "bg-muted-foreground/30"}`}>
            <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${cfg.enabled ? "left-[22px]" : "left-0.5"}`} />
          </button>
        </label>
        <label className="block">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">"Out of area" message</span>
          <textarea value={cfg.message} onChange={(e) => setCfg({ ...cfg, message: e.target.value })} rows={2} className="mt-1 w-full border rounded-md px-3 py-2 text-sm" />
        </label>
      </div>

      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold">Covered areas <span className="text-xs text-muted-foreground font-normal">({cfg.areas.length})</span></h3>
        <button onClick={addArea} className="inline-flex items-center gap-1.5 border rounded-md px-3 py-1.5 text-sm font-medium hover:bg-muted"><Plus className="h-4 w-4" /> Add area</button>
      </div>

      <div className="space-y-3">
        {cfg.areas.map((a) => (
          <div key={a.id} className="border rounded-2xl p-4 bg-card">
            <div className="flex items-center gap-2 mb-3">
              <input value={a.name} onChange={(e) => patchArea(a.id, { name: e.target.value })} placeholder="Area name (e.g. Dhaka City)" className="flex-1 border rounded-md px-3 py-2 text-sm font-medium" />
              <button onClick={() => removeArea(a.id)} className="text-destructive hover:bg-destructive/10 rounded-md p-2" aria-label="Remove area"><Trash2 className="h-4 w-4" /></button>
            </div>
            <label className="block">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Matching terms (comma-separated)</span>
              <p className="text-[11px] text-muted-foreground mb-1">Areas / thanas / cities / postal codes. An address is covered if any term appears in its city, district, street, or postal code.</p>
              <textarea
                value={a.terms.join(", ")}
                onChange={(e) => patchArea(a.id, { terms: e.target.value.split(",").map((t) => t.replace(/\n/g, " ")) })}
                rows={2}
                placeholder="dhaka, gulshan, banani, mirpur, uttara, 1212, 1213"
                className="mt-1 w-full border rounded-md px-3 py-2 text-sm"
              />
            </label>
          </div>
        ))}
        {cfg.areas.length === 0 && <p className="text-sm text-muted-foreground text-center py-8 border rounded-2xl">No areas yet. Add one, or leave restriction off to deliver everywhere.</p>}
      </div>
    </div>
  );
}
