import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Trash2, Upload, Image as ImageIcon, Copy, Wand2, RefreshCw, Zap } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { adminListMedia, adminDeleteMedia, adminSetMediaAlt, adminSyncMediaLibrary, adminOptimizerStats, adminOptimizeMedia } from "@/lib/admin-content.functions";
import { ImageEditor } from "@/components/admin/ImageEditor";
import { adminUploadMedia } from "@/lib/admin-upload.functions";
import { AiButton } from "@/components/admin/AiButton";
import { aiAltText } from "@/lib/ai.functions";

export const Route = createFileRoute("/admin/media")({ component: MediaPage });

type MediaItem = {
  id: string;
  name: string;
  url: string;
  size: string;
  uploadedAt: string;
  alt: string;
  lqip: string;
};

function MediaPage() {
  const listFn = useServerFn(adminListMedia);
  const deleteFn = useServerFn(adminDeleteMedia);
  const uploadFn = useServerFn(adminUploadMedia);
  const setAltFn = useServerFn(adminSetMediaAlt);
  const altFn = useServerFn(aiAltText);
  const syncFn = useServerFn(adminSyncMediaLibrary);
  const [editing, setEditing] = useState<MediaItem | null>(null);
  const [syncing, setSyncing] = useState(false);
  const statsFn = useServerFn(adminOptimizerStats);
  const optimizeFn = useServerFn(adminOptimizeMedia);
  const [stats, setStats] = useState<{ total: number; optimized: number; pending: number; savedBytes: number; savedPercent: number } | null>(null);
  const [optimizing, setOptimizing] = useState(false);
  const [progress, setProgress] = useState("");

  const [media, setMedia] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [uploading, setUploading] = useState<boolean>(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await listFn();
      setMedia(rows as MediaItem[]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoading(false);
    }
  }, [listFn]);

  useEffect(() => {
    load();
  }, [load]);

  function readAsDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsDataURL(file);
    });
  }

  async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      for (const f of Array.from(files)) {
        const dataUrl = await readAsDataUrl(f);
        const res = await uploadFn({ data: { filename: f.name, dataUrl } });
        const item: MediaItem = {
          id: res.id,
          name: res.name,
          url: res.url,
          size: res.size,
          uploadedAt: new Date().toISOString().slice(0, 10),
          alt: "",
          lqip: "",
        };
        setMedia((prev) => [item, ...prev]);
      }
      toast.success("Uploaded");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  async function onDelete(m: MediaItem) {
    if (!confirm(`Delete ${m.name}?`)) return;
    try {
      await deleteFn({ data: { id: m.id } });
      setMedia((prev) => prev.filter((x) => x.id !== m.id));
      toast.success("Deleted");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    }
  }

  async function saveAlt(id: string, alt: string) {
    setMedia((prev) => prev.map((m) => (m.id === id ? { ...m, alt } : m)));
    try { await setAltFn({ data: { id, alt } }); } catch (err) { toast.error(err instanceof Error ? err.message : "Failed"); }
  }

  const loadStats = useCallback(() => { statsFn().then(setStats).catch(() => {}); }, [statsFn]);
  useEffect(() => { loadStats(); }, [loadStats]);

  // Compress everything that hasn't been done yet, in small batches so the UI
  // can report progress and no single request has to do all the work.
  async function optimizeAll() {
    setOptimizing(true);
    let totalSaved = 0, totalDone = 0;
    try {
      for (let i = 0; i < 400; i++) {
        const r = await optimizeFn({ data: { limit: 5, quality: 82, redo: false } });
        totalSaved += r.saved;
        totalDone += r.processed;
        setProgress(`${totalDone} done · ${(totalSaved / 1048576).toFixed(2)} MB saved · ${r.remaining} left`);
        if (r.remaining === 0 || r.processed === 0) break;
      }
      toast.success(totalDone ? `Compressed ${totalDone} image(s), saved ${(totalSaved / 1048576).toFixed(2)} MB` : "Everything is already compressed");
      await load();
      loadStats();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Compression failed");
    } finally { setOptimizing(false); setProgress(""); }
  }

  async function onSync() {
    setSyncing(true);
    try {
      const r = await syncFn();
      toast.success(r.added > 0 ? `Imported ${r.added} existing image(s)` : `Nothing new — ${r.scanned} file(s) already in the library`);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Import failed");
    } finally { setSyncing(false); }
  }

  // The editor hands back a data URL; push it through the normal upload path so
  // it is validated, de-duplicated and registered like any other upload.
  async function onSaveEdited(dataUrl: string, name: string) {
    try {
      await uploadFn({ data: { filename: name, dataUrl } });
      toast.success("Edited image saved");
      setEditing(null);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save");
    }
  }

  async function onCopy(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("URL copied");
    } catch {
      toast.error("Failed to copy");
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Media Library</h1>
          <p className="text-sm text-muted-foreground">{media.length} files</p>
        </div>
        <div className="flex items-center gap-2">
        <button onClick={optimizeAll} disabled={optimizing} className="inline-flex items-center gap-2 border px-4 py-2 rounded-md text-sm font-semibold hover:bg-muted disabled:opacity-60" title="Compress every image — same resolution, smaller files">
          <Zap className={`h-4 w-4 ${optimizing ? "animate-pulse" : ""}`} /> {optimizing ? "Compressing…" : "Compress images"}
        </button>
        <button onClick={onSync} disabled={syncing} className="inline-flex items-center gap-2 border px-4 py-2 rounded-md text-sm font-semibold hover:bg-muted disabled:opacity-60" title="Register images that already exist on the server (seeded artwork, previous uploads)">
          <RefreshCw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} /> {syncing ? "Importing…" : "Import existing"}
        </button>
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-semibold disabled:opacity-60"
        >
          <Upload className="h-4 w-4" /> {uploading ? "Uploading…" : "Upload"}
        </button>
        </div>
        <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={onUpload} />
      </div>
      {stats && stats.total > 0 && (
        <div className="mb-5 rounded-xl border bg-card p-4 flex flex-wrap items-center gap-x-8 gap-y-2 text-sm">
          <div className="flex items-center gap-2 font-semibold"><Zap className="h-4 w-4 text-primary" /> Image compression</div>
          <div><span className="text-muted-foreground">Compressed</span> <strong>{stats.optimized}/{stats.total}</strong></div>
          {stats.pending > 0 && <div><span className="text-muted-foreground">Pending</span> <strong>{stats.pending}</strong></div>}
          <div><span className="text-muted-foreground">Saved</span> <strong className="text-emerald-600">{(stats.savedBytes / 1048576).toFixed(2)} MB</strong>{stats.savedPercent > 0 && <span className="text-emerald-600"> ({stats.savedPercent}% smaller)</span>}</div>
          {optimizing && progress && <div className="text-primary">{progress}</div>}
          <p className="w-full text-xs text-muted-foreground">Resolution is never changed — only the file size. New uploads are compressed automatically; originals are kept in <code>uploads/_originals</code>.</p>
        </div>
      )}
      {loading ? (
        <div className="border-2 border-dashed rounded-xl p-16 text-center text-muted-foreground">
          Loading…
        </div>
      ) : media.length === 0 ? (
        <div className="border-2 border-dashed rounded-xl p-16 text-center text-muted-foreground">
          <ImageIcon className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p>No media in the library yet.</p>
          <p className="text-xs mt-1">Already have images on the server? Click <strong>Import existing</strong> to register them.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {media.map((m) => (
            <div key={m.id} className="group relative bg-card border rounded-xl overflow-hidden">
              <div className="aspect-square bg-muted">
                <img src={m.url} alt={m.name} className="h-full w-full object-cover" />
              </div>
              <div className="p-2">
                <p className="text-xs font-medium truncate">{m.name}</p>
                <p className="text-[10px] text-muted-foreground">{m.size} · {m.uploadedAt}</p>
                <div className="mt-1.5 flex items-center gap-1">
                  <input
                    defaultValue={m.alt}
                    placeholder="Alt text…"
                    onBlur={(e) => { if (e.target.value !== m.alt) saveAlt(m.id, e.target.value); }}
                    className="flex-1 min-w-0 border rounded px-1.5 py-1 text-[11px]"
                    title="Image alt text (accessibility + SEO)"
                  />
                  <AiButton label="" run={async () => (await altFn({ data: { context: m.name.replace(/[-_.]/g, " ").replace(/\.[a-z]+$/i, "") } })).text} onText={(t) => saveAlt(m.id, t)} className="p-1 rounded hover:bg-muted text-primary shrink-0" />
                </div>
              </div>
              <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition">
                <button onClick={() => setEditing(m)} className="p-1.5 bg-white/90 rounded shadow text-primary" title="Edit image (crop, resize, adjust)"><Wand2 className="h-3 w-3" /></button>
                <button onClick={() => onCopy(m.url)} className="p-1.5 bg-white/90 rounded shadow" title="Copy URL"><Copy className="h-3 w-3" /></button>
                <button onClick={() => onDelete(m)} className="p-1.5 bg-white/90 rounded shadow text-destructive" title="Delete"><Trash2 className="h-3 w-3" /></button>
              </div>
            </div>
          ))}
        </div>
      )}
      {editing && (
        <ImageEditor src={editing.url} filename={editing.name} onSave={onSaveEdited} onClose={() => setEditing(null)} />
      )}
    </div>
  );
}
