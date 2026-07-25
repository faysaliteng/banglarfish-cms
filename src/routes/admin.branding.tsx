import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { adminGetBranding, adminSaveBranding } from "@/lib/site.functions";
import { adminUploadMedia } from "@/lib/admin-upload.functions";
import type { BrandingConfig } from "@/lib/config-types";
import { Palette, Save, Upload } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/branding")({ component: BrandingPage });

function BrandingPage() {
  const getFn = useServerFn(adminGetBranding);
  const saveFn = useServerFn(adminSaveBranding);
  const uploadFn = useServerFn(adminUploadMedia);
  const [cfg, setCfg] = useState<BrandingConfig | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getFn().then(setCfg).catch((e) => toast.error(e instanceof Error ? e.message : "Failed"));
  }, [getFn]);

  if (!cfg) return <p className="text-sm text-muted-foreground">Loading…</p>;
  const set = (patch: Partial<BrandingConfig>) => setCfg({ ...cfg, ...patch });

  async function upload(file: File, field: keyof BrandingConfig) {
    const dataUrl = await new Promise<string>((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(r.result as string);
      r.onerror = () => rej(new Error("read failed"));
      r.readAsDataURL(file);
    });
    try {
      const out = await uploadFn({ data: { filename: file.name, dataUrl } });
      set({ [field]: out.url } as Partial<BrandingConfig>);
      toast.success("Uploaded");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    }
  }

  async function save() {
    if (!cfg) return;
    setSaving(true);
    try {
      await saveFn({ data: cfg });
      toast.success("Branding saved — reloading…");
      setTimeout(() => window.location.reload(), 700);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save");
      setSaving(false);
    }
  }

  return (
    <div className="pb-16 max-w-3xl">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-1">
        <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2 min-w-0"><Palette className="h-6 w-6 shrink-0" /> Branding</h1>
        <button onClick={save} disabled={saving} className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-md font-semibold hover:bg-primary/90 disabled:opacity-60">
          <Save className="h-4 w-4" /> {saving ? "Saving…" : "Save & Apply"}
        </button>
      </div>
      <p className="text-sm text-muted-foreground mb-6">Your store identity — used across the storefront, admin, and browser tab. Rebrand this to sell any kind of product.</p>

      <div className="border rounded-2xl p-5 bg-card space-y-4">
        <Field label="Store name" value={cfg.storeName} onChange={(v) => set({ storeName: v })} />
        <Field label="Announcement bar text" value={cfg.announcement} onChange={(v) => set({ announcement: v })} />
      </div>

      <div className="grid sm:grid-cols-3 gap-4 mt-4">
        <ImageField label="Logo (light bg)" value={cfg.logoLight} onChange={(v) => set({ logoLight: v })} onUpload={(f) => upload(f, "logoLight")} bg="#ffffff" />
        <ImageField label="Logo (dark bg)" value={cfg.logoDark} onChange={(v) => set({ logoDark: v })} onUpload={(f) => upload(f, "logoDark")} bg="#111a2e" />
        <ImageField label="Favicon" value={cfg.favicon} onChange={(v) => set({ favicon: v })} onUpload={(f) => upload(f, "favicon")} bg="#f3f4f6" small />
      </div>
    </div>
  );
}

function ImageField({ label, value, onChange, onUpload, bg, small }: { label: string; value: string; onChange: (v: string) => void; onUpload: (f: File) => void; bg: string; small?: boolean }) {
  return (
    <div className="border rounded-2xl p-4 bg-card">
      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{label}</span>
      <div className="mt-2 rounded-lg grid place-items-center h-24 overflow-hidden" style={{ background: bg }}>
        {value && <img src={value} alt={label} className={small ? "h-12 w-12 object-contain" : "max-h-16 max-w-full object-contain"} />}
      </div>
      <label className="mt-2 flex items-center justify-center gap-2 border rounded-md py-2 text-xs font-medium cursor-pointer hover:bg-muted">
        <Upload className="h-3.5 w-3.5" /> Upload
        <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onUpload(f); }} />
      </label>
      <input value={value} onChange={(e) => onChange(e.target.value)} className="mt-2 w-full border rounded-md px-2 py-1.5 text-xs font-mono" />
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{label}</span>
      <input value={value} onChange={(e) => onChange(e.target.value)} className="mt-1 w-full border rounded-md px-3 py-2 text-sm" />
    </label>
  );
}
