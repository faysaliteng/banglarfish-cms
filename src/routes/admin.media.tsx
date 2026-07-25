import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Trash2, Upload, Image as ImageIcon, Copy } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { adminListMedia, adminDeleteMedia } from "@/lib/admin-content.functions";
import { adminUploadMedia } from "@/lib/admin-upload.functions";

export const Route = createFileRoute("/admin/media")({ component: MediaPage });

type MediaItem = {
  id: string;
  name: string;
  url: string;
  size: string;
  uploadedAt: string;
};

function MediaPage() {
  const listFn = useServerFn(adminListMedia);
  const deleteFn = useServerFn(adminDeleteMedia);
  const uploadFn = useServerFn(adminUploadMedia);

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
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-semibold disabled:opacity-60"
        >
          <Upload className="h-4 w-4" /> {uploading ? "Uploading…" : "Upload"}
        </button>
        <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={onUpload} />
      </div>
      {loading ? (
        <div className="border-2 border-dashed rounded-xl p-16 text-center text-muted-foreground">
          Loading…
        </div>
      ) : media.length === 0 ? (
        <div className="border-2 border-dashed rounded-xl p-16 text-center text-muted-foreground">
          <ImageIcon className="h-10 w-10 mx-auto mb-3 opacity-40" />
          No media yet. Click Upload to add images.
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
              </div>
              <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition">
                <button onClick={() => onCopy(m.url)} className="p-1.5 bg-white/90 rounded shadow" title="Copy URL"><Copy className="h-3 w-3" /></button>
                <button onClick={() => onDelete(m)} className="p-1.5 bg-white/90 rounded shadow text-destructive" title="Delete"><Trash2 className="h-3 w-3" /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
