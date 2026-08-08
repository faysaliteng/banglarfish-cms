import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { useServerFn } from "@tanstack/react-start";
import { adminHealth, adminVerifyAuditChain, adminGetMaintenance, adminSetMaintenance, type HealthReport, type AuditIntegrity, type MaintenanceState } from "@/lib/health.functions";
import { Activity, Database, Cpu, Package, ShoppingCart, Users, RefreshCw, ShieldCheck, ShieldAlert, Wrench } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/health")({
  head: () => ({ meta: [{ title: "System Health — Admin" }, { name: "robots", content: "noindex" }] }),
  component: HealthPage,
});

function fmtUptime(s: number) {
  const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60);
  return [d ? `${d}d` : "", h ? `${h}h` : "", `${m}m`].filter(Boolean).join(" ");
}

function HealthPage() {
  const fetchHealth = useServerFn(adminHealth);
  const verifyAudit = useServerFn(adminVerifyAuditChain);
  const [h, setH] = useState<HealthReport | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [audit, setAudit] = useState<AuditIntegrity | null>(null);
  const [auditBusy, setAuditBusy] = useState(false);
  const getMaint = useServerFn(adminGetMaintenance);
  const setMaint = useServerFn(adminSetMaintenance);
  const [maint, setMaintState] = useState<MaintenanceState | null>(null);
  const [maintBusy, setMaintBusy] = useState(false);
  useEffect(() => { getMaint().then(setMaintState).catch(() => {}); }, [getMaint]);

  async function toggleMaint() {
    if (!maint) return;
    setMaintBusy(true);
    try { const r = await setMaint({ data: { enabled: !maint.enabled, message: maint.message } }); setMaintState(r); toast.success(r.enabled ? "Maintenance mode ON" : "Maintenance mode OFF"); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
    finally { setMaintBusy(false); }
  }

  async function runAudit() {
    setAuditBusy(true);
    try { const r = await verifyAudit(); setAudit(r); toast[r.ok ? "success" : "error"](r.ok ? `Audit chain intact (${r.checked} entries).` : `Integrity check FAILED: ${r.reason}`); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Verify failed"); }
    finally { setAuditBusy(false); }
  }
  const load = useCallback(() => { fetchHealth().then((r) => { setH(r); setErr(null); }).catch((e) => setErr(e instanceof Error ? e.message : "Failed")); }, [fetchHealth]);
  useEffect(() => { load(); const t = setInterval(load, 15000); return () => clearInterval(t); }, [load]);

  const jobsTotal = h ? Object.values(h.jobs).reduce((a, b) => a + b, 0) : 0;
  const cards = h ? [
    { label: "Database", value: h.db === "up" ? `Up · ${h.latencyMs}ms` : "Down", icon: Database, ok: h.db === "up" },
    { label: "Uptime", value: fmtUptime(h.uptimeS), icon: Activity, ok: true },
    { label: "Memory (RSS)", value: `${h.memoryMB.rss} MB`, icon: Cpu, ok: h.memoryMB.rss < 1024 },
    { label: "Node", value: h.node, icon: Cpu, ok: true },
    { label: "Products", value: String(h.counts.products), icon: Package, ok: true },
    { label: "Orders", value: String(h.counts.orders), icon: ShoppingCart, ok: true },
    { label: "Users", value: String(h.counts.users), icon: Users, ok: true },
    { label: "Jobs (queued+done)", value: String(jobsTotal), icon: RefreshCw, ok: (h.jobs.failed ?? 0) === 0 },
  ] : [];

  return (
    <div className="p-6 max-w-4xl">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10 text-primary"><Activity className="h-5 w-5" /></div>
          <h1 className="text-2xl font-bold">System Health</h1>
        </div>
        <button onClick={load} className="inline-flex items-center gap-2 text-sm border rounded-md px-3 py-2 hover:bg-muted"><RefreshCw className="h-4 w-4" /> Refresh</button>
      </div>
      <p className="text-sm text-muted-foreground mb-6">Live status of the server, database, and background queue. Auto-refreshes every 15s. A public probe is also available at <code>/api/health</code>.</p>

      {err && <div className="rounded-xl border border-destructive/40 bg-destructive/5 text-destructive text-sm p-4 mb-4">{err}</div>}
      {!h && !err && <p className="text-sm text-muted-foreground">Loading…</p>}

      {h && (
        <>
          <div className={`mb-4 inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-semibold ${h.status === "ok" ? "bg-emerald-100 text-emerald-700" : "bg-destructive/10 text-destructive"}`}>
            <span className={`h-2 w-2 rounded-full ${h.status === "ok" ? "bg-emerald-500" : "bg-destructive"}`} /> {h.status === "ok" ? "All systems operational" : "Degraded"}
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {cards.map((c) => {
              const Icon = c.icon;
              return (
                <div key={c.label} className="border rounded-2xl p-5 bg-card">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">{c.label}</p>
                    <div className={`p-2 rounded-lg ${c.ok ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"}`}><Icon className="h-4 w-4" /></div>
                  </div>
                  <p className="text-xl font-bold mt-2 break-all">{c.value}</p>
                </div>
              );
            })}
          </div>
          <div className="mt-6 border rounded-2xl p-5 bg-card">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <h3 className="font-semibold flex items-center gap-2"><ShieldCheck className="h-4 w-4" /> Audit log integrity</h3>
                <p className="text-sm text-muted-foreground mt-1">Every admin action is hash-chained. Verify that no entry has been altered or deleted.</p>
              </div>
              <button onClick={runAudit} disabled={auditBusy} className="text-sm font-semibold border rounded-md px-4 py-2 hover:bg-muted disabled:opacity-60">{auditBusy ? "Verifying…" : "Verify integrity"}</button>
            </div>
            {audit && (
              <div className={`mt-3 flex items-start gap-2 rounded-lg p-3 text-sm ${audit.ok ? "bg-emerald-50 text-emerald-700" : "bg-destructive/10 text-destructive"}`}>
                {audit.ok ? <ShieldCheck className="h-4 w-4 mt-0.5 shrink-0" /> : <ShieldAlert className="h-4 w-4 mt-0.5 shrink-0" />}
                <span>{audit.ok ? `Chain intact — ${audit.checked} entries verified.` : `TAMPERING DETECTED at entry #${audit.brokenSeq}: ${audit.reason} (${audit.checked} entries verified before the break).`}</span>
              </div>
            )}
          </div>

          <div className="mt-6 border rounded-2xl p-5 bg-card">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <h3 className="font-semibold flex items-center gap-2"><Wrench className="h-4 w-4" /> Maintenance mode</h3>
                <p className="text-sm text-muted-foreground mt-1">When on, storefront visitors see a maintenance page (503). The admin panel stays reachable.</p>
              </div>
              {maint && (
                <button onClick={toggleMaint} disabled={maintBusy} className={`text-sm font-semibold rounded-md px-4 py-2 disabled:opacity-60 ${maint.enabled ? "bg-destructive text-white" : "border hover:bg-muted"}`}>
                  {maintBusy ? "…" : maint.enabled ? "Turn OFF" : "Turn ON"}
                </button>
              )}
            </div>
            {maint?.enabled && <div className="mt-3 rounded-lg bg-amber-50 text-amber-800 text-sm p-3">⚠️ The storefront is currently in maintenance mode.</div>}
          </div>

          {Object.keys(h.jobs).length > 0 && (
            <div className="mt-6 border rounded-2xl p-5 bg-card">
              <h3 className="font-semibold mb-3">Job queue by status</h3>
              <div className="flex flex-wrap gap-2 text-sm">
                {Object.entries(h.jobs).map(([k, v]) => (
                  <span key={k} className={`px-3 py-1 rounded-full ${k === "failed" ? "bg-destructive/10 text-destructive" : "bg-muted"}`}>{k}: <strong>{v}</strong></span>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
