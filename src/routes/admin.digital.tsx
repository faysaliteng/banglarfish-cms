import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { adminDigitalProducts, adminImportKeys, type DigitalProduct } from "@/lib/digital.functions";
import { KeyRound, PackageOpen, Upload } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/digital")({
  head: () => ({ meta: [{ title: "Digital Delivery — Admin" }, { name: "robots", content: "noindex" }] }),
  component: DigitalPage,
});

function DigitalPage() {
  const listFn = useServerFn(adminDigitalProducts);
  const importFn = useServerFn(adminImportKeys);
  const [rows, setRows] = useState<DigitalProduct[] | null>(null);
  const [openFor, setOpenFor] = useState<string | null>(null);
  const [keys, setKeys] = useState("");
  const [busy, setBusy] = useState(false);

  const load = () => listFn().then(setRows).catch((e) => { toast.error(e instanceof Error ? e.message : "Failed to load"); setRows([]); });
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  async function submit(productId: string) {
    setBusy(true);
    try {
      const res = await importFn({ data: { productId, keys } });
      toast.success(`Added ${res.added} key(s).`);
      setKeys("");
      setOpenFor(null);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Import failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="p-6 max-w-5xl">
      <div className="flex items-center gap-3 mb-1">
        <div className="p-2 rounded-lg bg-primary/10 text-primary"><KeyRound className="h-5 w-5" /></div>
        <h1 className="text-2xl font-bold">Digital Delivery</h1>
      </div>
      <p className="text-sm text-muted-foreground mb-6">Manage the license-key vault for digital products. Paste keys (one per line); on paid orders they are auto-assigned to buyers and shown in their account.</p>

      {rows === null ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : rows.length === 0 ? (
        <div className="border rounded-2xl p-12 text-center bg-card">
          <PackageOpen className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">No digital products yet. Mark a product as <strong>Digital</strong> in the product editor to manage its keys here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((p) => {
            const low = p.available === 0 || (p.total > 0 && p.available <= 3);
            return (
              <div key={p.id} className="border rounded-xl bg-card">
                <div className="flex flex-wrap items-center gap-3 p-4">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold truncate">{p.name}</p>
                    <p className="text-xs text-muted-foreground">/{p.slug}</p>
                  </div>
                  <div className="text-sm text-right">
                    <span className={`font-bold ${low ? "text-destructive" : "text-emerald-600"}`}>{p.available}</span>
                    <span className="text-muted-foreground"> available</span>
                    <span className="text-muted-foreground"> · {p.total - p.available} used · {p.total} total</span>
                  </div>
                  <button onClick={() => { setOpenFor(openFor === p.id ? null : p.id); setKeys(""); }} className="inline-flex items-center gap-1.5 text-sm font-semibold bg-primary text-primary-foreground px-3 py-2 rounded-md">
                    <Upload className="h-4 w-4" /> Import keys
                  </button>
                </div>
                {openFor === p.id && (
                  <div className="border-t p-4 space-y-2">
                    <textarea value={keys} onChange={(e) => setKeys(e.target.value)} rows={6} placeholder={"XXXX-XXXX-XXXX-0001\nXXXX-XXXX-XXXX-0002\n…one key per line"} className="w-full border rounded-md px-3 py-2 text-sm font-mono" />
                    <div className="flex items-center gap-2">
                      <button disabled={busy || keys.trim().length === 0} onClick={() => submit(p.id)} className="text-sm font-semibold bg-primary text-primary-foreground px-4 py-2 rounded-md disabled:opacity-60">{busy ? "Importing…" : `Add ${keys.split(/\r?\n/).filter((s) => s.trim()).length} key(s)`}</button>
                      <button onClick={() => setOpenFor(null)} className="text-sm px-4 py-2 rounded-md border">Cancel</button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
