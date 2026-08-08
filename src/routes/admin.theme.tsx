import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { adminGetTheme, adminSaveTheme } from "@/lib/theme.functions";
import { THEME_PRESETS, PRESET_META, FONT_OPTIONS, defaultTheme, loadPresetGallery } from "@/lib/theme-presets";
import type { Theme } from "@/lib/types";
import { Save, Check, Palette, ShoppingBag, Star, Download, Upload, RotateCcw, Sparkles } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/theme")({ component: ThemePage });

const SURFACES: [Theme["surface"], string, string][] = [
  ["elevated", "Elevated", "Soft drop shadow"],
  ["glass", "Glass 3D", "Blur + translucency"],
  ["aurora", "Aurora", "Glass + glow ring"],
  ["neo", "Neo 3D", "Extruded dual-tone"],
  ["clay", "Clay", "Puffy claymorphism"],
  ["glossy", "Glossy", "Shiny top sheen"],
  ["outline", "Outline", "Gradient border"],
  ["flat", "Flat", "Crisp borders only"],
];
const BACKGROUNDS: [Theme["bg"], string][] = [
  ["solid", "Solid"], ["gradient", "Gradient"], ["mesh", "Mesh blobs"], ["aurora", "Aurora (animated)"],
  ["grid", "Grid lines"], ["dots", "Dots"], ["waves", "Waves"], ["rays", "Light rays"], ["noise", "Noise grain"],
];
const HEROES: Theme["hero"][] = ["split", "centered", "fullbleed", "minimal", "spotlight", "diagonal", "showcase", "gradient"];

