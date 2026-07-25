import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Plus, Edit, Trash2, Ticket } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Modal, TextField, SelectField } from "@/components/admin/Modal";
import type { Coupon } from "@/lib/types";
import { adminListCoupons, adminUpsertCoupon, adminDeleteCoupon } from "@/lib/admin-marketing.functions";

export const Route = createFileRoute("/admin/coupons")({ component: CouponsPage });

const empty: Coupon = {
  id: "",
  code: "",
  type: "percent",
  value: 10,
  minSubtotal: 0,
  expiresAt: new Date(Date.now() + 90 * 864e5).toISOString().slice(0, 10),
  active: true,
  usage: 0,
  limit: 500,
};

function CouponsPage() {
  const listFn = useServerFn(adminListCoupons);
  const upsertFn = useServerFn(adminUpsertCoupon);
  const deleteFn = useServerFn(adminDeleteCoupon);

  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [editing, setEditing] = useState<Coupon | null>(null);
  const [saving, setSaving] = useState<boolean>(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await listFn();
      setCoupons(rows);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoading(false);
    }
  }, [listFn]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleSave = async (c: Coupon) => {
    setSaving(true);
    try {
      await upsertFn({
        data: {
          id: c.id || undefined,
          code: c.code,
          type: c.type,
          value: c.value,
          minSubtotal: c.minSubtotal,
          expiresAt: c.expiresAt || null,
          active: c.active,
          limit: c.limit,
        },
      });
      toast.success("Coupon saved");
      setEditing(null);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (c: Coupon) => {
    if (!confirm(`Delete ${c.code}?`)) return;
    try {
      await deleteFn({ data: { id: c.id } });
      toast.success("Coupon deleted");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    }
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Coupons & Discounts</h1>
          <p className="text-sm text-muted-foreground">
            {coupons.filter((c) => c.active).length} active · {coupons.reduce((s, c) => s + c.usage, 0)} total redemptions
          </p>
        </div>
        <button onClick={() => setEditing(empty)} className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-semibold shrink-0"><Plus className="h-4 w-4" /> Add coupon</button>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : coupons.length === 0 ? (
        <p className="text-sm text-muted-foreground">No coupons yet.</p>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {coupons.map((c) => (
            <div key={c.id} className={`relative rounded-xl border-2 border-dashed p-5 ${c.active ? "border-primary/40 bg-primary/5" : "border-muted-foreground/20 bg-muted/30"}`}>
              <div className="flex items-start justify-between">
                <Ticket className={`h-6 w-6 ${c.active ? "text-primary" : "text-muted-foreground"}`} />
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${c.active ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-600"}`}>{c.active ? "ACTIVE" : "INACTIVE"}</span>
              </div>
              <p className="mt-3 font-mono font-bold text-lg tracking-wider break-all">{c.code}</p>
              <p className="text-sm text-muted-foreground mt-1">{c.type === "percent" ? `${c.value}% off` : `৳${c.value} off`} · Min ৳{c.minSubtotal}</p>
              <p className="text-xs text-muted-foreground mt-2">Expires {c.expiresAt ?? "never"} · {c.usage}/{c.limit} used</p>
              <div className="mt-3 h-1 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-primary" style={{ width: `${c.limit > 0 ? Math.min(100, (c.usage / c.limit) * 100) : 0}%` }} />
              </div>
              <div className="mt-4 flex gap-2">
                <button onClick={() => setEditing(c)} className="flex-1 py-1.5 rounded-md border text-xs font-semibold hover:bg-card inline-flex items-center justify-center gap-1"><Edit className="h-3 w-3" /> Edit</button>
                <button onClick={() => handleDelete(c)} className="py-1.5 px-3 rounded-md border text-xs text-destructive hover:bg-card"><Trash2 className="h-3 w-3" /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing?.id ? "Edit coupon" : "New coupon"}>
        {editing && <CouponForm initial={editing} saving={saving} onCancel={() => setEditing(null)} onSave={handleSave} />}
      </Modal>
    </div>
  );
}

function CouponForm({ initial, saving, onCancel, onSave }: { initial: Coupon; saving: boolean; onCancel: () => void; onSave: (c: Coupon) => void }) {
  const [c, setC] = useState<Coupon>(initial);
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSave(c); }} className="space-y-3">
      <TextField label="Code" required value={c.code} onChange={(e) => setC({ ...c, code: e.target.value.toUpperCase() })} />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <SelectField label="Type" value={c.type} onChange={(e) => setC({ ...c, type: e.target.value as "percent" | "fixed" })}>
          <option value="percent">Percentage</option>
          <option value="fixed">Fixed ৳</option>
        </SelectField>
        <TextField label="Value" type="number" required value={c.value} onChange={(e) => setC({ ...c, value: Number(e.target.value) })} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <TextField label="Min. subtotal (৳)" type="number" value={c.minSubtotal} onChange={(e) => setC({ ...c, minSubtotal: Number(e.target.value) })} />
        <TextField label="Usage limit" type="number" value={c.limit} onChange={(e) => setC({ ...c, limit: Number(e.target.value) })} />
      </div>
      <TextField label="Expires" type="date" value={c.expiresAt ?? ""} onChange={(e) => setC({ ...c, expiresAt: e.target.value || null })} />
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={c.active} onChange={(e) => setC({ ...c, active: e.target.checked })} /> Active</label>
      <div className="flex justify-end gap-2 pt-2 border-t">
        <button type="button" onClick={onCancel} className="px-4 py-2 rounded-md border text-sm">Cancel</button>
        <button type="submit" disabled={saving} className="px-5 py-2 rounded-md bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-60">{saving ? "Saving…" : "Save"}</button>
      </div>
    </form>
  );
}
