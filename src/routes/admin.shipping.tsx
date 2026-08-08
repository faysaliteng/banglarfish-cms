import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { adminListZones, adminUpsertZone, adminDeleteZone } from "@/lib/admin-marketing.functions";
import { getShippingClassesPublic, adminSaveShippingClasses } from "@/lib/site.functions";
import type { ShippingZone } from "@/lib/types";
import type { ShippingClass } from "@/lib/config-types";
import { formatBDT } from "@/lib/cart";
import { Plus, Edit, Trash2, Truck, Package, Save } from "lucide-react";
import { Modal, TextField } from "@/components/admin/Modal";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/shipping")({ component: ShippingPage });

const empty: ShippingZone = { id: "", name: "", cities: [], rate: 100, freeAbove: 2000, eta: "1–2 days", active: true };

function ShippingPage() {
  const listFn = useServerFn(adminListZones);
  const upsertFn = useServerFn(adminUpsertZone);
  const deleteFn = useServerFn(adminDeleteZone);

  const [zones, setZones] = useState<ShippingZone[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<ShippingZone | null>(null);

  const load = () => {
    setLoading(true);
    listFn()
      .then((d) => setZones(d as ShippingZone[]))
      .catch((e) => toast.error(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  async function onSave(z: ShippingZone) {
    try {
      await upsertFn({
        data: {
          id: z.id || undefined,
          name: z.name,
          cities: z.cities,
          rate: Number(z.rate),
          freeAbove: Number(z.freeAbove),
          eta: z.eta,
          active: z.active,
        },
      });
      toast.success("Zone saved");
      setEditing(null);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  }

  async function onDelete(z: ShippingZone) {
    if (!confirm(`Delete ${z.name}?`)) return;
    try {
      await deleteFn({ data: { id: z.id } });
      toast.success("Zone deleted");
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Shipping Zones</h1>
          <p className="text-sm text-muted-foreground">{zones.length} zones · {zones.filter((z) => z.active).length} active</p>
        </div>
        <button onClick={() => setEditing(empty)} className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-semibold shrink-0"><Plus className="h-4 w-4" /> Add zone</button>
      </div>
      <div className="bg-card border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[720px]">
            <thead>
              <tr className="text-left text-muted-foreground border-b bg-muted/30">
                <th className="py-3 px-4">Zone</th><th>Cities</th><th>Rate</th><th>Free above</th><th>ETA</th><th>Status</th><th></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="py-8 text-center text-muted-foreground">Loading…</td></tr>
              ) : zones.length === 0 ? (
                <tr><td colSpan={7} className="py-8 text-center text-muted-foreground">No zones yet</td></tr>
              ) : zones.map((z) => (
                <tr key={z.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="py-3 px-4 font-medium flex items-center gap-2"><Truck className="h-4 w-4 text-primary" /> {z.name}</td>
                  <td className="text-xs text-muted-foreground max-w-xs">{z.cities.join(", ")}</td>
                  <td className="font-semibold">{formatBDT(z.rate)}</td>
                  <td>{formatBDT(z.freeAbove)}</td>
                  <td>{z.eta}</td>
                  <td><span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${z.active ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-600"}`}>{z.active ? "Active" : "Off"}</span></td>
                  <td>
                    <div className="flex gap-1">
                      <button onClick={() => setEditing(z)} className="p-1.5 hover:bg-muted rounded"><Edit className="h-4 w-4" /></button>
                      <button onClick={() => onDelete(z)} className="p-1.5 hover:bg-muted rounded text-destructive"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <ShippingClasses />

      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing?.id ? "Edit zone" : "New zone"}>
        {editing && <ZoneForm initial={editing} onCancel={() => setEditing(null)} onSave={onSave} />}
      </Modal>
    </div>
  );
}

function ShippingClasses() {
  const getFn = useServerFn(getShippingClassesPublic);
  const saveFn = useServerFn(adminSaveShippingClasses);
  const [classes, setClasses] = useState<ShippingClass[]>([]);
  const [saving, setSaving] = useState(false);
  useEffect(() => { getFn().then((c) => setClasses(c.classes ?? [])).catch(() => {}); }, [getFn]);

  const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "class";
  const update = (id: string, patch: Partial<ShippingClass>) => setClasses((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  const add = () => { const name = prompt("Shipping class name (e.g. Heavy, Frozen):"); if (!name) return; const id = slug(name); if (classes.some((c) => c.id === id)) return toast.error("Exists"); setClasses((prev) => [...prev, { id, name, fee: 0 }]); };
  const remove = (id: string) => setClasses((prev) => prev.filter((c) => c.id !== id));
  async function save() { setSaving(true); try { await saveFn({ data: { classes } }); toast.success("Shipping classes saved"); } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); } finally { setSaving(false); } }

  return (
    <div className="mt-8 border rounded-2xl p-5 bg-card max-w-2xl">
      <div className="flex items-center justify-between mb-1">
        <h2 className="font-bold flex items-center gap-2"><Package className="h-5 w-5" /> Shipping classes</h2>
        <div className="flex gap-2">
          <button onClick={add} className="inline-flex items-center gap-1 text-sm px-3 py-1.5 rounded-md border hover:bg-muted"><Plus className="h-4 w-4" /> Add</button>
          <button onClick={save} disabled={saving} className="inline-flex items-center gap-1 text-sm px-3 py-1.5 rounded-md bg-primary text-primary-foreground disabled:opacity-60"><Save className="h-4 w-4" /> {saving ? "Saving…" : "Save"}</button>
        </div>
      </div>
      <p className="text-sm text-muted-foreground mb-4">A per-product handling surcharge (e.g. Heavy, Frozen, Fragile). Assign a class to products in the product editor; the fee is added to shipping at checkout.</p>
      {classes.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">No shipping classes yet.</p>
      ) : (
        <div className="space-y-2">
          {classes.map((c) => (
            <div key={c.id} className="flex items-center gap-2">
              <input value={c.name} onChange={(e) => update(c.id, { name: e.target.value })} className="border rounded-md px-3 py-1.5 text-sm flex-1" />
              <div className="flex items-center gap-1"><span className="text-xs text-muted-foreground">+৳</span><input type="number" value={c.fee} onChange={(e) => update(c.id, { fee: Number(e.target.value) || 0 })} className="border rounded-md px-2 py-1.5 text-sm w-24" /></div>
              <button onClick={() => remove(c.id)} className="p-1.5 rounded hover:bg-muted text-destructive"><Trash2 className="h-4 w-4" /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ZoneForm({ initial, onCancel, onSave }: { initial: ShippingZone; onCancel: () => void; onSave: (z: ShippingZone) => void }) {
  const [z, setZ] = useState<ShippingZone>(initial);
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSave(z); }} className="space-y-3">
      <TextField label="Zone name" required value={z.name} onChange={(e) => setZ({ ...z, name: e.target.value })} />
      <TextField label="Cities (comma separated)" value={z.cities.join(", ")} onChange={(e) => setZ({ ...z, cities: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })} />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <TextField label="Rate (৳)" type="number" value={String(z.rate)} onChange={(e) => setZ({ ...z, rate: Number(e.target.value) })} />
        <TextField label="Free above (৳)" type="number" value={String(z.freeAbove)} onChange={(e) => setZ({ ...z, freeAbove: Number(e.target.value) })} />
      </div>
      <TextField label="ETA" value={z.eta} onChange={(e) => setZ({ ...z, eta: e.target.value })} />
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={z.active} onChange={(e) => setZ({ ...z, active: e.target.checked })} /> Active</label>
      <div className="flex justify-end gap-2 pt-2 border-t">
        <button type="button" onClick={onCancel} className="px-4 py-2 rounded-md border text-sm">Cancel</button>
        <button type="submit" className="px-5 py-2 rounded-md bg-primary text-primary-foreground text-sm font-semibold">Save</button>
      </div>
    </form>
  );
}
