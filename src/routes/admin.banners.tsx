import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { adminListBanners, adminUpsertBanner, adminDeleteBanner } from "@/lib/admin-content.functions";
import type { Banner } from "@/lib/types";
import { Search, Trash2, Pencil, Plus, ImageIcon } from "lucide-react";
import { Modal, TextField, TextArea, SelectField } from "@/components/admin/Modal";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/banners")({ component: BannersPage });

const empty: Banner = { id: "", title: "", subtitle: "", image: "", href: "", placement: "hero", sort: 0, active: true };

function BannersPage() {
  const fetchAll = useServerFn(adminListBanners);
  const upsert = useServerFn(adminUpsertBanner);
  const del = useServerFn(adminDeleteBanner);

  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<Banner | null>(null);

  const load = () => {
    setLoading(true);
    fetchAll()
      .then((d) => setBanners(d as Banner[]))
      .catch((e) => toast.error(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const filtered = useMemo(
    () => banners.filter((b) => !q || `${b.title} ${b.subtitle} ${b.placement} ${b.href}`.toLowerCase().includes(q.toLowerCase())),
    [banners, q],
  );

  async function onSave(b: Banner) {
    try {
      await upsert({
        data: {
          id: b.id || undefined,
          title: b.title,
          subtitle: b.subtitle,
          image: b.image,
          href: b.href,
          placement: b.placement,
          sort: Number(b.sort),
          active: b.active,
        },
      });
      toast.success(b.id ? "Banner updated" : "Banner created");
      setEditing(null);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    }
  }

  async function onDelete(b: Banner) {
    if (!confirm(`Delete banner "${b.title || b.id}"?`)) return;
    try {
      await del({ data: { id: b.id } });
      toast.success("Banner deleted");
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Banners & Sliders</h1>
          <p className="text-sm text-muted-foreground">{banners.length} total · {banners.filter((b) => b.active).length} active</p>
        </div>
        <button onClick={() => setEditing(empty)} className="bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm font-semibold flex items-center gap-2">
          <Plus className="h-4 w-4" /> Add banner
        </button>
      </div>

      <div className="bg-card border rounded-xl overflow-hidden">
        <div className="p-4 border-b">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search banners..." className="w-full border rounded-md pl-9 pr-3 py-2 text-sm" />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[720px]">
            <thead>
              <tr className="text-left text-muted-foreground border-b bg-muted/30">
                <th className="py-3 px-4">Banner</th><th>Placement</th><th>Link</th><th>Sort</th><th>Status</th><th></th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={6} className="text-center py-12 text-muted-foreground">Loading…</td></tr>}
              {!loading && filtered.map((b) => (
                <tr key={b.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-16 rounded bg-muted overflow-hidden flex items-center justify-center shrink-0">
                        {b.image ? <img src={b.image} alt="" className="h-full w-full object-cover" /> : <ImageIcon className="h-4 w-4 text-muted-foreground" />}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium truncate">{b.title || "—"}</p>
                        <p className="text-xs text-muted-foreground truncate">{b.subtitle}</p>
                      </div>
                    </div>
                  </td>
                  <td><span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 capitalize">{b.placement}</span></td>
                  <td className="text-muted-foreground text-xs max-w-[16rem] truncate">{b.href || "—"}</td>
                  <td className="font-semibold">{b.sort}</td>
                  <td>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${b.active ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-600"}`}>
                      {b.active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td>
                    <div className="flex gap-1">
                      <button onClick={() => setEditing(b)} className="p-1.5 hover:bg-muted rounded text-primary" title="Edit"><Pencil className="h-4 w-4" /></button>
                      <button onClick={() => onDelete(b)} className="p-1.5 hover:bg-muted rounded text-destructive" title="Delete"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && filtered.length === 0 && (
                <tr><td colSpan={6} className="text-center py-12 text-muted-foreground"><ImageIcon className="h-8 w-8 mx-auto mb-2 opacity-40" />No banners</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing?.id ? "Edit banner" : "New banner"} size="lg">
        {editing && <BannerForm initial={editing} onCancel={() => setEditing(null)} onSave={onSave} />}
      </Modal>
    </div>
  );
}

function BannerForm({ initial, onCancel, onSave }: { initial: Banner; onCancel: () => void; onSave: (b: Banner) => void }) {
  const [b, setB] = useState<Banner>(initial);
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSave(b); }} className="space-y-3">
      <TextField label="Title" required value={b.title} onChange={(e) => setB({ ...b, title: e.target.value })} />
      <TextArea label="Subtitle" rows={2} value={b.subtitle} onChange={(e) => setB({ ...b, subtitle: e.target.value })} />
      <TextField label="Image URL" value={b.image} onChange={(e) => setB({ ...b, image: e.target.value })} />
      {b.image && (
        <div className="rounded-md border overflow-hidden bg-muted">
          <img src={b.image} alt="" className="w-full max-h-40 object-cover" />
        </div>
      )}
      <TextField label="Link (href)" value={b.href} onChange={(e) => setB({ ...b, href: e.target.value })} />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <SelectField label="Placement" value={b.placement} onChange={(e) => setB({ ...b, placement: e.target.value })}>
          <option value="hero">Hero</option>
          <option value="promo">Promo</option>
          <option value="strip">Strip</option>
        </SelectField>
        <TextField label="Sort" type="number" value={b.sort} onChange={(e) => setB({ ...b, sort: Number(e.target.value) })} />
      </div>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={b.active} onChange={(e) => setB({ ...b, active: e.target.checked })} /> Active</label>
      <div className="flex justify-end gap-2 pt-2 border-t">
        <button type="button" onClick={onCancel} className="px-4 py-2 rounded-md border text-sm">Cancel</button>
        <button type="submit" className="px-5 py-2 rounded-md bg-primary text-primary-foreground text-sm font-semibold">Save</button>
      </div>
    </form>
  );
}