function ThemePage() {
  const getFn = useServerFn(adminGetTheme);
  const saveFn = useServerFn(adminSaveTheme);
  const [theme, setTheme] = useState<Theme | null>(null);
  const [saving, setSaving] = useState(false);
  const [cat, setCat] = useState<string>("all");

  useEffect(() => {
    getFn().then((t) => setTheme({ ...defaultTheme, ...t })).catch((e) => toast.error(e instanceof Error ? e.message : "Failed"));
  }, [getFn]);

  // The full preset gallery is admin-only, so it is code-split out of the
  // storefront bundle and pulled in here on mount.
  const [galleryReady, setGalleryReady] = useState(false);
  useEffect(() => { loadPresetGallery().then(() => setGalleryReady(true)).catch(() => setGalleryReady(true)); }, []);
  const categories = useMemo(() => ["all", ...Array.from(new Set(PRESET_META.map((p) => p.category)))], [galleryReady]);

  if (!theme) return <p className="text-sm text-muted-foreground">Loading…</p>;

  const set = (patch: Partial<Theme>) => setTheme({ ...theme, ...patch, preset: "custom" });
  const applyPreset = (key: string) => THEME_PRESETS[key] && setTheme({ ...THEME_PRESETS[key] });

  async function save() {
    if (!theme) return;
    setSaving(true);
    try {
      await saveFn({ data: theme });
      toast.success("Theme saved — reloading to apply…");
      setTimeout(() => window.location.reload(), 700);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save");
      setSaving(false);
    }
  }

  function exportTheme() {
    if (!theme) return;
    navigator.clipboard?.writeText(JSON.stringify(theme, null, 2)).then(
      () => toast.success("Theme JSON copied to clipboard"),
      () => toast.error("Clipboard blocked — use the box in Advanced"),
    );
  }
  function importTheme(raw: string) {
    try {
      const parsed = JSON.parse(raw) as Partial<Theme>;
      setTheme({ ...defaultTheme, ...parsed, preset: parsed.preset || "custom" });
      toast.success("Theme imported into the editor");
    } catch {
      toast.error("That isn't valid theme JSON");
    }
  }

  void galleryReady; // re-render once the gallery lands
  const shownPresets = PRESET_META.filter((p) => cat === "all" || p.category === cat);

  return (
    <div className="pb-16">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-1">
        <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2 min-w-0"><Palette className="h-6 w-6 shrink-0" /> Theme &amp; Layout</h1>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={() => theme && applyPreset(theme.preset in THEME_PRESETS ? theme.preset : "classic")} className="inline-flex items-center gap-1.5 border px-3 py-2.5 rounded-md text-sm font-medium hover:bg-muted" title="Reset to a preset"><RotateCcw className="h-4 w-4" /> Reset</button>
          <button onClick={exportTheme} className="inline-flex items-center gap-1.5 border px-3 py-2.5 rounded-md text-sm font-medium hover:bg-muted"><Download className="h-4 w-4" /> Export</button>
          <button onClick={save} disabled={saving} className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-md font-semibold hover:bg-primary/90 disabled:opacity-60">
            <Save className="h-4 w-4" /> {saving ? "Saving…" : "Save & Apply"}
          </button>
        </div>
      </div>
      <p className="text-sm text-muted-foreground mb-6">Customize the entire storefront — {PRESET_META.length} preset themes, colors, 3D surfaces, glass &amp; transparency, backgrounds, motion, typography and homepage layout. Changes apply site-wide after saving.</p>

      {/* Preset gallery */}
      <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
        <h3 className="font-semibold flex items-center gap-1.5"><Sparkles className="h-4 w-4 text-[var(--color-brand)]" /> Preset themes <span className="text-xs text-muted-foreground font-normal">({PRESET_META.length})</span></h3>
        <div className="flex flex-wrap gap-1.5">
          {categories.map((c) => (
            <button key={c} onClick={() => setCat(c)} className={`text-xs px-2.5 py-1 rounded-full border capitalize transition ${cat === c ? "bg-primary text-primary-foreground border-primary" : "hover:bg-muted"}`}>{c}</button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-8">
        {shownPresets.map((p) => {
          const t = THEME_PRESETS[p.key];
          if (!t) return null;
          const active = theme.preset === p.key;
          return (
            <button key={p.key} onClick={() => applyPreset(p.key)} className={`text-left rounded-xl border-2 overflow-hidden transition ${active ? "border-primary shadow-lg" : "border-transparent hover:border-muted-foreground/30"}`}>
              <div className="h-16 relative" style={{ background: t.dark ? `linear-gradient(135deg, ${t.card}, ${t.background})` : `linear-gradient(135deg, ${t.primary}, ${t.brand})` }}>
                <div className="absolute bottom-2 left-2 flex gap-1">
                  {[t.primary, t.brand, t.accent2].map((c, i) => <span key={i} className="h-4 w-4 rounded-full border border-white/60 shadow" style={{ background: c }} />)}
                </div>
                {active && <span className="absolute top-2 right-2 bg-white text-primary rounded-full p-0.5"><Check className="h-3 w-3" /></span>}
              </div>
              <div className="p-2 bg-card">
                <p className="text-sm font-semibold truncate">{p.label}</p>
                <p className="text-[11px] text-muted-foreground leading-tight line-clamp-1">{p.desc}</p>
              </div>
            </button>
          );
        })}
      </div>

      <div className="grid lg:grid-cols-[1fr_360px] gap-6">
        {/* Controls */}
        <div className="space-y-6 min-w-0">
          <Panel title="Colors">
            <div className="grid sm:grid-cols-2 gap-4">
              <ColorField label="Primary" value={theme.primary} onChange={(v) => set({ primary: v })} />
              <ColorField label="Brand / Accent" value={theme.brand} onChange={(v) => set({ brand: v })} />
              <ColorField label="Accent 2 (gradients)" value={theme.accent2} onChange={(v) => set({ accent2: v })} />
              <ColorField label="Background" value={theme.background} onChange={(v) => set({ background: v })} />
              <ColorField label="Card" value={theme.card} onChange={(v) => set({ card: v })} />
              <ColorField label="Text" value={theme.foreground} onChange={(v) => set({ foreground: v })} />
            </div>
          </Panel>

          <Panel title="Card surface (3D style)">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {SURFACES.map(([key, label, desc]) => (
                <button key={key} onClick={() => set({ surface: key })} className={`rounded-lg border-2 p-2.5 text-left transition ${theme.surface === key ? "border-primary bg-primary/5" : "border-muted hover:border-muted-foreground/40"}`}>
                  <SurfaceSwatch theme={theme} surface={key} />
                  <p className="text-xs font-semibold mt-1.5">{label}</p>
                  <p className="text-[10px] text-muted-foreground leading-tight">{desc}</p>
                </button>
              ))}
            </div>
          </Panel>

          <Panel title="Depth, glass & glow">
            <div className="grid sm:grid-cols-2 gap-x-6 gap-y-4">
              <RangeField label="Corner radius" suffix="px" min={0} max={32} value={theme.radius} onChange={(v) => set({ radius: v })} />
              <RangeField label="Shadow depth" min={0} max={100} value={theme.depth} onChange={(v) => set({ depth: v })} />
              <RangeField label="Glass blur" suffix="px" min={0} max={40} value={theme.blur} onChange={(v) => set({ blur: v })} help="Glass / Aurora surfaces" />
              <RangeField label="Card opacity" suffix="%" min={40} max={100} value={theme.opacity} onChange={(v) => set({ opacity: v })} help="Lower = more see-through" />
              <RangeField label="Colored glow" min={0} max={100} value={theme.glow} onChange={(v) => set({ glow: v })} />
            </div>
          </Panel>

          <Panel title="Background">
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              {BACKGROUNDS.map(([key, label]) => (
                <button key={key} onClick={() => set({ bg: key })} className={`rounded-lg border-2 p-1.5 text-center transition ${theme.bg === key ? "border-primary bg-primary/5" : "border-muted hover:border-muted-foreground/40"}`}>
                  <BgSwatch theme={theme} bg={key} />
                  <span className="text-[10px] font-medium mt-1 block leading-tight">{label}</span>
                </button>
              ))}
            </div>
          </Panel>

          <Panel title="Typography">
            <div className="grid sm:grid-cols-2 gap-4">
              <SelectField label="Body font" value={theme.font} onChange={(v) => set({ font: v as Theme["font"] })} options={FONT_OPTIONS} />
              <SelectField label="Heading font" value={theme.displayFont} onChange={(v) => set({ displayFont: v as Theme["font"] })} options={FONT_OPTIONS} />
              <div className="sm:col-span-2">
                <RangeField label="Type scale" suffix="%" min={90} max={115} value={Math.round(theme.fontScale * 100)} onChange={(v) => set({ fontScale: v / 100 })} />
              </div>
            </div>
          </Panel>

          <Panel title="Effects">
            <div className="grid sm:grid-cols-2 gap-3">
              <Toggle label="Gradient buttons" desc="Primary → brand gradient" checked={theme.gradientButtons} onChange={(v) => set({ gradientButtons: v })} />
              <Toggle label="Pill buttons" desc="Fully-rounded CTAs" checked={theme.pill} onChange={(v) => set({ pill: v })} />
              <Toggle label="3D hover tilt" desc="Cards tilt on hover" checked={theme.hover3d} onChange={(v) => set({ hover3d: v })} />
              <Toggle label="Animations" desc="Motion & background drift" checked={theme.animations} onChange={(v) => set({ animations: v })} />
              <Toggle label="Dark mode" desc="Dark UI variant" checked={theme.dark} onChange={(v) => set({ dark: v })} />
            </div>
          </Panel>

          <Panel title="Homepage hero layout">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {HEROES.map((h) => (
                <button key={h} onClick={() => set({ hero: h })} className={`rounded-lg border-2 p-3 text-center transition ${theme.hero === h ? "border-primary bg-primary/5" : "border-muted hover:border-muted-foreground/40"}`}>
                  <HeroThumb variant={h} />
                  <span className="text-xs font-medium capitalize mt-2 block">{h}</span>
                </button>
              ))}
            </div>
          </Panel>

          <Panel title="Advanced">
            <label className="block">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Custom CSS</span>
              <p className="text-[11px] text-muted-foreground mb-1">Injected site-wide after the theme. Use CSS variables like <code className="font-mono">var(--primary)</code>. Tag-closers &amp; scripts are stripped.</p>
              <textarea value={theme.customCss} onChange={(e) => set({ customCss: e.target.value })} rows={5} spellCheck={false} placeholder={"/* e.g. */\n.container-x { max-width: 1360px; }"} className="w-full border rounded-md px-3 py-2 text-xs font-mono bg-card resize-y" />
            </label>
            <label className="block mt-4">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Import theme JSON</span>
              <div className="mt-1 flex gap-2">
                <input type="text" placeholder='Paste {"preset":"custom",…} then Import' className="flex-1 border rounded-md px-2 py-1.5 text-xs font-mono" onKeyDown={(e) => { if (e.key === "Enter") importTheme((e.target as HTMLInputElement).value); }} id="bf-import" />
                <button onClick={() => importTheme((document.getElementById("bf-import") as HTMLInputElement)?.value || "")} className="inline-flex items-center gap-1.5 border px-3 py-1.5 rounded-md text-xs font-medium hover:bg-muted"><Upload className="h-3.5 w-3.5" /> Import</button>
              </div>
            </label>
          </Panel>
        </div>

        {/* Live preview */}
        <div className="lg:sticky lg:top-6 h-fit">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Live preview</p>
          <Preview theme={theme} />
          <p className="text-[11px] text-muted-foreground mt-2">Preview is approximate — Save &amp; Apply to see the full site with live backgrounds and motion.</p>
        </div>
      </div>
    </div>
  );
}

/* ---------------- helpers ---------------- */

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border rounded-2xl p-5 bg-card">
      <h3 className="font-semibold mb-4">{title}</h3>
      {children}
    </div>
  );
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block min-w-0">
      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{label}</span>
      <div className="mt-1 flex items-center gap-2">
        <input type="color" value={/^#[0-9a-fA-F]{6}$/.test(value) ? value : "#000000"} onChange={(e) => onChange(e.target.value)} className="h-9 w-11 shrink-0 rounded border cursor-pointer bg-transparent" />
        <input type="text" value={value} onChange={(e) => onChange(e.target.value)} className="flex-1 min-w-0 border rounded-md px-2 py-1.5 text-sm font-mono" />
      </div>
    </label>
  );
}

function SelectField({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: [string, string][] }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="mt-1 w-full border rounded-md px-3 py-2 text-sm bg-card">
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </label>
  );
}

