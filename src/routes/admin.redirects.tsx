import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { adminListRedirects, adminUpsertRedirect, adminDeleteRedirect, adminListNotFound, adminClearNotFound, adminExportRedirectsCsv, adminImportRedirectsCsv, type RedirectRow, type NotFoundRow } from "@/lib/redirects.functions";
import { ArrowRightLeft, Plus, Trash2, ExternalLink, AlertTriangle, Upload, Download } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/redirects")({ component: RedirectsPage });

function RedirectsPage() {
  const listFn = useServerFn(adminListRedirects);
  const saveFn = useServerFn(adminUpsertRedirect);
  const delFn = useServerFn(adminDeleteRedirect);

  const nfListFn = useServerFn(adminListNotFound);
  const nfClearFn = useServerFn(adminClearNotFound);
  const exportFn = useServerFn(adminExportRedirectsCsv);
  const importFn = useServerFn(adminImportRedirectsCsv);

  const [rows, setRows] = useState<RedirectRow[]>([]);
  const [nf, setNf] = useState<NotFoundRow[]>([]);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [code, setCode] = useState<301 | 302 | 410>(301);
  const [saving, setSaving] = useState(false);

  async function onExport() {
    try {
      const csv = await exportFn();
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `redirects-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch (e) { toast.error(e instanceof Error ? e.message : "Export failed"); }
  }
  async function onImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const csv = await file.text();
      const res = await importFn({ data: { csv } });
      toast.success(`Imported ${res.imported} redirect(s)${res.errors ? `, ${res.errors} skipped` : ""}.`);
      load();
    } catch (err) { toast.error(err instanceof Error ? err.message : "Import failed"); }
  }

  const load = () => listFn().then(setRows).catch((e) => toast.error(e instanceof Error ? e.message : "Failed"));
  const loadNf = () => nfListFn().then(setNf).catch(() => {});
  useEffect(() => { load(); loadNf(); /* eslint-disable-next-line */ }, []);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!from.trim() || !to.trim()) return;
    if (code !== 410 && !to.trim()) return toast.error("Enter a destination, or choose 410 (Gone).");
    setSaving(true);
    try {
      await saveFn({ data: { fromPath: from, toPath: code === 410 ? from : to, code, active: true } });
      toast.success("Redirect saved");
      setFrom(""); setTo(""); setCode(301);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setSaving(false);
    }
  }
  async function toggle(r: RedirectRow) {
    const c = r.code === 302 ? 302 : r.code === 410 ? 410 : 301;
    try { await saveFn({ data: { id: r.id, fromPath: r.fromPath, toPath: r.toPath, code: c, active: !r.active } }); load(); } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
  }
  async function remove(r: RedirectRow) {
    if (!confirm(`Delete redirect ${r.fromPath} → ${r.toPath}?`)) return;
    try { await delFn({ data: { id: r.id } }); toast.success("Deleted"); load(); } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
  }

  return (
    <div className="pb-16 max-w-4xl">
      <div className="mb-1">
        <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2"><ArrowRightLeft className="h-6 w-6" /> Redirects</h1>
      </div>
      <p className="text-sm text-muted-foreground mb-5">Send old or changed URLs to new ones (301 = permanent, keeps SEO value; 302 = temporary; 410 = gone/deindex). Great when you rename products or pages. Applied instantly, before the page loads.</p>

      <div className="flex flex-wrap gap-2 mb-4">
        <button onClick={onExport} className="inline-flex items-center gap-1.5 text-sm border rounded-md px-3 py-2 hover:bg-muted"><Download className="h-4 w-4" /> Export CSV</button>
        <label className="inline-flex items-center gap-1.5 text-sm border rounded-md px-3 py-2 hover:bg-muted cursor-pointer">
          <Upload className="h-4 w-4" /> Import CSV
          <input type="file" accept=".csv,text/csv" onChange={onImport} className="hidden" />
        </label>
        <span className="text-xs text-muted-foreground self-center">Columns: from, to, code, active</span>
      </div>

      <form onSubmit={add} className="border rounded-2xl p-4 bg-card mb-6 grid sm:grid-cols-[1fr_1fr_auto_auto] gap-3 items-end">
        <label className="block">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">From (old path)</span>
          <input value={from} onChange={(e) => setFrom(e.target.value)} placeholder="/old-product" className="mt-1 w-full border rounded-md px-3 py-2 text-sm font-mono" />
        </label>
        <label className="block">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">To (new path or URL)</span>
          <input value={code === 410 ? "" : to} onChange={(e) => setTo(e.target.value)} disabled={code === 410} placeholder={code === 410 ? "— not needed for 410 —" : "/product/new-slug"} className="mt-1 w-full border rounded-md px-3 py-2 text-sm font-mono disabled:opacity-50 disabled:bg-muted" />
        </label>
        <label className="block">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Type</span>
          <select value={code} onChange={(e) => { const v = Number(e.target.value); setCode(v === 302 ? 302 : v === 410 ? 410 : 301); }} className="mt-1 w-full border rounded-md px-3 py-2 text-sm bg-card">
            <option value={301}>301</option>
            <option value={302}>302</option>
            <option value={410}>410 (Gone)</option>
          </select>
        </label>
        <button disabled={saving} className="inline-flex items-center gap-1.5 bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-semibold disabled:opacity-60"><Plus className="h-4 w-4" /> Add</button>
      </form>

      <div className="bg-card border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead>
              <tr className="text-left text-muted-foreground border-b bg-muted/30">
                <th className="py-3 px-4">From</th><th>To</th><th>Type</th><th>Hits</th><th>Active</th><th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="py-3 px-4 font-mono text-xs">{r.fromPath}</td>
                  <td className="font-mono text-xs">{r.code === 410 ? <span className="text-muted-foreground">— (gone)</span> : r.toPath}</td>
                  <td>{r.code === 410 ? <span className="text-amber-600 font-medium">410</span> : r.code}</td>
                  <td className="text-muted-foreground">{r.hits}</td>
                  <td><button onClick={() => toggle(r)} className={`text-xs px-2 py-0.5 rounded-full font-semibold ${r.active ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-600"}`}>{r.active ? "Active" : "Off"}</button></td>
                  <td>
                    <div className="flex gap-1">
                      <a href={r.fromPath} target="_blank" rel="noreferrer" className="p-1.5 hover:bg-muted rounded" title="Test"><ExternalLink className="h-4 w-4" /></a>
                      <button onClick={() => remove(r)} className="p-1.5 hover:bg-muted rounded text-destructive" title="Delete"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan={6} className="text-center py-10 text-muted-foreground">No redirects yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-amber-500" /> 404 monitor <span className="text-sm font-normal text-muted-foreground">({nf.length})</span></h2>
          {nf.length > 0 && <button onClick={async () => { if (!confirm("Clear all 404 logs?")) return; await nfClearFn({ data: {} }); loadNf(); }} className="text-xs px-3 py-1.5 rounded-md border hover:bg-muted">Clear all</button>}
        </div>
        <p className="text-sm text-muted-foreground mb-3">Broken/missing URLs visitors hit. Click <strong>Fix</strong> to pre-fill a redirect for that path.</p>
        {nf.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center border rounded-xl">No 404s logged yet. 🎉</p>
        ) : (
          <div className="bg-card border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-muted-foreground border-b bg-muted/30"><th className="py-2.5 px-4">Path</th><th>Hits</th><th>Last seen</th><th></th></tr></thead>
              <tbody>
                {nf.map((r) => (
                  <tr key={r.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="py-2.5 px-4 font-mono text-xs">{r.path}</td>
                    <td className="text-muted-foreground">{r.hits}</td>
                    <td className="text-xs text-muted-foreground">{new Date(r.lastSeen).toLocaleDateString()}</td>
                    <td>
                      <div className="flex gap-1">
                        <button onClick={() => { setFrom(r.path); window.scrollTo({ top: 0, behavior: "smooth" }); }} className="text-xs px-2.5 py-1 rounded-md bg-primary text-primary-foreground">Fix</button>
                        <button onClick={async () => { await nfClearFn({ data: { id: r.id } }); loadNf(); }} className="p-1.5 hover:bg-muted rounded text-destructive" title="Dismiss"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
