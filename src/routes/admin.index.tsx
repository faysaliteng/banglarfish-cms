import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { adminDashboard, type DashboardData } from "@/lib/admin-dashboard.functions";
import { formatBDT } from "@/lib/cart";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import {
  ShoppingCart, Package, Users, DollarSign, TrendingUp, AlertTriangle,
  Plus, Home, Palette, ArrowUpRight, Boxes,
} from "lucide-react";

export const Route = createFileRoute("/admin/")({ component: Dashboard });

function Dashboard() {
  const dashboardFn = useServerFn(adminDashboard);
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await dashboardFn();
        if (!cancelled) setData(res);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const series = data?.revenueSeries ?? [];
  const spark = series.map((d) => d.revenue);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-sm text-muted-foreground">A live overview of your store</p>
        </div>
        <div className="text-sm text-muted-foreground flex items-center gap-2"><TrendingUp className="h-4 w-4" /> Last 14 days</div>
      </div>

      {loading && !data ? (
        <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-32 rounded-2xl bf-shimmer" />)}
        </div>
      ) : !data ? (
        <div className="py-20 text-center text-muted-foreground">No data available.</div>
      ) : (
        <>
          {/* KPI cards */}
          <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4 mb-4">
            <Kpi label="Total Revenue" value={formatBDT(data.revenue)} sub={`${data.ordersCount} orders all-time`} icon={DollarSign} gradient="linear-gradient(135deg,#10b981,#059669)" spark={spark} />
            <Kpi label="Revenue Today" value={formatBDT(data.revenueToday)} sub="last 24 hours" icon={TrendingUp} gradient="linear-gradient(135deg,#3b82f6,#2563eb)" />
            <Kpi label="Orders" value={String(data.ordersCount)} sub={`${data.customersCount} customers`} icon={ShoppingCart} gradient="linear-gradient(135deg,#f59e0b,#d97706)" />
            <Kpi label="Products" value={String(data.productsCount)} sub={`${data.lowStock.length} low on stock`} icon={Boxes} gradient="linear-gradient(135deg,#8b5cf6,#7c3aed)" />
          </div>

          {/* Quick actions */}
          <div className="flex flex-wrap gap-2 mb-6">
            <QuickAction to="/admin/products" icon={Plus} label="Add product" />
            <QuickAction to="/admin/orders" icon={ShoppingCart} label="View orders" />
            <QuickAction to="/admin/homepage" icon={Home} label="Edit homepage" />
            <QuickAction to="/admin/theme" icon={Palette} label="Theme & layout" />
            <QuickAction to="/admin/analytics" icon={TrendingUp} label="Full analytics" />
          </div>

          {/* Revenue chart + period breakdown */}
          <div className="grid lg:grid-cols-3 gap-4 mb-4">
            <div className="lg:col-span-2 bg-card border rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold">Revenue — last 14 days</h2>
                <Link to="/admin/analytics" className="text-xs text-primary font-semibold inline-flex items-center gap-1 hover:underline">Details <ArrowUpRight className="h-3 w-3" /></Link>
              </div>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={series} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
                    <defs>
                      <linearGradient id="dashRev" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.35} />
                        <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="date" tickFormatter={(d: string) => d.slice(5)} tick={{ fontSize: 11 }} stroke="currentColor" className="text-muted-foreground" />
                    <YAxis tick={{ fontSize: 11 }} width={44} stroke="currentColor" className="text-muted-foreground" tickFormatter={(v: number) => (v >= 1000 ? `${Math.round(v / 1000)}k` : String(v))} />
                    <Tooltip
                      formatter={(value: number | string, name: string) => (name === "revenue" ? [formatBDT(Number(value)), "Revenue"] : [String(value), "Orders"])}
                      contentStyle={{ borderRadius: 12, border: "1px solid var(--border)", background: "var(--card)", fontSize: 13 }}
                    />
                    <Area type="monotone" dataKey="revenue" stroke="var(--color-primary)" strokeWidth={2.5} fill="url(#dashRev)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-card border rounded-2xl p-5">
              <h2 className="font-semibold mb-4">This period</h2>
              <div className="space-y-3">
                <PeriodRow label="Today" value={formatBDT(data.revenueToday)} />
                <PeriodRow label="This week" value={formatBDT(data.revenueWeek)} />
                <PeriodRow label="This month" value={formatBDT(data.revenueMonth)} />
              </div>
              {Object.keys(data.ordersByStatus).length > 0 && (
                <>
                  <h3 className="font-semibold text-sm mt-5 mb-2">Orders by status</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {Object.entries(data.ordersByStatus).map(([status, n]) => (
                      <span key={status} className={`px-2.5 py-1 rounded-full text-xs font-semibold ${statusColor(status)}`}>{status} · {n}</span>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Recent orders + top products + low stock */}
          <div className="grid lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 bg-card border rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold">Recent orders</h2>
                <Link to="/admin/orders" className="text-xs text-primary font-semibold hover:underline">View all</Link>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[520px]">
                  <thead>
                    <tr className="text-left text-muted-foreground border-b">
                      <th className="py-2 font-medium">Order</th>
                      <th className="font-medium">Customer</th>
                      <th className="font-medium">Total</th>
                      <th className="font-medium">Status</th>
                      <th className="font-medium">When</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recentOrders.map((o) => (
                      <tr key={o.id} className="border-b last:border-0 hover:bg-muted/40 transition">
                        <td className="py-3 font-mono text-xs">#{o.order_number}</td>
                        <td className="truncate max-w-[140px]">{o.full_name}</td>
                        <td className="font-semibold">{formatBDT(o.total)}</td>
                        <td><StatusPill s={o.status} /></td>
                        <td className="text-muted-foreground text-xs">{o.created_at.slice(0, 10)}</td>
                      </tr>
                    ))}
                    {data.recentOrders.length === 0 && (
                      <tr><td colSpan={5} className="py-6 text-center text-muted-foreground">No orders yet.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="space-y-4">
              <div className="bg-card border rounded-2xl p-5">
                <h2 className="font-semibold mb-4">Top products</h2>
                {data.topProducts.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No sales yet.</p>
                ) : (
                  <ul className="space-y-3">
                    {data.topProducts.slice(0, 5).map((p, i) => (
                      <li key={p.name} className="flex items-center gap-3">
                        <span className="h-7 w-7 shrink-0 rounded-lg text-white text-xs font-bold grid place-items-center" style={{ background: "var(--bf-grad3, linear-gradient(135deg,var(--color-primary),var(--color-brand)))" }}>{i + 1}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{p.name}</p>
                          <p className="text-xs text-muted-foreground">{p.qty} sold</p>
                        </div>
                        <span className="text-sm font-semibold">{formatBDT(p.revenue)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="bg-card border rounded-2xl p-5">
                <h2 className="font-semibold mb-4 flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-amber-500" /> Low stock</h2>
                {data.lowStock.length === 0 ? (
                  <p className="text-sm text-muted-foreground">All products well stocked.</p>
                ) : (
                  <ul className="space-y-3">
                    {data.lowStock.map((p) => (
                      <li key={p.id} className="flex items-center gap-3">
                        <Package className="h-4 w-4 text-muted-foreground shrink-0" />
                        <div className="flex-1 min-w-0"><p className="text-sm font-medium truncate">{p.name}</p></div>
                        <span className="text-sm font-semibold text-amber-600">{p.stock} left</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function Kpi({ label, value, sub, icon: Icon, gradient, spark }: { label: string; value: string; sub: string; icon: React.ComponentType<{ className?: string }>; gradient: string; spark?: number[] }) {
  return (
    <div className="bg-card border rounded-2xl p-5 relative overflow-hidden">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold mt-1 truncate">{value}</p>
          <p className="text-xs text-muted-foreground mt-1">{sub}</p>
        </div>
        <div className="grid place-items-center h-11 w-11 rounded-xl text-white shrink-0 shadow-lg" style={{ background: gradient }}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      {spark && spark.length > 1 && <div className="mt-3 -mb-1"><Sparkline data={spark} /></div>}
    </div>
  );
}

function Sparkline({ data }: { data: number[] }) {
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const w = 100, h = 26;
  const pts = data.map((v, i) => `${(i / (data.length - 1 || 1)) * w},${(h - ((v - min) / range) * h).toFixed(1)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-7" preserveAspectRatio="none" aria-hidden>
      <polyline points={pts} fill="none" stroke="var(--color-primary)" strokeWidth={2} vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" opacity={0.85} />
    </svg>
  );
}

function QuickAction({ to, icon: Icon, label }: { to: string; icon: React.ComponentType<{ className?: string }>; label: string }) {
  return (
    <Link to={to as "/admin"} className="inline-flex items-center gap-2 bg-card border rounded-xl px-3.5 py-2 text-sm font-medium hover:border-primary hover:text-primary transition">
      <Icon className="h-4 w-4" /> {label}
    </Link>
  );
}

function PeriodRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-semibold">{value}</span>
    </div>
  );
}

function statusColor(s: string): string {
  const map: Record<string, string> = {
    delivered: "bg-emerald-100 text-emerald-700", shipped: "bg-blue-100 text-blue-700",
    packed: "bg-purple-100 text-purple-700", processing: "bg-cyan-100 text-cyan-700",
    confirmed: "bg-amber-100 text-amber-700", pending: "bg-gray-100 text-gray-700",
    cancelled: "bg-red-100 text-red-700", refunded: "bg-slate-100 text-slate-700",
  };
  return map[s] ?? "bg-gray-100 text-gray-700";
}

function StatusPill({ s }: { s: string }) {
  return <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${statusColor(s)}`}>{s}</span>;
}
