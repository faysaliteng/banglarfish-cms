import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { adminListVisitors, adminListBans, adminBanIp, adminUnbanIp } from "@/lib/analytics.functions";
import { Ban, ShieldOff, Globe, Plus } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/visitors")({ component: VisitorsPage });

type Visitor = {
  id: string;
  path: string;
  ip: string;
  device: string;
  country: string;
  city: string;
  referrer: string;
  userAgent: string;
  createdAt: string;
};

type BannedIp = {
  id: string;
  ip: string;
  reason: string;
  createdAt: string;
};

type Tab = "live" | "banned";

function VisitorsPage() {
  const fetchVisitors = useServerFn(adminListVisitors);
  const fetchBans = useServerFn(adminListBans);
  const banIp = useServerFn(adminBanIp);
  const unbanIp = useServerFn(adminUnbanIp);

  const [tab, setTab] = useState<Tab>("live");
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [bans, setBans] = useState<BannedIp[]>([]);
  const [loadingVisitors, setLoadingVisitors] = useState(true);
  const [loadingBans, setLoadingBans] = useState(true);
  const [newIp, setNewIp] = useState("");
  const [newReason, setNewReason] = useState("");

  const loadVisitors = () => {
    setLoadingVisitors(true);
    fetchVisitors({ data: { limit: 200 } })
      .then((d) => setVisitors(d as Visitor[]))
      .catch((e) => toast.error(e instanceof Error ? e.message : "Failed to load visitors"))
      .finally(() => setLoadingVisitors(false));
  };

  const loadBans = () => {
    setLoadingBans(true);
    fetchBans()
      .then((d) => setBans(d as BannedIp[]))
      .catch((e) => toast.error(e instanceof Error ? e.message : "Failed to load bans"))
      .finally(() => setLoadingBans(false));
  };

  useEffect(() => {
    loadVisitors();
    loadBans();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onBan(ip: string, reason: string) {
    if (!ip) return toast.error("No IP to ban");
    try {
      await banIp({ data: { ip, reason } });
      toast.success(`Banned ${ip}`);
      loadVisitors();
      loadBans();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to ban");
    }
  }

  async function onUnban(ip: string) {
    try {
      await unbanIp({ data: { ip } });
      toast.success(`Unbanned ${ip}`);
      loadBans();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to unban");
    }
  }

  async function onBanNew(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const ip = newIp.trim();
    if (!ip) return toast.error("Enter an IP address");
    try {
      await banIp({ data: { ip, reason: newReason.trim() || "manual" } });
      toast.success(`Banned ${ip}`);
      setNewIp("");
      setNewReason("");
      loadBans();
      loadVisitors();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to ban");
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Visitors & IPs</h1>
        <p className="text-sm text-muted-foreground">
          {visitors.length} recent visits · {bans.length} banned IPs
        </p>
      </div>

      <div className="flex gap-1 mb-4 border-b">
        <button
          onClick={() => setTab("live")}
          className={`px-4 py-2 text-sm font-semibold border-b-2 -mb-px ${tab === "live" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
        >
          Live visitors
        </button>
        <button
          onClick={() => setTab("banned")}
          className={`px-4 py-2 text-sm font-semibold border-b-2 -mb-px ${tab === "banned" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
        >
          Banned IPs
        </button>
      </div>

      {tab === "live" && (
        <div className="bg-card border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground border-b bg-muted/30">
                  <th className="py-3 px-4">Time</th>
                  <th className="px-2">IP</th>
                  <th className="px-2">Path</th>
                  <th className="px-2">Device</th>
                  <th className="px-2">Location</th>
                  <th className="px-2">Referrer</th>
                  <th className="px-2"></th>
                </tr>
              </thead>
              <tbody>
                {loadingVisitors && (
                  <tr><td colSpan={7} className="text-center py-12 text-muted-foreground">Loading…</td></tr>
                )}
                {!loadingVisitors && visitors.map((v) => (
                  <tr key={v.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="py-3 px-4 text-xs text-muted-foreground whitespace-nowrap">{new Date(v.createdAt).toLocaleString()}</td>
                    <td className="px-2 font-mono text-xs">{v.ip || "—"}</td>
                    <td className="px-2 max-w-[220px] truncate" title={v.path}>{v.path || "—"}</td>
                    <td className="px-2 capitalize">{v.device || "—"}</td>
                    <td className="px-2 text-xs">{[v.city, v.country].filter(Boolean).join(", ") || "—"}</td>
                    <td className="px-2 max-w-[180px] truncate text-xs text-muted-foreground" title={v.referrer}>{v.referrer || "—"}</td>
                    <td className="px-2">
                      <button
                        onClick={() => onBan(v.ip, "manual")}
                        disabled={!v.ip}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold text-destructive hover:bg-destructive/10 disabled:opacity-40"
                        title="Ban IP"
                      >
                        <Ban className="h-3.5 w-3.5" /> Ban
                      </button>
                    </td>
                  </tr>
                ))}
                {!loadingVisitors && visitors.length === 0 && (
                  <tr><td colSpan={7} className="text-center py-12 text-muted-foreground"><Globe className="h-8 w-8 mx-auto mb-2 opacity-40" />No visitors yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "banned" && (
        <div className="space-y-4">
          <div className="bg-card border rounded-xl p-4">
            <form onSubmit={onBanNew} className="flex flex-wrap items-end gap-3">
              <label className="block flex-1 min-w-[160px]">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">IP address</span>
                <input
                  value={newIp}
                  onChange={(e) => setNewIp(e.target.value)}
                  placeholder="203.0.113.10"
                  className="mt-1 w-full border rounded-md px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </label>
              <label className="block flex-1 min-w-[160px]">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Reason</span>
                <input
                  value={newReason}
                  onChange={(e) => setNewReason(e.target.value)}
                  placeholder="manual"
                  className="mt-1 w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </label>
              <button className="bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm font-semibold flex items-center gap-2">
                <Plus className="h-4 w-4" /> Ban IP
              </button>
            </form>
          </div>

          <div className="bg-card border rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-muted-foreground border-b bg-muted/30">
                    <th className="py-3 px-4">IP</th>
                    <th className="px-2">Reason</th>
                    <th className="px-2">Since</th>
                    <th className="px-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {loadingBans && (
                    <tr><td colSpan={4} className="text-center py-12 text-muted-foreground">Loading…</td></tr>
                  )}
                  {!loadingBans && bans.map((b) => (
                    <tr key={b.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="py-3 px-4 font-mono text-xs">{b.ip}</td>
                      <td className="px-2">{b.reason || "—"}</td>
                      <td className="px-2 text-xs text-muted-foreground whitespace-nowrap">{new Date(b.createdAt).toLocaleString()}</td>
                      <td className="px-2">
                        <button
                          onClick={() => onUnban(b.ip)}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold text-emerald-600 hover:bg-emerald-50"
                          title="Unban IP"
                        >
                          <ShieldOff className="h-3.5 w-3.5" /> Unban
                        </button>
                      </td>
                    </tr>
                  ))}
                  {!loadingBans && bans.length === 0 && (
                    <tr><td colSpan={4} className="text-center py-12 text-muted-foreground"><ShieldOff className="h-8 w-8 mx-auto mb-2 opacity-40" />No banned IPs</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
