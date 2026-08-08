import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { adminListApiKeys, adminCreateApiKey, adminRevokeApiKey, adminListWebhooks, adminCreateWebhook, adminDeleteWebhook, API_SCOPE_LIST, WEBHOOK_EVENT_LIST, type ApiKeyRow, type WebhookRow, type DeliveryRow } from "@/lib/api.functions";
import { Webhook, KeyRound, Plus, Trash2, Copy, ExternalLink } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/api")({ component: ApiPage });

function ApiPage() {
  const listKeys = useServerFn(adminListApiKeys);
  const createKey = useServerFn(adminCreateApiKey);
  const revokeKey = useServerFn(adminRevokeApiKey);
  const listHooks = useServerFn(adminListWebhooks);
  const createHook = useServerFn(adminCreateWebhook);
  const delHook = useServerFn(adminDeleteWebhook);

  const [keys, setKeys] = useState<ApiKeyRow[]>([]);
  const [hooks, setHooks] = useState<WebhookRow[]>([]);
  const [deliveries, setDeliveries] = useState<DeliveryRow[]>([]);
  const [keyName, setKeyName] = useState("");
  const [keyScopes, setKeyScopes] = useState<string[]>(["read:products"]);
  const [newKey, setNewKey] = useState("");
  const [hookUrl, setHookUrl] = useState("");
  const [hookEvents, setHookEvents] = useState<string[]>(["order.paid"]);
  const [newSecret, setNewSecret] = useState("");

  const load = () => {
    listKeys().then(setKeys).catch((e) => toast.error(e instanceof Error ? e.message : "Failed"));
    listHooks().then((r) => { setHooks(r.hooks); setDeliveries(r.deliveries); }).catch(() => {});
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const toggle = (arr: string[], v: string, set: (a: string[]) => void) => set(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
  const copy = (t: string) => { navigator.clipboard?.writeText(t); toast.success("Copied"); };

  async function makeKey() {
    if (!keyName.trim() || keyScopes.length === 0) return toast.error("Name + at least one scope");
    try { const r = await createKey({ data: { name: keyName.trim(), scopes: keyScopes } }); setNewKey(r.key); setKeyName(""); load(); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
  }
  async function makeHook() {
    if (!hookUrl.trim() || hookEvents.length === 0) return toast.error("URL + at least one event");
    try { const r = await createHook({ data: { url: hookUrl.trim(), events: hookEvents } }); setNewSecret(r.secret); setHookUrl(""); load(); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
  }

  return (
    <div className="pb-16 max-w-4xl">
      <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2 mb-1"><Webhook className="h-6 w-6" /> API &amp; Webhooks</h1>
      <p className="text-sm text-muted-foreground mb-6">A scoped REST API for headless clients, mobile apps, and integrations. Docs: <a href="/api/v1/openapi.json" target="_blank" rel="noreferrer" className="text-primary underline inline-flex items-center gap-1">OpenAPI spec <ExternalLink className="h-3 w-3" /></a>. Auth: <code>Authorization: Bearer &lt;key&gt;</code>.</p>

      {/* API keys */}
      <div className="border rounded-2xl p-5 bg-card mb-6">
        <h2 className="font-semibold flex items-center gap-2 mb-3"><KeyRound className="h-5 w-5" /> API keys</h2>
        {newKey && (
          <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm">
            <p className="font-semibold text-emerald-800">Copy your key now — it won't be shown again:</p>
            <div className="mt-1 flex items-center gap-2"><code className="font-mono text-xs break-all">{newKey}</code><button onClick={() => copy(newKey)} className="p-1 rounded hover:bg-emerald-100"><Copy className="h-4 w-4" /></button></div>
          </div>
        )}
        <div className="flex flex-wrap gap-2 items-end mb-3">
          <input value={keyName} onChange={(e) => setKeyName(e.target.value)} placeholder="Key name (e.g. Mobile app)" className="border rounded-md px-3 py-2 text-sm flex-1 min-w-[200px]" />
          <button onClick={makeKey} className="inline-flex items-center gap-1.5 bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-semibold"><Plus className="h-4 w-4" /> Create key</button>
        </div>
        <div className="flex flex-wrap gap-2 mb-4">
          {API_SCOPE_LIST.map((s) => (
            <button key={s} onClick={() => toggle(keyScopes, s, setKeyScopes)} className={`text-xs px-2.5 py-1 rounded-full border ${keyScopes.includes(s) ? "bg-primary text-primary-foreground border-primary" : "hover:bg-muted"}`}>{s}</button>
          ))}
        </div>
        <div className="space-y-2">
          {keys.map((k) => (
            <div key={k.id} className="flex items-center gap-3 border rounded-lg p-2.5 text-sm">
              <div className="min-w-0 flex-1"><p className="font-medium">{k.name}</p><p className="text-xs text-muted-foreground font-mono">{k.prefix} · {k.scopes.join(", ")}</p></div>
              <span className="text-xs text-muted-foreground">{k.lastUsedAt ? `used ${new Date(k.lastUsedAt).toLocaleDateString()}` : "never used"}</span>
              <button onClick={async () => { if (confirm(`Revoke "${k.name}"?`)) { await revokeKey({ data: { id: k.id } }); load(); } }} className="p-1.5 hover:bg-muted rounded text-destructive"><Trash2 className="h-4 w-4" /></button>
            </div>
          ))}
          {keys.length === 0 && <p className="text-sm text-muted-foreground">No API keys yet.</p>}
        </div>
      </div>

      {/* Webhooks */}
      <div className="border rounded-2xl p-5 bg-card">
        <h2 className="font-semibold flex items-center gap-2 mb-3"><Webhook className="h-5 w-5" /> Outbound webhooks</h2>
        {newSecret && (
          <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm">
            <p className="font-semibold text-emerald-800">Signing secret (verify <code>x-bf-signature</code> = HMAC-SHA256):</p>
            <div className="mt-1 flex items-center gap-2"><code className="font-mono text-xs break-all">{newSecret}</code><button onClick={() => copy(newSecret)} className="p-1 rounded hover:bg-emerald-100"><Copy className="h-4 w-4" /></button></div>
          </div>
        )}
        <div className="flex flex-wrap gap-2 items-end mb-3">
          <input value={hookUrl} onChange={(e) => setHookUrl(e.target.value)} placeholder="https://your-endpoint.com/webhook" className="border rounded-md px-3 py-2 text-sm flex-1 min-w-[240px] font-mono" />
          <button onClick={makeHook} className="inline-flex items-center gap-1.5 bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-semibold"><Plus className="h-4 w-4" /> Add webhook</button>
        </div>
        <div className="flex flex-wrap gap-2 mb-4">
          {WEBHOOK_EVENT_LIST.map((s) => (
            <button key={s} onClick={() => toggle(hookEvents, s, setHookEvents)} className={`text-xs px-2.5 py-1 rounded-full border ${hookEvents.includes(s) ? "bg-primary text-primary-foreground border-primary" : "hover:bg-muted"}`}>{s}</button>
          ))}
        </div>
        <div className="space-y-2">
          {hooks.map((h) => (
            <div key={h.id} className="flex items-center gap-3 border rounded-lg p-2.5 text-sm">
              <div className="min-w-0 flex-1"><p className="font-mono text-xs truncate">{h.url}</p><p className="text-xs text-muted-foreground">{h.events.join(", ")}</p></div>
              <button onClick={async () => { if (confirm("Delete webhook?")) { await delHook({ data: { id: h.id } }); load(); } }} className="p-1.5 hover:bg-muted rounded text-destructive"><Trash2 className="h-4 w-4" /></button>
            </div>
          ))}
          {hooks.length === 0 && <p className="text-sm text-muted-foreground">No webhooks yet.</p>}
        </div>
        {deliveries.length > 0 && (
          <div className="mt-4 pt-4 border-t">
            <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Recent deliveries</p>
            <div className="space-y-1">
              {deliveries.slice(0, 12).map((d) => (
                <div key={d.id} className="flex items-center gap-2 text-xs">
                  <span className={`px-1.5 py-0.5 rounded-full font-semibold ${d.status === "success" ? "bg-emerald-100 text-emerald-700" : d.status === "failed" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>{d.status}</span>
                  <span className="font-mono">{d.event}</span>
                  <span className="text-muted-foreground">{d.responseCode ?? "—"}</span>
                  <span className="text-muted-foreground ml-auto">{new Date(d.createdAt).toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
