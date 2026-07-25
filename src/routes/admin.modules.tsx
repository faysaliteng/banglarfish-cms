import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { adminGetHomepage, adminSaveHomepage } from "@/lib/admin-content.functions";
import type { Homepage, HomeSections } from "@/lib/types";
import { Blocks, Save, Grid3x3, Workflow, Star, Sparkles, Megaphone, PackagePlus, ChefHat, Newspaper, Quote, Mail } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/modules")({ component: ModulesPage });

const MODULES: { key: keyof HomeSections; label: string; desc: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: "categories", label: "Category grid", desc: "Shop-by-category tiles on the homepage.", icon: Grid3x3 },
  { key: "howItWorks", label: "How it works", desc: "The 3-step ordering explainer band.", icon: Workflow },
  { key: "bestSellers", label: "Best sellers", desc: "Grid of your best-selling products.", icon: Star },
  { key: "masala", label: "Featured category band", desc: "Promotes a chosen category (e.g. Fish Masala).", icon: Sparkles },
  { key: "promos", label: "Promo banners", desc: "Two large clickable promotional banners.", icon: Megaphone },
  { key: "newArrivals", label: "New arrivals", desc: "Grid of your newest products.", icon: PackagePlus },
  { key: "recipes", label: "Recipes", desc: "Recipe cards + the /recipes page & nav link.", icon: ChefHat },
  { key: "blog", label: "Blog", desc: "Article cards + the /blog page & nav link.", icon: Newspaper },
  { key: "testimonials", label: "Testimonials", desc: "Customer review quotes.", icon: Quote },
  { key: "newsletter", label: "Newsletter signup", desc: "Email capture band with your offer.", icon: Mail },
];

function ModulesPage() {
  const getFn = useServerFn(adminGetHomepage);
  const saveFn = useServerFn(adminSaveHomepage);
  const [h, setH] = useState<Homepage | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getFn().then(setH).catch((e) => toast.error(e instanceof Error ? e.message : "Failed"));
  }, [getFn]);

  if (!h) return <p className="text-sm text-muted-foreground">Loading…</p>;

  const toggle = (key: keyof HomeSections) => setH({ ...h, sections: { ...h.sections, [key]: !h.sections[key] } });

  async function save() {
    if (!h) return;
    setSaving(true);
    try {
      await saveFn({ data: h });
      toast.success("Modules updated");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  const onCount = MODULES.filter((m) => h.sections[m.key]).length;

  return (
    <div className="pb-16 max-w-4xl">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-1">
        <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2 min-w-0"><Blocks className="h-6 w-6 shrink-0" /> Modules</h1>
        <button onClick={save} disabled={saving} className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-md font-semibold hover:bg-primary/90 disabled:opacity-60">
          <Save className="h-4 w-4" /> {saving ? "Saving…" : "Save"}
        </button>
      </div>
      <p className="text-sm text-muted-foreground mb-6">Your CMS features as toggleable modules — the no-code way to shape the store. Turn a module off to hide it everywhere. {onCount}/{MODULES.length} enabled. (Developers: see Help &amp; Docs → Extending the CMS for adding your own.)</p>

      <div className="grid sm:grid-cols-2 gap-3">
        {MODULES.map((m) => {
          const on = h.sections[m.key];
          const Icon = m.icon;
          return (
            <button key={m.key} onClick={() => toggle(m.key)} className={`flex items-start gap-3 rounded-2xl border p-4 text-left transition ${on ? "border-primary bg-primary/5" : "hover:bg-muted"}`}>
              <div className={`grid place-items-center h-10 w-10 rounded-xl shrink-0 ${on ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}><Icon className="h-5 w-5" /></div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold">{m.label}</span>
                  <span className={`relative h-5 w-9 shrink-0 rounded-full transition ${on ? "bg-primary" : "bg-muted-foreground/30"}`}>
                    <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${on ? "left-[18px]" : "left-0.5"}`} />
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{m.desc}</p>
                <p className={`text-[11px] font-semibold mt-1 ${on ? "text-primary" : "text-muted-foreground"}`}>{on ? "Enabled" : "Disabled"}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
