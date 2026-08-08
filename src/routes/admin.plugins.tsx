import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { adminListPlugins, adminTogglePlugin, adminSavePluginSettings, type PluginInfo } from "@/lib/plugins.functions";
import { Plug, Save, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/plugins")({ component: PluginsPage });

function PluginsPage() {
  const listFn = useServerFn(adminListPlugins);
  const toggleFn = useServerFn(adminTogglePlugin);
  const saveFn = useServerFn(adminSavePluginSettings);
  type SVal = string | number | boolean;
  const [plugins, setPlugins] = useState<PluginInfo[]>([]);
  const [drafts, setDrafts] = useState<Record<string, Record<string, SVal>>>({});

  const load = () => listFn().then((rows) => {
    setPlugins(rows);
    setDrafts(Object.fromEntries(rows.map((p) => [p.id, { ...p.settings }])));
  }).catch((e) => toast.error(e instanceof Error ? e.message : "Failed"));
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  async function toggle(p: PluginInfo) {
    try { await toggleFn({ data: { id: p.id, enabled: !p.enabled } }); toast.success(`${p.name} ${!p.enabled ? "enabled" : "disabled"}`); load(); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
  }
  async function save(p: PluginInfo) {
    try { await saveFn({ data: { id: p.id, settings: drafts[p.id] ?? {} } }); toast.success("Settings saved"); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
  }
  const setField = (id: string, key: string, val: SVal) => setDrafts((d) => ({ ...d, [id]: { ...(d[id] ?? {}), [key]: val } }));

  return (
    <div className="pb-16 max-w-3xl">
      <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2 mb-1"><Plug className="h-6 w-6" /> Plugins</h1>
      <p className="text-sm text-muted-foreground mb-6">First-party extensions built on the event bus + hook system. Enable, configure, done. (Third-party plugins are added through the repo — there is deliberately no uploadable-code plugin system, so nothing untrusted ever runs on your server.)</p>

      <div className="space-y-4">
        {plugins.map((p) => (
          <div key={p.id} className="border rounded-2xl bg-card overflow-hidden">
            <div className="p-4 flex items-start gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold">{p.name}</h3>
                  <span className="text-[10px] text-muted-foreground">v{p.version}</span>
                  {p.author && <span className="text-[10px] text-muted-foreground">· {p.author}</span>}
                </div>
                <p className="text-sm text-muted-foreground mt-0.5">{p.description}</p>
                <div className="flex flex-wrap gap-1 mt-2">
                  {p.permissions.map((perm) => (
                    <span key={perm} className="inline-flex items-center gap-1 text-[10px] bg-muted rounded-full px-2 py-0.5 text-muted-foreground"><ShieldCheck className="h-3 w-3" />{perm}</span>
                  ))}
                </div>
              </div>
              <button onClick={() => toggle(p)} className={`shrink-0 relative h-6 w-11 rounded-full transition ${p.enabled ? "bg-primary" : "bg-muted-foreground/30"}`} aria-label="Toggle plugin">
                <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${p.enabled ? "left-[22px]" : "left-0.5"}`} />
              </button>
            </div>
            {p.enabled && p.fields.length > 0 && (
              <div className="border-t p-4 bg-muted/20 space-y-3">
                {p.fields.map((f) => (
                  <label key={f.key} className="block">
                    <span className="text-xs font-semibold text-muted-foreground uppercase">{f.label}</span>
                    {f.type === "checkbox" ? (
                      <input type="checkbox" checked={!!drafts[p.id]?.[f.key]} onChange={(e) => setField(p.id, f.key, e.target.checked)} className="mt-1 block" />
                    ) : (
                      <input type={f.type === "password" ? "password" : f.type === "number" ? "number" : "text"} value={String(drafts[p.id]?.[f.key] ?? "")} onChange={(e) => setField(p.id, f.key, f.type === "number" ? Number(e.target.value) : e.target.value)} placeholder={f.placeholder} className="mt-1 w-full border rounded-md px-3 py-2 text-sm" />
                    )}
                    {f.help && <span className="text-[11px] text-muted-foreground">{f.help}</span>}
                  </label>
                ))}
                <button onClick={() => save(p)} className="inline-flex items-center gap-1.5 bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-semibold"><Save className="h-4 w-4" /> Save settings</button>
              </div>
            )}
          </div>
        ))}
        {plugins.length === 0 && <p className="text-sm text-muted-foreground">No plugins registered.</p>}
      </div>
    </div>
  );
}
