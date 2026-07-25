import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { Save, Plus, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { adminGetHomepage, adminSaveHomepage, adminListMedia } from "@/lib/admin-content.functions";
import type { Homepage } from "@/lib/types";

export const Route = createFileRoute("/admin/homepage")({ component: HomepageEditor });

type MediaItem = { id: string; name: string; url: string; size: string; uploadedAt: string };

function HomepageEditor() {
  const getHomepageFn = useServerFn(adminGetHomepage);
  const saveHomepageFn = useServerFn(adminSaveHomepage);
  const listMediaFn = useServerFn(adminListMedia);

  const [h, setH] = useState<Homepage | null>(null);
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [hp, m] = await Promise.all([getHomepageFn(), listMediaFn()]);
        if (cancelled) return;
        setH(hp);
        setMedia(m as MediaItem[]);
      } catch (err) {
        if (!cancelled) toast.error(err instanceof Error ? err.message : "Failed to load homepage");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const upd = <K extends keyof Homepage>(k: K, v: Homepage[K]) => setH((prev) => (prev ? { ...prev, [k]: v } : prev));

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!h) return;
    setSaving(true);
    try {
      await saveHomepageFn({ data: h });
      toast.success("Homepage saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setSaving(false);
    }
  }

  if (loading || !h) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading homepage…
      </div>
    );
  }

  return (
    <form onSubmit={save}>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Homepage Editor</h1>
          <p className="text-sm text-muted-foreground">Every section of the homepage is editable here</p>
        </div>
        <button disabled={saving} className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2 rounded-md text-sm font-semibold disabled:opacity-60">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} {saving ? "Saving…" : "Save changes"}
        </button>
      </div>

      <div className="grid lg:grid-cols-2 gap-6 max-w-6xl">
        <Card title="Sections — show / hide">
          <p className="text-xs text-muted-foreground -mt-2 mb-1">Turn storefront sections on or off. Off = hidden from the homepage.</p>
          <div className="grid grid-cols-2 gap-2">
            {(([
              ["categories", "Categories"], ["howItWorks", "How it works"], ["bestSellers", "Best sellers"],
              ["masala", "Fish masala"], ["promos", "Promo banners"], ["newArrivals", "New arrivals"],
              ["recipes", "Recipes"], ["blog", "Blog"], ["testimonials", "Testimonials"], ["newsletter", "Newsletter"],
            ]) as [keyof Homepage["sections"], string][]).map(([key, label]) => (
              <label key={key} className="flex items-center gap-2 text-sm border rounded-md px-3 py-2 cursor-pointer hover:bg-muted">
                <input type="checkbox" checked={h.sections[key]} onChange={(e) => upd("sections", { ...h.sections, [key]: e.target.checked } as Homepage["sections"])} />
                {label}
              </label>
            ))}
          </div>
        </Card>

        <Card title="Recipes, Blog & Masala">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Recipes eyebrow" value={h.recipesEyebrow} onChange={(v) => upd("recipesEyebrow", v)} />
            <Field label="Recipes title" value={h.recipesTitle} onChange={(v) => upd("recipesTitle", v)} />
            <Field label="Blog eyebrow" value={h.blogEyebrow} onChange={(v) => upd("blogEyebrow", v)} />
            <Field label="Blog title" value={h.blogTitle} onChange={(v) => upd("blogTitle", v)} />
            <Field label="Masala eyebrow" value={h.masalaEyebrow} onChange={(v) => upd("masalaEyebrow", v)} />
            <Field label="Masala title" value={h.masalaTitle} onChange={(v) => upd("masalaTitle", v)} />
          </div>
          <Field label="Masala category slug" value={h.masalaCategory} onChange={(v) => upd("masalaCategory", v)} />
        </Card>

        <Card title="Hero Section">
          <Field label="Eyebrow text" value={h.heroEyebrow} onChange={(v) => upd("heroEyebrow", v)} />
          <Field label="Heading (line 1)" value={h.heroTitleTop} onChange={(v) => upd("heroTitleTop", v)} />
          <Field label="Heading (line 2, highlighted)" value={h.heroTitleBottom} onChange={(v) => upd("heroTitleBottom", v)} />
          <TextArea label="Subtitle" value={h.heroSubtitle} onChange={(v) => upd("heroSubtitle", v)} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Primary CTA label" value={h.heroCtaPrimary.label} onChange={(v) => upd("heroCtaPrimary", { ...h.heroCtaPrimary, label: v })} />
            <Field label="Primary CTA link" value={h.heroCtaPrimary.href} onChange={(v) => upd("heroCtaPrimary", { ...h.heroCtaPrimary, href: v })} />
            <Field label="Secondary CTA label" value={h.heroCtaSecondary.label} onChange={(v) => upd("heroCtaSecondary", { ...h.heroCtaSecondary, label: v })} />
            <Field label="Secondary CTA link" value={h.heroCtaSecondary.href} onChange={(v) => upd("heroCtaSecondary", { ...h.heroCtaSecondary, href: v })} />
          </div>
          <div>
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Hero image</span>
            <div className="mt-2 flex items-start gap-3">
              {h.heroImage ? <img src={h.heroImage} alt="hero preview" className="h-24 w-32 object-cover rounded border" /> : null}
              <select value={h.heroImage} onChange={(e) => upd("heroImage", e.target.value)} className="flex-1 border rounded-md px-3 py-2 text-sm">
                {media.length === 0 ? <option value={h.heroImage}>{h.heroImage || "No media"}</option> : null}
                {media.map((m) => <option key={m.id} value={m.url}>{m.name}</option>)}
              </select>
            </div>
          </div>
        </Card>

        <Card title="Hero Stats (3 items)">
          {h.stats.map((s, i) => (
            <div key={i} className="grid grid-cols-1 sm:grid-cols-2 gap-2 items-end">
              <Field label={`Value #${i + 1}`} value={s.n} onChange={(v) => upd("stats", h.stats.map((x, j) => (j === i ? { ...x, n: v } : x)))} />
              <Field label="Label" value={s.label} onChange={(v) => upd("stats", h.stats.map((x, j) => (j === i ? { ...x, label: v } : x)))} />
            </div>
          ))}
        </Card>

        <Card title="Trust Bar Features">
          {h.features.map((f, i) => (
            <div key={i} className="border rounded-md p-3 space-y-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <label className="block">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Icon</span>
                  <select value={f.icon} onChange={(e) => upd("features", h.features.map((x, j) => (j === i ? { ...x, icon: e.target.value as HomeFeatureIcon } : x)))} className="mt-1 w-full border rounded-md px-3 py-2 text-sm">
                    <option value="truck">Truck</option>
                    <option value="snowflake">Snowflake</option>
                    <option value="shield">Shield</option>
                    <option value="clock">Clock</option>
                  </select>
                </label>
                <Field label="Title" value={f.title} onChange={(v) => upd("features", h.features.map((x, j) => (j === i ? { ...x, title: v } : x)))} />
              </div>
              <Field label="Description" value={f.desc} onChange={(v) => upd("features", h.features.map((x, j) => (j === i ? { ...x, desc: v } : x)))} />
            </div>
          ))}
        </Card>

        <Card title="Section Headings">
          <Field label="Categories eyebrow" value={h.categoriesEyebrow} onChange={(v) => upd("categoriesEyebrow", v)} />
          <Field label="Categories title" value={h.categoriesTitle} onChange={(v) => upd("categoriesTitle", v)} />
          <Field label="Best sellers eyebrow" value={h.bestSellersEyebrow} onChange={(v) => upd("bestSellersEyebrow", v)} />
          <Field label="Best sellers title" value={h.bestSellersTitle} onChange={(v) => upd("bestSellersTitle", v)} />
          <Field label="New arrivals eyebrow" value={h.newArrivalsEyebrow} onChange={(v) => upd("newArrivalsEyebrow", v)} />
          <Field label="New arrivals title" value={h.newArrivalsTitle} onChange={(v) => upd("newArrivalsTitle", v)} />
          <Field label="Testimonials eyebrow" value={h.testimonialsEyebrow} onChange={(v) => upd("testimonialsEyebrow", v)} />
          <Field label="Testimonials title" value={h.testimonialsTitle} onChange={(v) => upd("testimonialsTitle", v)} />
        </Card>

        <Card title="Promo Banners">
          {h.promos.map((p, i) => (
            <div key={i} className="border rounded-md p-3 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs font-semibold">Banner #{i + 1}</span>
                <button type="button" onClick={() => upd("promos", h.promos.filter((_, j) => j !== i))} className="text-destructive text-xs inline-flex items-center gap-1"><Trash2 className="h-3 w-3" /> Remove</button>
              </div>
              <Field label="Subtitle" value={p.subtitle} onChange={(v) => upd("promos", h.promos.map((x, j) => (j === i ? { ...x, subtitle: v } : x)))} />
              <Field label="Title" value={p.title} onChange={(v) => upd("promos", h.promos.map((x, j) => (j === i ? { ...x, title: v } : x)))} />
              <Field label="Link" value={p.href} onChange={(v) => upd("promos", h.promos.map((x, j) => (j === i ? { ...x, href: v } : x)))} />
              <label className="block">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Theme</span>
                <select value={p.theme} onChange={(e) => upd("promos", h.promos.map((x, j) => (j === i ? { ...x, theme: e.target.value as HomePromoTheme } : x)))} className="mt-1 w-full border rounded-md px-3 py-2 text-sm">
                  <option value="primary">Primary (blue)</option>
                  <option value="brand">Brand (coral)</option>
                </select>
              </label>
            </div>
          ))}
          <button type="button" onClick={() => upd("promos", [...h.promos, { title: "New Banner", subtitle: "Subtitle", href: "/shop", theme: "primary" }])} className="text-sm inline-flex items-center gap-1 text-primary font-semibold"><Plus className="h-4 w-4" /> Add banner</button>
        </Card>

        <Card title="Testimonials">
          {h.testimonials.map((t, i) => (
            <div key={i} className="border rounded-md p-3 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs font-semibold">Review #{i + 1}</span>
                <button type="button" onClick={() => upd("testimonials", h.testimonials.filter((_, j) => j !== i))} className="text-destructive text-xs inline-flex items-center gap-1"><Trash2 className="h-3 w-3" /> Remove</button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <Field label="Name" value={t.n} onChange={(v) => upd("testimonials", h.testimonials.map((x, j) => (j === i ? { ...x, n: v } : x)))} />
                <Field label="Location" value={t.loc} onChange={(v) => upd("testimonials", h.testimonials.map((x, j) => (j === i ? { ...x, loc: v } : x)))} />
              </div>
              <TextArea label="Quote" value={t.t} onChange={(v) => upd("testimonials", h.testimonials.map((x, j) => (j === i ? { ...x, t: v } : x)))} />
            </div>
          ))}
          <button type="button" onClick={() => upd("testimonials", [...h.testimonials, { n: "New Customer", loc: "City", t: "Review text..." }])} className="text-sm inline-flex items-center gap-1 text-primary font-semibold"><Plus className="h-4 w-4" /> Add review</button>
        </Card>

        <Card title="Newsletter">
          <Field label="Title" value={h.newsletterTitle} onChange={(v) => upd("newsletterTitle", v)} />
          <Field label="Subtitle" value={h.newsletterSubtitle} onChange={(v) => upd("newsletterSubtitle", v)} />
          <Field label="Button label" value={h.newsletterCta} onChange={(v) => upd("newsletterCta", v)} />
        </Card>
      </div>
    </form>
  );
}

type HomeFeatureIcon = Homepage["features"][number]["icon"];
type HomePromoTheme = Homepage["promos"][number]["theme"];

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-card border rounded-xl p-5">
      <h3 className="font-semibold mb-4">{title}</h3>
      <div className="space-y-3">{children}</div>
    </div>
  );
}
function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{label}</span>
      <input value={value} onChange={(e) => onChange(e.target.value)} className="mt-1 w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
    </label>
  );
}
function TextArea({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{label}</span>
      <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={3} className="mt-1 w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
    </label>
  );
}
