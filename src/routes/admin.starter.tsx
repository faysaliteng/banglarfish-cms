import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { applyStarterTemplate } from "@/lib/starter.functions";
import { STARTER_TEMPLATES } from "@/lib/starter-templates";
import { LayoutTemplate, Shirt, Smartphone, Apple, UtensilsCrossed, Sparkles, Sofa, Package, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/starter")({ component: StarterPage });

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = { Shirt, Smartphone, Apple, UtensilsCrossed, Sparkles, Sofa };

function StarterPage() {
  const applyFn = useServerFn(applyStarterTemplate);
  const [busy, setBusy] = useState<string | null>(null);

  async function apply(id: string, name: string) {
    if (!confirm(`Apply the "${name}" starter template?\n\nThis sets the theme, currency, homepage copy & branding, and adds this vertical's demo categories & products. Existing items are kept (nothing is deleted).`)) return;
    setBusy(id);
    try {
      const res = await applyFn({ data: { id } });
      toast.success(`Applied ${name} — added ${res.products} products, ${res.categories} categories. Reloading…`);
      setTimeout(() => window.location.reload(), 1200);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to apply");
      setBusy(null);
    }
  }

  return (
    <div className="pb-16">
      <div className="mb-5">
        <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2"><LayoutTemplate className="h-6 w-6" /> Starter Templates &amp; Demo Data</h1>
        <p className="text-sm text-muted-foreground mt-1">One-click demo stores that prove this CMS works for any product, any currency. Applying one sets the theme, currency, homepage &amp; branding and seeds realistic demo products — then customize from there.</p>
      </div>

      <div className="mb-6 rounded-xl border border-amber-300/60 bg-amber-50 text-amber-800 px-4 py-3 text-sm">
        <strong>Best on a fresh store.</strong> Applying a template <em>adds</em> its demo products &amp; categories (it never deletes yours) and switches the currency — so leftover products from another vertical may need re-pricing or deleting. Demo images are placeholders you can replace in Products.
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {STARTER_TEMPLATES.map((t) => {
          const Icon = ICONS[t.icon] ?? Package;
          return (
            <div key={t.id} className="border rounded-2xl p-5 bg-card flex flex-col">
              <div className="flex items-center gap-3 mb-3">
                <div className="grid place-items-center h-11 w-11 rounded-xl text-white shrink-0" style={{ background: "var(--bf-grad3, linear-gradient(135deg,var(--color-primary),var(--color-brand)))" }}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold truncate">{t.name}</p>
                  <p className="text-[11px] text-muted-foreground">{t.currency.code} · theme: {t.themePreset}</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground flex-1">{t.description}</p>
              <div className="flex items-center gap-3 text-xs text-muted-foreground mt-3">
                <span className="inline-flex items-center gap-1"><Package className="h-3.5 w-3.5" /> {t.products.length} products</span>
                <span>· {t.categories.length} categories</span>
              </div>
              <button
                onClick={() => apply(t.id, t.name)}
                disabled={!!busy}
                className="mt-4 inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground py-2.5 rounded-md font-semibold hover:bg-primary/90 disabled:opacity-60"
              >
                {busy === t.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} {busy === t.id ? "Applying…" : "Apply this template"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