function RangeField({ label, value, onChange, min, max, suffix, help }: { label: string; value: number; onChange: (v: number) => void; min: number; max: number; suffix?: string; help?: string }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center justify-between gap-2">
        <span>{label}</span><span className="text-foreground font-mono normal-case">{value}{suffix ?? ""}</span>
      </span>
      <input type="range" min={min} max={max} value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full mt-1 accent-[var(--color-primary)]" />
      {help && <span className="text-[10px] text-muted-foreground">{help}</span>}
    </label>
  );
}

function Toggle({ label, desc, checked, onChange }: { label: string; desc: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" onClick={() => onChange(!checked)} className={`flex items-center justify-between gap-3 rounded-lg border p-3 text-left transition ${checked ? "border-primary bg-primary/5" : "hover:bg-muted"}`}>
      <span className="min-w-0">
        <span className="text-sm font-medium block">{label}</span>
        <span className="text-[11px] text-muted-foreground block leading-tight">{desc}</span>
      </span>
      <span className={`relative h-5 w-9 shrink-0 rounded-full transition ${checked ? "bg-primary" : "bg-muted-foreground/30"}`}>
        <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${checked ? "left-[18px]" : "left-0.5"}`} />
      </span>
    </button>
  );
}

// Inline surface style used by the preview + swatches (mirrors styles.css).
function surfaceStyle(t: Theme): React.CSSProperties {
  const depth = t.depth / 100, glow = t.glow / 100, alpha = t.opacity / 100;
  const shadow = `color-mix(in srgb, ${t.foreground} ${16 + depth * 46}%, transparent)`;
  const glowc = `color-mix(in srgb, ${t.primary} ${glow * 80}%, transparent)`;
  switch (t.surface) {
    case "glass":
    case "aurora":
      return { backgroundColor: `color-mix(in srgb, ${t.card} ${alpha * 100}%, transparent)`, backdropFilter: `blur(${t.blur}px) saturate(1.4)`, WebkitBackdropFilter: `blur(${t.blur}px) saturate(1.4)`, border: `1px solid color-mix(in srgb, ${t.foreground} 12%, transparent)`, boxShadow: `0 14px 40px -16px ${glowc}, inset 0 1px 0 rgba(255,255,255,.34)` };
    case "neo":
      return { backgroundColor: t.card, boxShadow: `8px 8px 22px color-mix(in srgb, ${t.foreground} 14%, transparent), -6px -6px 18px rgba(255,255,255,.85)` };
    case "clay":
      return { backgroundColor: t.card, boxShadow: `0 18px 40px -18px ${shadow}, inset 0 -6px 14px color-mix(in srgb, ${t.foreground} 10%, transparent), inset 0 8px 14px rgba(255,255,255,.6)` };
    case "glossy":
      return { backgroundColor: t.card, border: `1px solid color-mix(in srgb, ${t.foreground} 10%, transparent)`, boxShadow: `0 16px 44px -18px ${glowc}`, backgroundImage: `linear-gradient(180deg, rgba(255,255,255,.26), transparent 42%)` };
    case "outline":
      return { backgroundColor: t.card, border: "1.5px solid transparent", backgroundImage: `linear-gradient(${t.card}, ${t.card}), linear-gradient(135deg, ${t.primary}, ${t.brand})`, backgroundOrigin: "border-box", backgroundClip: "padding-box, border-box" };
    case "flat":
      return { backgroundColor: t.card, border: `1px solid color-mix(in srgb, ${t.foreground} 12%, transparent)` };
    case "elevated":
    default:
      return { backgroundColor: t.card, boxShadow: `0 ${8 + depth * 8}px ${28 + depth * 22}px -16px ${shadow}` };
  }
}

function previewBgStyle(t: Theme): React.CSSProperties {
  const p = t.primary, b = t.brand, a = t.accent2, bg = t.background, fg = t.foreground;
  const mix = (c: string, pct: number, into = "transparent") => `color-mix(in srgb, ${c} ${pct}%, ${into})`;
  switch (t.bg) {
    case "gradient": return { background: bg, backgroundImage: `linear-gradient(160deg, ${mix(p, 12, bg)}, ${bg} 55%, ${mix(b, 8, bg)})` };
    case "mesh": return { background: bg, backgroundImage: `radial-gradient(at 12% 10%, ${mix(p, 26)}, transparent 46%), radial-gradient(at 88% 8%, ${mix(b, 22)}, transparent 42%), radial-gradient(at 50% 96%, ${mix(a, 20)}, transparent 52%)` };
    case "aurora": return { background: bg, backgroundImage: `radial-gradient(60% 50% at 15% 0%, ${mix(p, 40)}, transparent 60%), radial-gradient(50% 45% at 85% 5%, ${mix(a, 38)}, transparent 60%), radial-gradient(55% 55% at 50% 100%, ${mix(b, 30)}, transparent 62%)` };
    case "grid": return { background: bg, backgroundImage: `linear-gradient(${mix(fg, 7)} 1px, transparent 1px), linear-gradient(90deg, ${mix(fg, 7)} 1px, transparent 1px)`, backgroundSize: "22px 22px" };
    case "dots": return { background: bg, backgroundImage: `radial-gradient(${mix(fg, 13)} 1.4px, transparent 1.5px)`, backgroundSize: "16px 16px" };
    case "waves": return { background: bg, backgroundImage: `radial-gradient(130% 65% at 50% 118%, ${mix(p, 24)}, transparent 60%), repeating-linear-gradient(180deg, transparent 0 22px, ${mix(p, 5)} 22px 24px)` };
    case "rays": return { background: bg, backgroundImage: `radial-gradient(60% 50% at 50% 0%, ${mix(p, 22)}, transparent 60%), repeating-conic-gradient(from 0deg at 50% -10%, ${mix(a, 9)} 0deg 7deg, transparent 7deg 15deg)` };
    case "noise": return { background: bg, backgroundImage: `linear-gradient(160deg, ${mix(p, 8, bg)}, ${bg}), radial-gradient(${mix(fg, 5)} 0.5px, transparent 0.6px)`, backgroundSize: "auto, 3px 3px" };
    default: return { background: bg };
  }
}

function SurfaceSwatch({ theme, surface }: { theme: Theme; surface: Theme["surface"] }) {
  return <div className="h-8 rounded-md" style={{ ...surfaceStyle({ ...theme, surface }), borderRadius: 8 }} />;
}
function BgSwatch({ theme, bg }: { theme: Theme; bg: Theme["bg"] }) {
  return <div className="h-8 rounded-md border" style={previewBgStyle({ ...theme, bg })} />;
}

function HeroThumb({ variant }: { variant: string }) {
  const bar = "block rounded bg-primary/70";
  if (variant === "split") return <div className="flex gap-1 h-10"><div className="flex-1 space-y-1 py-1"><span className={`${bar} h-1.5 w-3/4`} /><span className={`${bar} h-1.5 w-1/2`} /><span className="block h-2 w-8 rounded bg-brand mt-1" /></div><div className="w-1/2 rounded bg-muted" /></div>;
  if (variant === "centered") return <div className="h-10 flex flex-col items-center justify-center gap-1"><span className={`${bar} h-1.5 w-3/4`} /><span className={`${bar} h-1.5 w-1/2`} /><span className="block h-2 w-8 rounded bg-brand" /></div>;
  if (variant === "fullbleed") return <div className="h-10 rounded bg-muted relative"><div className="absolute inset-2 flex flex-col justify-end gap-1"><span className={`${bar} h-1.5 w-2/3`} /><span className="block h-2 w-8 rounded bg-brand" /></div></div>;
  if (variant === "spotlight") return <div className="h-10 rounded relative overflow-hidden bg-muted/50"><div className="absolute left-1/2 top-1 h-6 w-6 -translate-x-1/2 rounded-full bg-brand/60 blur-[3px]" /><div className="absolute inset-x-2 bottom-1 flex flex-col items-center gap-1"><span className={`${bar} h-1.5 w-1/2`} /></div></div>;
  if (variant === "diagonal") return <div className="flex gap-1 h-10"><div className="flex-1 space-y-1 py-1"><span className={`${bar} h-1.5 w-3/4`} /><span className="block h-2 w-8 rounded bg-brand mt-1" /></div><div className="w-1/2 rounded bg-muted [clip-path:polygon(22%_0,100%_0,100%_100%,0_100%)]" /></div>;
  if (variant === "showcase") return <div className="flex gap-1 h-10"><div className="flex-1 space-y-1 py-1"><span className={`${bar} h-1.5 w-3/4`} /><span className="block h-2 w-8 rounded bg-brand mt-1" /></div><div className="w-1/2 grid grid-cols-2 grid-rows-2 gap-0.5"><div className="row-span-2 rounded bg-muted" /><div className="rounded bg-primary/40" /><div className="rounded bg-brand/50" /></div></div>;
  if (variant === "gradient") return <div className="h-10 rounded flex flex-col items-center justify-center gap-1" style={{ background: "linear-gradient(135deg, var(--color-primary), var(--color-brand))" }}><span className="block h-1.5 w-3/5 rounded bg-white/80" /><span className="block h-1.5 w-2/5 rounded bg-white/60" /></div>;
  return <div className="h-10 flex flex-col items-center justify-center gap-1"><span className={`${bar} h-1.5 w-1/2`} /></div>;
}

// Self-contained preview reflecting colors, radius, surface, glass, glow, gradient/pill buttons + bg.
function Preview({ theme }: { theme: Theme }) {
  const fam = ({ inter: "Inter", poppins: "Poppins", system: "system-ui", manrope: "Manrope", playfair: "'Playfair Display', serif", montserrat: "Montserrat", space: "'Space Grotesk'", jakarta: "'Plus Jakarta Sans'" } as Record<string, string>);
  const btnRadius = theme.pill ? 9999 : theme.radius;
  const btnBg = theme.gradientButtons ? `linear-gradient(135deg, ${theme.primary}, ${theme.accent2} 55%, ${theme.brand})` : theme.primary;
  return (
    <div className="rounded-2xl border overflow-hidden" style={{ ...previewBgStyle(theme), color: theme.foreground, fontFamily: fam[theme.font] ?? "Inter" }}>
      <div className="p-4" style={{ background: theme.primary, color: "#fff", fontFamily: fam[theme.displayFont] ?? "Poppins" }}>
        <p className="text-sm font-bold">Banglarfish</p>
      </div>
      <div className="p-4 space-y-3">
        <div className="overflow-hidden" style={{ ...surfaceStyle(theme), borderRadius: theme.radius + 4 }}>
          <div className="h-24" style={{ background: `linear-gradient(135deg, ${theme.primary}, ${theme.brand})` }} />
          <div className="p-3">
            <div className="flex items-center gap-1 text-xs" style={{ color: theme.foreground }}>
              <Star className="h-3 w-3" style={{ fill: "#facc15", color: "#facc15" }} /> 4.9 <span style={{ opacity: 0.6 }}>(128)</span>
            </div>
            <p className="font-semibold text-sm mt-1" style={{ fontFamily: fam[theme.displayFont] ?? "Poppins" }}>Padma Hilsa (Ilish)</p>
            <p className="text-lg font-bold mt-1" style={{ color: theme.brand }}>৳1,850</p>
            <button className="mt-2 w-full inline-flex items-center justify-center gap-1 text-sm font-medium py-2 text-white" style={{ background: btnBg, borderRadius: btnRadius }}>
              <ShoppingBag className="h-4 w-4" /> Add to Cart
            </button>
          </div>
        </div>
        <button className="w-full text-sm font-semibold py-2 text-white" style={{ background: theme.brand, borderRadius: btnRadius }}>Shop Now</button>
      </div>
    </div>
  );
}
