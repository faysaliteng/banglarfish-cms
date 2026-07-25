import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { adminResetConfig } from "@/lib/admin-reset.functions";
import { RotateCcw, Palette, Code, Home, Settings as SettingsIcon, MapPin, Sparkles, KeyRound, Search, AlertTriangle, Loader2, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/reset")({ component: ResetPage });

type Item = { target: string; label: string; desc: string; icon: React.ComponentType<{ className?: string }>; tone: "safe" | "care" | "danger" };

const ITEMS: Item[] = [
  { target: "appearance", label: "Reset appearance", desc: "Theme & layout + Custom Code + Homepage back to defaults. The quickest fix if a design change broke the storefront.", icon: RotateCcw, tone: "safe" },
  { target: "theme", label: "Reset theme & layout", desc: "Colors, surfaces, backgrounds and hero layout back to the default theme.", icon: Palette, tone: "safe" },
  { target: "customcode", label: "Clear custom code", desc: "Remove all custom CSS, header and footer code.", icon: Code, tone: "safe" },
  { target: "homepage", label: "Reset homepage", desc: "Homepage copy and section on/off switches back to defaults.", icon: Home, tone: "safe" },
  { target: "settings", label: "Reset store settings", desc: "Store name, currency, phone, shipping and tax back to defaults.", icon: SettingsIcon, tone: "care" },
  { target: "delivery", label: "Reset delivery areas", desc: "Turn off area restriction and restore the default coverage list.", icon: MapPin, tone: "care" },
  { target: "seo", label: "Reset SEO", desc: "SEO titles, descriptions and schema back to defaults.", icon: Search, tone: "care" },
  { target: "branding", label: "Reset branding", desc: "Store name, logo, favicon and announcement back to defaults. Removes your uploaded logo/favicon.", icon: Sparkles, tone: "danger" },
  { target: "credentials", label: "Reset payment / SMS / social keys", desc: "Clears all payment, SMS and social-login API credentials. You will need to re-enter them.", icon: KeyRound, tone: "danger" },
  { target: "everything", label: "Restore ALL settings to defaults", desc: "Resets theme, code, homepage, store, branding, delivery and SEO. Products, orders, users, pages and media are kept.", icon: ShieldAlert, tone: "danger" },
];

const TONE: Record<Item["tone"], { chip: string; border: string; btn: string }> = {
  safe: { chip: "bg-emerald-100 text-emerald-700", border: "border-border", btn: "bg-primary text-primary-foreground hover:bg-primary/90" },
  care: { chip: "bg-amber-100 text-amber-700", border: "border-amber-300/50", btn: "bg-amber-600 text-white hover:bg-amber-700" },
  danger: { chip: "bg-red-100 text-red-700", border: "border-red-300/60", btn: "bg-red-600 text-white hover:bg-red-700" },
};

function ResetPage() {
  const resetFn = useServerFn(adminResetConfig);
  const [busy, setBusy] = useState<string | null>(null);

  async function reset(item: Item) {
    const strong = item.tone === "danger" ? `\n\nThis cannot be undone.` : "";
    if (!confirm(`${item.label}?\n\n${item.desc}${strong}`)) return;
    setBusy(item.target);
    try {
      await resetFn({ data: { target: item.target } });
      toast.success(`${item.label} — done. Reloading…`);
      setTimeout(() => window.location.reload(), 1000);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Reset failed");
      setBusy(null);
    }
  }

  return (
    <div className="pb-16 max-w-4xl">
      <div className="mb-5">
        <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2"><RotateCcw className="h-6 w-6" /> Restore Defaults</h1>
        <p className="text-sm text-muted-foreground mt-1">Messed something up? Roll back any part of your configuration to its built-in default. This only resets settings — your <strong>products, orders, customers, pages, blog and media are never touched</strong>.</p>
      </div>

      <div className="mb-6 flex items-start gap-2 rounded-xl border border-blue-300/60 bg-blue-50 text-blue-800 px-4 py-3 text-sm">
        <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
        <span>Start with <strong>Reset appearance</strong> if a theme or Custom Code change broke the site — it restores the design without losing any content.</span>
      </div>

      <div className="space-y-3">
        {ITEMS.map((item) => {
          const Icon = item.icon;
          const tone = TONE[item.tone];
          return (
            <div key={item.target} className={`flex items-start gap-4 rounded-2xl border ${tone.border} bg-card p-4`}>
              <div className="grid place-items-center h-10 w-10 rounded-xl bg-muted text-foreground shrink-0"><Icon className="h-5 w-5" /></div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold">{item.label}</span>
                  <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${tone.chip}`}>{item.tone === "safe" ? "Safe" : item.tone === "care" ? "Careful" : "Danger"}</span>
                </div>
                <p className="text-sm text-muted-foreground mt-0.5">{item.desc}</p>
              </div>
              <button onClick={() => reset(item)} disabled={!!busy} className={`shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-semibold disabled:opacity-60 ${tone.btn}`}>
                {busy === item.target ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />} Reset
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
