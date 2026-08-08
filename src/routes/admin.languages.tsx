import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { adminGetI18n, adminSaveI18n } from "@/lib/site.functions";
import { DEFAULT_STRINGS } from "@/lib/i18n";
import type { I18nConfig, Language } from "@/lib/config-types";
import { Languages as LangIcon, Save, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/languages")({ component: LanguagesPage });

const slug = (s: string) => s.toLowerCase().replace(/[^a-z-]/g, "").slice(0, 8) || "xx";

function LanguagesPage() {
  const getFn = useServerFn(adminGetI18n);
  const saveFn = useServerFn(adminSaveI18n);
  const [cfg, setCfg] = useState<I18nConfig | null>(null);
  const [saving, setSaving] = useState(false);
  const [target, setTarget] = useState("");

  useEffect(() => { getFn().then((c) => { setCfg(c); setTarget(c.languages.find((l) => l.code !== c.defaultLang)?.code ?? ""); }).catch((e) => toast.error(e instanceof Error ? e.message : "Failed")); }, [getFn]);
  if (!cfg) return <p className="text-sm text-muted-foreground">Loading…</p>;

  const set = (patch: Partial<I18nConfig>) => setCfg({ ...cfg, ...patch });
  const updateLang = (code: string, patch: Partial<Language>) => set({ languages: cfg.languages.map((l) => (l.code === code ? { ...l, ...patch } : l)) });
  function addLang() {
    const name = prompt("Language name (e.g. Bengali):"); if (!name) return;
    const code = prompt("2-letter code (e.g. bn):"); if (!code) return;
    const c = slug(code);
    if (cfg!.languages.some((l) => l.code === c)) return toast.error("That code already exists");
    set({ languages: [...cfg!.languages, { code: c, name, rtl: false }] });
  }
  function removeLang(code: string) {
    if (code === cfg!.defaultLang) return toast.error("Can't remove the default language");
    const { [code]: _drop, ...rest } = cfg!.strings;
    void _drop;
    setCfg({ ...cfg!, languages: cfg!.languages.filter((l) => l.code !== code), strings: rest });
  }
  const setString = (key: string, value: string) => {
    const langStrings = { ...(cfg.strings[target] ?? {}), [key]: value };
    set({ strings: { ...cfg.strings, [target]: langStrings } });
  };

  async function save() {
    setSaving(true);
    try { await saveFn({ data: cfg! }); toast.success("Languages saved"); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
    finally { setSaving(false); }
  }

  const targets = cfg.languages.filter((l) => l.code !== cfg.defaultLang);

  return (
    <div className="pb-16 max-w-3xl">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-1">
        <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2"><LangIcon className="h-6 w-6" /> Languages (i18n)</h1>
        <button onClick={save} disabled={saving} className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-md font-semibold hover:bg-primary/90 disabled:opacity-60"><Save className="h-4 w-4" /> {saving ? "Saving…" : "Save"}</button>
      </div>
      <p className="text-sm text-muted-foreground mb-6">Offer your store in multiple languages. Enable i18n, add languages (with RTL support for Arabic/Hebrew/Urdu), then translate the UI strings. A language switcher appears in the header, and <code>hreflang</code> tags are emitted for SEO.</p>

      <div className="border rounded-2xl p-5 bg-card mb-5 space-y-3">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={cfg.enabled} onChange={(e) => set({ enabled: e.target.checked })} />
          <span>Enable multi-language storefront</span>
        </label>
        <label className="block text-sm">
          <span className="text-xs font-semibold text-muted-foreground uppercase">Default language</span>
          <select value={cfg.defaultLang} onChange={(e) => set({ defaultLang: e.target.value })} className="mt-1 block border rounded-md px-3 py-2 text-sm bg-card">
            {cfg.languages.map((l) => <option key={l.code} value={l.code}>{l.name} ({l.code})</option>)}
          </select>
        </label>
      </div>

      <div className="border rounded-2xl p-5 bg-card mb-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold">Languages</h3>
          <button onClick={addLang} className="inline-flex items-center gap-1 text-sm px-3 py-1.5 rounded-md border hover:bg-muted"><Plus className="h-4 w-4" /> Add language</button>
        </div>
        <div className="space-y-2">
          {cfg.languages.map((l) => (
            <div key={l.code} className="flex items-center gap-2">
              <input value={l.name} onChange={(e) => updateLang(l.code, { name: e.target.value })} className="border rounded-md px-3 py-1.5 text-sm flex-1" />
              <code className="text-xs text-muted-foreground w-12 text-center">{l.code}</code>
              <label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={l.rtl} onChange={(e) => updateLang(l.code, { rtl: e.target.checked })} /> RTL</label>
              <button onClick={() => removeLang(l.code)} disabled={l.code === cfg.defaultLang} className="p-1.5 rounded hover:bg-muted text-destructive disabled:opacity-30"><Trash2 className="h-4 w-4" /></button>
            </div>
          ))}
        </div>
      </div>

      <div className="border rounded-2xl p-5 bg-card">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold">UI translations</h3>
          {targets.length > 0 && (
            <select value={target} onChange={(e) => setTarget(e.target.value)} className="border rounded-md px-3 py-1.5 text-sm bg-card">
              {targets.map((l) => <option key={l.code} value={l.code}>{l.name}</option>)}
            </select>
          )}
        </div>
        {targets.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">Add a non-default language above to translate the UI.</p>
        ) : (
          <div className="space-y-2">
            {Object.entries(DEFAULT_STRINGS).map(([key, en]) => (
              <div key={key} className="grid sm:grid-cols-2 gap-2 items-center">
                <div className="text-sm"><span className="text-muted-foreground text-xs font-mono">{key}</span><br />{en}</div>
                <input value={cfg.strings[target]?.[key] ?? ""} onChange={(e) => setString(key, e.target.value)} placeholder={en} className="border rounded-md px-3 py-1.5 text-sm" />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
