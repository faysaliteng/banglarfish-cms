import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { adminGetSeo, adminSaveSeo } from "@/lib/site.functions";
import type { SeoConfig } from "@/lib/config-types";
import { SeoAnalyzer } from "@/components/admin/SeoAnalyzer";
import { Search, Save, Globe, Share2, ShieldCheck, Gauge } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/seo")({ component: SeoConfigPage });

function SeoConfigPage() {
  const getFn = useServerFn(adminGetSeo);
  const saveFn = useServerFn(adminSaveSeo);
  const [cfg, setCfg] = useState<SeoConfig | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getFn().then(setCfg).catch((e) => toast.error(e instanceof Error ? e.message : "Failed"));
  }, [getFn]);

  if (!cfg) return <p className="text-sm text-muted-foreground">Loading…</p>;
  const set = (patch: Partial<SeoConfig>) => setCfg({ ...cfg, ...patch });

  async function save() {
    if (!cfg) return;
    setSaving(true);
    try {
      await saveFn({ data: cfg });
      toast.success("SEO settings saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  const previewTitle = cfg.titleTemplate.replace("%page%", "Padma Hilsa (Ilish)").replace("%site%", cfg.siteName);

  return (
    <div className="pb-16">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-1">
        <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2 min-w-0"><Search className="h-6 w-6 shrink-0" /> SEO Engine</h1>
        <button onClick={save} disabled={saving} className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-md font-semibold hover:bg-primary/90 disabled:opacity-60">
          <Save className="h-4 w-4" /> {saving ? "Saving…" : "Save"}
        </button>
      </div>
      <p className="text-sm text-muted-foreground mb-6">
        Global SEO — title templates, meta defaults, structured data, search-console verification and social. Per-page/product/post SEO fields live in each editor. Machine-readable <a href="/sitemap.xml" className="text-primary underline" target="_blank" rel="noreferrer">sitemap.xml</a> and <a href="/robots.txt" className="text-primary underline" target="_blank" rel="noreferrer">robots.txt</a> are generated automatically.
      </p>

      <div className="grid lg:grid-cols-[1fr_360px] gap-6">
        <div className="space-y-5">
          <Panel title="Titles & meta" icon={Globe}>
            <div className="grid gap-3">
              <Field label="Site name" value={cfg.siteName} onChange={(v) => set({ siteName: v })} />
              <Field label="Title template" hint="%page% and %site% are replaced" value={cfg.titleTemplate} onChange={(v) => set({ titleTemplate: v })} />
              <Field label="Homepage title" value={cfg.defaultTitle} onChange={(v) => set({ defaultTitle: v })} />
              <Area label="Default meta description" value={cfg.defaultDescription} onChange={(v) => set({ defaultDescription: v })} />
              <Field label="Default social image (og:image URL)" value={cfg.defaultOgImage} onChange={(v) => set({ defaultOgImage: v })} />
              <label className="flex items-center gap-2 text-sm mt-1">
                <input type="checkbox" checked={cfg.noindexSite} onChange={(e) => set({ noindexSite: e.target.checked })} />
                <span>Discourage search engines from indexing this site (staging)</span>
              </label>
            </div>
          </Panel>

          <Panel title="Content SEO analyzer" icon={Gauge}>
            <p className="text-xs text-muted-foreground mb-3">Paste any page's content to get a live SEO score and checklist — like Yoast / Rank Math. The same analyzer appears in the Blog &amp; Recipe editors.</p>
            <ContentAnalyzer />
          </Panel>

          <Panel title="Structured data (schema.org)" icon={ShieldCheck}>
            <div className="grid sm:grid-cols-2 gap-3">
              <Field label="Organization name" value={cfg.organizationName} onChange={(v) => set({ organizationName: v })} />
              <Field label="Organization logo URL" value={cfg.organizationLogo} onChange={(v) => set({ organizationLogo: v })} />
            </div>
            <p className="text-xs text-muted-foreground mt-2">Emitted as Organization + WebSite JSON-LD on every page. Products & blog posts get Product / Article schema automatically.</p>
          </Panel>

          <Panel title="Social profiles" icon={Share2}>
            <Area label="Profile URLs (one per line)" value={cfg.socialProfiles.join("\n")} onChange={(v) => set({ socialProfiles: v.split("\n").map((s) => s.trim()).filter(Boolean) })} rows={3} />
            <div className="grid sm:grid-cols-2 gap-3 mt-3">
              <Field label="Twitter handle (@name)" value={cfg.twitterHandle} onChange={(v) => set({ twitterHandle: v })} />
              <Field label="Facebook App ID" value={cfg.facebookAppId} onChange={(v) => set({ facebookAppId: v })} />
            </div>
          </Panel>

          <Panel title="Search console verification" icon={ShieldCheck}>
            <div className="grid sm:grid-cols-2 gap-3">
              <Field label="Google verification code" value={cfg.googleVerification} onChange={(v) => set({ googleVerification: v })} />
              <Field label="Bing verification code" value={cfg.bingVerification} onChange={(v) => set({ bingVerification: v })} />
            </div>
            <p className="text-xs text-muted-foreground mt-2">Added as meta tags in the site head so Google/Bing can verify ownership.</p>
          </Panel>
        </div>

        {/* Google snippet preview */}
        <div className="lg:sticky lg:top-6 h-fit">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Google preview</p>
          <div className="border rounded-2xl p-4 bg-card">
            <p className="text-[13px] text-emerald-700">banglarfish.com › product › padma-hilsa</p>
            <p className="text-[18px] text-[#1a0dab] leading-snug truncate">{previewTitle}</p>
            <p className="text-[13px] text-[#4d5156] mt-1 line-clamp-3">{cfg.defaultDescription}</p>
          </div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mt-4 mb-2">Social card</p>
          <div className="border rounded-2xl overflow-hidden bg-card">
            {cfg.defaultOgImage && <img src={cfg.defaultOgImage} alt="" className="w-full h-32 object-cover" />}
            <div className="p-3">
              <p className="text-[11px] text-muted-foreground uppercase">banglarfish.com</p>
              <p className="font-semibold text-sm truncate">{cfg.defaultTitle}</p>
              <p className="text-xs text-muted-foreground line-clamp-2">{cfg.defaultDescription}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Panel({ title, icon: Icon, children }: { title: string; icon: typeof Globe; children: React.ReactNode }) {
  return (
    <div className="border rounded-2xl p-5 bg-card">
      <h3 className="font-semibold mb-4 flex items-center gap-2"><Icon className="h-5 w-5 text-primary" /> {title}</h3>
      {children}
    </div>
  );
}

function Field({ label, value, onChange, hint }: { label: string; value: string; onChange: (v: string) => void; hint?: string }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{label}{hint && <span className="normal-case font-normal text-muted-foreground"> · {hint}</span>}</span>
      <input value={value} onChange={(e) => onChange(e.target.value)} className="mt-1 w-full border rounded-md px-3 py-2 text-sm" />
    </label>
  );
}

function Area({ label, value, onChange, rows = 2 }: { label: string; value: string; onChange: (v: string) => void; rows?: number }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{label}</span>
      <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={rows} className="mt-1 w-full border rounded-md px-3 py-2 text-sm" />
    </label>
  );
}

function ContentAnalyzer() {
  const [f, setF] = useState({ title: "", description: "", slug: "", content: "" });
  return (
    <div className="space-y-3">
      <input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="Page / product title" className="w-full border rounded-md px-3 py-2 text-sm" />
      <input value={f.slug} onChange={(e) => setF({ ...f, slug: e.target.value })} placeholder="url-slug" className="w-full border rounded-md px-3 py-2 text-sm font-mono" />
      <textarea value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} placeholder="Meta description" rows={2} className="w-full border rounded-md px-3 py-2 text-sm" />
      <textarea value={f.content} onChange={(e) => setF({ ...f, content: e.target.value })} placeholder="Paste the page content to analyze…" rows={4} className="w-full border rounded-md px-3 py-2 text-sm" />
      <SeoAnalyzer title={f.title} description={f.description} slug={f.slug} content={f.content} hasImage={false} />
    </div>
  );
}
