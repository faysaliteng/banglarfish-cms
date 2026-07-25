import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { applyHomepageTemplate } from "@/lib/homepage-template.functions";
import { HOMEPAGE_TEMPLATES, HOMEPAGE_TEMPLATE_CATEGORIES, type HomepageTemplate } from "@/lib/homepage-templates";
import { LayoutTemplate, Search, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/homepage-templates")({ component: HomepageTemplatesPage });

const SECTION_LABELS: [keyof HomepageTemplate["sections"], string][] = [
  ["categories", "Categories"], ["howItWorks", "How it works"], ["bestSellers", "Best sellers"], ["masala", "Featured"],
  ["promos", "Promos"], ["newArrivals", "New arrivals"], ["recipes", "Recipes"], ["blog", "Blog"], ["testimonials", "Reviews"], ["newsletter", "Newsletter"],
];

function HomepageTemplatesPage() {
  const applyFn = useServerFn(applyHomepageTemplate);
  const [busy, setBusy] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("all");

  const shown = useMemo(() => {
    const t = q.trim().toLowerCase();
    return HOMEPAGE_TEMPLATES.filter((x) => (cat === "all" || x.category === cat) && (!t || `${x.name} ${x.description} ${x.copy.heroTitleTop} ${x.copy.heroTitleBottom}`.toLowerCase().includes(t)));
  }, [q, cat]);

  async function apply(t: HomepageTemplate) {
    if (!confirm(`Apply the "${t.name}" homepage template?\n\nThis changes your hero layout, which sections show, and the homepage copy. Your theme colors and products are kept.`)) return;
    setBusy(t.id);
    try {
      await applyFn({ data: { id: t.id } });
      toast.success(`Applied "${t.name}" — reloading…`);
      setTimeout(() => window.location.reload(), 1000);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to apply");
      setBusy(null);
    }
  }

  return (
    <div className="pb-16">
      <div className="mb-4">
        <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2"><LayoutTemplate className="h-6 w-6" /> Homepage Templates <span className="text-sm text-muted-foreground font-normal">({HOMEPAGE_TEMPLATES.length})</span></h1>
        <p className="text-sm text-muted-foreground mt-1">One-click homepage layouts &amp; copy. Applying one changes your hero, sections and wording — your theme colors and products stay. Fine-tune afterwards in Homepage editor.</p>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search templates…" className="w-full border rounded-md pl-9 pr-3 py-2 text-sm bg-card" />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {["all", ...HOMEPAGE_TEMPLATE_CATEGORIES].map((c) => (
            <button key={c} onClick={() => setCat(c)} className={`text-xs px-2.5 py-1 rounded-full border capitalize transition ${cat === c ? "bg-primary text-primary-foreground border-primary" : "hover:bg-muted"}`}>{c}</button>
          ))}
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {shown.map((t) => (
          <div key={t.id} className="border rounded-2xl bg-card overflow-hidden flex flex-col">
            <MiniPreview t={t} />
            <div className="p-4 flex flex-col flex-1">
              <div className="flex items-center justify-between gap-2">
                <p className="font-semibold truncate">{t.name}</p>
                <span className="text-[10px] uppercase tracking-wide text-muted-foreground shrink-0">{t.hero}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2 flex-1">{t.description}</p>
              <div className="flex flex-wrap gap-1 mt-2">
                {SECTION_LABELS.filter(([k]) => t.sections[k]).slice(0, 5).map(([k, label]) => (
                  <span key={k} className="text-[10px] bg-muted rounded px-1.5 py-0.5">{label}</span>
                ))}
              </div>
              <button onClick={() => apply(t)} disabled={!!busy} className="mt-3 inline-flex items-center justify-center gap-1.5 bg-primary text-primary-foreground py-2 rounded-md text-sm font-semibold hover:bg-primary/90 disabled:opacity-60">
                {busy === t.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Apply
              </button>
            </div>
          </div>
        ))}
        {shown.length === 0 && <p className="text-sm text-muted-foreground col-span-full text-center py-10">No templates match.</p>}
      </div>
    </div>
  );
}

// Small schematic preview of the hero layout + copy.
function MiniPreview({ t }: { t: HomepageTemplate }) {
  const bar = "block rounded bg-primary/70";
  const hero = t.hero;
  return (
    <div className="h-28 bg-gradient-to-br from-primary/10 via-muted to-[var(--color-brand)]/10 p-3 border-b relative overflow-hidden">
      {hero === "gradient" ? (
        <div className="h-full rounded-lg flex flex-col items-center justify-center gap-1.5" style={{ background: "linear-gradient(135deg, var(--color-primary), var(--color-brand))" }}>
          <span className="block h-2 w-2/3 rounded bg-white/80" /><span className="block h-2 w-1/3 rounded bg-white/60" />
        </div>
      ) : hero === "fullbleed" ? (
        <div className="h-full rounded-lg bg-muted relative"><div className="absolute inset-3 flex flex-col justify-end gap-1"><span className={`${bar} h-2 w-2/3`} /><span className="block h-2.5 w-10 rounded bg-brand mt-1" /></div></div>
      ) : hero === "split" || hero === "diagonal" || hero === "showcase" ? (
        <div className="h-full flex gap-2"><div className="flex-1 space-y-1.5 py-1"><span className={`${bar} h-2 w-4/5`} /><span className={`${bar} h-2 w-2/3`} /><span className="block h-2.5 w-10 rounded bg-brand mt-1" /></div><div className={`w-1/2 rounded bg-muted ${hero === "diagonal" ? "[clip-path:polygon(20%_0,100%_0,100%_100%,0_100%)]" : ""}`} /></div>
      ) : (
        <div className="h-full flex flex-col items-center justify-center gap-1.5"><span className={`${bar} h-2 w-3/5`} /><span className={`${bar} h-2 w-2/5`} /><span className="block h-2.5 w-10 rounded bg-brand mt-1" /></div>
      )}
    </div>
  );
}
