import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { adminAnalytics } from "@/lib/analytics.functions";
import { formatBDT } from "@/lib/cart";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShoppingBag,
  Users,
  Wallet,
  Truck,
  Eye,
} from "lucide-react";

export const Route = createFileRoute("/admin/analytics")({ component: AnalyticsPage });

function exportAnalyticsCsv(data: AnalyticsData, days: number) {
  const esc = (v: unknown) => {
    const s = String(v ?? "");
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const line = (arr: unknown[]) => arr.map(esc).join(",");
  const rows: string[] = [];
  rows.push(`Banglarfish Analytics — last ${days} days`, "");
  rows.push("Summary", line(["Metric", "Value"]));
  rows.push(line(["Revenue (BDT)", data.revenue]));
  rows.push(line(["Revenue previous period", data.revenuePrev]));
  rows.push(line(["Growth %", data.revenueGrowth]));
  rows.push(line(["Orders", data.orders]));
  rows.push(line(["Avg order value", data.aov]));
  rows.push(line(["Paid revenue", data.paidRevenue]));
  rows.push(line(["COD revenue", data.codRevenue]));
  rows.push(line(["Visits", data.visits]));
  rows.push(line(["Unique visitors", data.uniqueVisitors]));
  rows.push("", "Revenue by day", line(["Date", "Revenue", "Orders"]));
  data.revenueSeries.forEach((p) => rows.push(line([p.date, p.revenue, p.orders])));
  rows.push("", "Visits by day", line(["Date", "Visits"]));
  data.visitSeries.forEach((p) => rows.push(line([p.date, p.visits])));
  rows.push("", "Top products", line(["Product", "Qty", "Revenue"]));
  data.topProducts.forEach((p) => rows.push(line([p.name, p.qty, p.revenue])));
  rows.push("", "Top customers", line(["Customer", "Orders", "Spent"]));
  data.topCustomers.forEach((c) => rows.push(line([c.name, c.orders, c.spent])));
  rows.push("", "Top pages", line(["Path", "Views"]));
  data.topPages.forEach((p) => rows.push(line([p.path, p.views])));
  rows.push("", "Traffic sources", line(["Referrer", "Count"]));
  data.topReferrers.forEach((r) => rows.push(line([r.referrer, r.count])));

  const blob = new Blob(["﻿" + rows.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `banglarfish-analytics-${days}d-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

type RevenuePoint = { date: string; revenue: number; orders: number };
type VisitPoint = { date: string; visits: number };
type NamedRow = { name: string; qty: number; revenue: number };
type CustomerRow = { name: string; orders: number; spent: number };
type PageRow = { path: string; views: number };
type ReferrerRow = { referrer: string; count: number };

type AnalyticsData = {
  range?: string;
  revenue: number;
  revenuePrev: number;
  revenueGrowth: number;
  orders: number;
  ordersPrev: number;
  aov: number;
  paidRevenue: number;
  codRevenue: number;
  revenueSeries: RevenuePoint[];
  statusBreakdown: Record<string, number>;
  paymentBreakdown: Record<string, number>;
  topProducts: NamedRow[];
  topCustomers: CustomerRow[];
  visits: number;
  uniqueVisitors: number;
  visitSeries: VisitPoint[];
  topPages: PageRow[];
  deviceBreakdown: Record<string, number>;
  countryBreakdown: Record<string, number>;
  topReferrers: ReferrerRow[];
};

const RANGES: { label: string; days: number }[] = [
  { label: "7 days", days: 7 },
  { label: "30 days", days: 30 },
  { label: "90 days", days: 90 },
  { label: "1 year", days: 365 },
];

const STATUS_COLORS: Record<string, string> = {
  pending: "#f59e0b",
  confirmed: "#3b82f6",
  processing: "#6366f1",
  packed: "#8b5cf6",
  shipped: "#06b6d4",
  delivered: "#10b981",
  cancelled: "#ef4444",
  refunded: "#f43f5e",
};

const PAYMENT_COLORS: Record<string, string> = {
  paid: "#10b981",
  cod: "#f59e0b",
  pending: "#6366f1",
  failed: "#ef4444",
  refunded: "#f43f5e",
};

function AnalyticsPage() {
  const analyticsFn = useServerFn(adminAnalytics);
  const [days, setDays] = useState<number>(30);
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const load = useCallback(
    async (d: number) => {
      setLoading(true);
      try {
        const res = (await analyticsFn({ data: { days: d } })) as unknown as AnalyticsData;
        setData(res);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to load analytics");
      } finally {
        setLoading(false);
      }
    },
    [analyticsFn],
  );

  useEffect(() => {
    load(days);
  }, [days, load]);

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold mb-1">Analytics &amp; Reports</h1>
          <p className="text-sm text-muted-foreground">Performance, sales &amp; traffic insights</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex flex-wrap rounded-lg border bg-card p-1">
            {RANGES.map((r) => (
              <button
                key={r.days}
                type="button"
                onClick={() => setDays(r.days)}
                className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                  days === r.days
                    ? "bg-primary text-primary-foreground font-medium"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            disabled={!data}
            onClick={() => data && exportAnalyticsCsv(data, days)}
            className="inline-flex items-center gap-1.5 border rounded-lg px-3 py-1.5 text-sm font-medium hover:bg-muted disabled:opacity-50"
          >
            ⬇ Export CSV
          </button>
        </div>
      </div>

      {loading || !data ? (
        <div className="bg-card border rounded-xl p-10 text-center text-sm text-muted-foreground">
          {loading ? "Loading analytics…" : "No data available."}
        </div>
      ) : (
        <Dashboard data={data} days={days} />
      )}
    </div>
  );
}

function Dashboard({ data, days }: { data: AnalyticsData; days: number }) {
  const statusEntries = Object.entries(data.statusBreakdown).sort((a, b) => b[1] - a[1]);
  const paymentEntries = Object.entries(data.paymentBreakdown).sort((a, b) => b[1] - a[1]);
  const deviceEntries = Object.entries(data.deviceBreakdown).sort((a, b) => b[1] - a[1]);
  const countryEntries = Object.entries(data.countryBreakdown).sort((a, b) => b[1] - a[1]);

  const maxStatus = Math.max(...statusEntries.map(([, v]) => v), 1);
  const maxPayment = Math.max(...paymentEntries.map(([, v]) => v), 1);

  const moneyTotal = Math.max(data.paidRevenue + data.codRevenue, 1);
  const paidPct = Math.round((data.paidRevenue / moneyTotal) * 100);

  return (
    <div className="space-y-4">
      <div className="grid md:grid-cols-4 gap-4">
        <Metric
          label="Total Revenue"
          value={formatBDT(data.revenue)}
          icon={DollarSign}
          growth={data.revenueGrowth}
          sub={`Prev: ${formatBDT(data.revenuePrev)}`}
        />
        <Metric
          label="Orders"
          value={String(data.orders)}
          icon={ShoppingBag}
          growth={pctChange(data.orders, data.ordersPrev)}
          sub={`Prev: ${data.ordersPrev}`}
        />
        <Metric
          label="Avg. Order Value"
          value={formatBDT(data.aov)}
          icon={TrendingUp}
          sub={`Over last ${days} days`}
        />
        <Metric
          label="Unique Visitors"
          value={String(data.uniqueVisitors)}
          icon={Users}
          sub={`${data.visits} total visits`}
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <ChartPanel title="Revenue over time">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data.revenueSeries} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
              <defs>
                <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-border" opacity={0.4} />
              <XAxis
                dataKey="date"
                tickFormatter={(d: string) => d.slice(5)}
                tick={{ fontSize: 12 }}
                stroke="currentColor"
                className="text-muted-foreground"
              />
              <YAxis
                tick={{ fontSize: 12 }}
                width={70}
                tickFormatter={(v: number) => formatBDT(v)}
                stroke="currentColor"
                className="text-muted-foreground"
              />
              <Tooltip
                formatter={(value: number | string, name: string) =>
                  name === "revenue" ? [formatBDT(Number(value)), "Revenue"] : [String(value), "Orders"]
                }
                contentStyle={{ borderRadius: 12, border: "1px solid var(--border)", fontSize: 13 }}
              />
              <Area type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2} fill="url(#revFill)" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartPanel>

        <ChartPanel title="Visits over time">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data.visitSeries} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
              <defs>
                <linearGradient id="visitFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-border" opacity={0.4} />
              <XAxis
                dataKey="date"
                tickFormatter={(d: string) => d.slice(5)}
                tick={{ fontSize: 12 }}
                stroke="currentColor"
                className="text-muted-foreground"
              />
              <YAxis tick={{ fontSize: 12 }} width={40} stroke="currentColor" className="text-muted-foreground" />
              <Tooltip
                formatter={(value: number | string) => [String(value), "Visits"]}
                contentStyle={{ borderRadius: 12, border: "1px solid var(--border)", fontSize: 13 }}
              />
              <Area type="monotone" dataKey="visits" stroke="#3b82f6" strokeWidth={2} fill="url(#visitFill)" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartPanel>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <MoneyCard label="Paid Revenue" value={data.paidRevenue} icon={Wallet} accent="#10b981" />
        <MoneyCard label="COD Revenue" value={data.codRevenue} icon={Truck} accent="#f59e0b" />
        <div className="bg-card border rounded-xl p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Paid vs COD split</p>
            <Eye className="h-5 w-5 text-primary" />
          </div>
          <p className="text-2xl font-bold mt-2">{paidPct}% paid</p>
          <div className="h-2 bg-muted rounded-full overflow-hidden mt-3 flex">
            <div className="h-full" style={{ width: `${paidPct}%`, backgroundColor: "#10b981" }} />
            <div className="h-full flex-1" style={{ backgroundColor: "#f59e0b" }} />
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <TablePanel
          title="Top Products"
          headers={["#", "Product", "Qty", "Revenue"]}
          empty="No sales yet."
          rows={data.topProducts.map((p, i) => (
            <tr key={p.name} className="border-b last:border-0">
              <td className="py-2 font-mono text-xs">{i + 1}</td>
              <td>{p.name}</td>
              <td>{p.qty}</td>
              <td className="font-semibold">{formatBDT(p.revenue)}</td>
            </tr>
          ))}
        />

        <TablePanel
          title="Top Customers"
          headers={["#", "Customer", "Orders", "Spent"]}
          empty="No customers yet."
          rows={data.topCustomers.map((c, i) => (
            <tr key={c.name + i} className="border-b last:border-0">
              <td className="py-2 font-mono text-xs">{i + 1}</td>
              <td>{c.name}</td>
              <td>{c.orders}</td>
              <td className="font-semibold">{formatBDT(c.spent)}</td>
            </tr>
          ))}
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="bg-card border rounded-xl p-5">
          <h2 className="font-semibold mb-4">Orders by status</h2>
          {statusEntries.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No orders yet.</p>
          ) : (
            <div className="space-y-3">
              {statusEntries.map(([status, cnt]) => (
                <BarRow
                  key={status}
                  label={status}
                  value={cnt}
                  max={maxStatus}
                  color={STATUS_COLORS[status] ?? "#6366f1"}
                />
              ))}
            </div>
          )}
        </div>

        <div className="bg-card border rounded-xl p-5">
          <h2 className="font-semibold mb-4">Payment breakdown</h2>
          {paymentEntries.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No payments yet.</p>
          ) : (
            <div className="space-y-3">
              {paymentEntries.map(([method, cnt]) => (
                <BarRow
                  key={method}
                  label={method}
                  value={cnt}
                  max={maxPayment}
                  color={PAYMENT_COLORS[method] ?? "#6366f1"}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <ChipsPanel title="Devices" entries={deviceEntries} />
        <ChipsPanel title="Countries" entries={countryEntries} />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <ListPanel
          title="Top Pages"
          empty="No page views yet."
          items={data.topPages.map((p) => ({ key: p.path, primary: p.path, value: String(p.views) }))}
        />
        <ListPanel
          title="Top Referrers"
          empty="No referrers yet."
          items={data.topReferrers.map((r) => ({
            key: r.referrer,
            primary: r.referrer || "Direct",
            value: String(r.count),
          }))}
        />
      </div>
    </div>
  );
}

function pctChange(cur: number, prev: number): number {
  if (!prev) return cur > 0 ? 100 : 0;
  return Math.round(((cur - prev) / prev) * 100);
}

function Metric({
  label,
  value,
  icon: Icon,
  sub,
  growth,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  sub: string;
  growth?: number;
}) {
  const up = (growth ?? 0) >= 0;
  return (
    <div className="bg-card border rounded-xl p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{label}</p>
        <Icon className="h-5 w-5 text-primary" />
      </div>
      <p className="text-2xl font-bold mt-2">{value}</p>
      <div className="flex items-center gap-2 mt-1">
        {growth !== undefined && (
          <span
            className={`inline-flex items-center gap-0.5 text-xs font-medium ${
              up ? "text-emerald-500" : "text-red-500"
            }`}
          >
            {up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {Math.abs(growth)}%
          </span>
        )}
        <p className="text-xs text-muted-foreground">{sub}</p>
      </div>
    </div>
  );
}

function MoneyCard({
  label,
  value,
  icon: Icon,
  accent,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  accent: string;
}) {
  return (
    <div className="bg-card border rounded-xl p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{label}</p>
        <Icon className="h-5 w-5" style={{ color: accent }} />
      </div>
      <p className="text-2xl font-bold mt-2" style={{ color: accent }}>
        {formatBDT(value)}
      </p>
    </div>
  );
}

function ChartPanel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-card border rounded-xl p-5 min-w-0">
      <h2 className="font-semibold mb-4">{title}</h2>
      <div className="h-64 w-full min-w-0">{children}</div>
    </div>
  );
}

function BarRow({
  label,
  value,
  max,
  color,
}: {
  label: string;
  value: number;
  max: number;
  color: string;
}) {
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="capitalize">{label}</span>
        <span className="font-semibold">{value}</span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full rounded-full"
          style={{ width: `${(value / max) * 100}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

function ChipsPanel({ title, entries }: { title: string; entries: [string, number][] }) {
  return (
    <div className="bg-card border rounded-xl p-5">
      <h2 className="font-semibold mb-4">{title}</h2>
      {entries.length === 0 ? (
        <p className="text-sm text-muted-foreground py-6 text-center">No data yet.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {entries.map(([k, v]) => (
            <span
              key={k}
              className="inline-flex items-center gap-1.5 rounded-full border bg-muted/40 px-3 py-1 text-sm"
            >
              <span className="capitalize">{k || "Unknown"}</span>
              <span className="font-semibold text-primary">{v}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function ListPanel({
  title,
  items,
  empty,
}: {
  title: string;
  items: { key: string; primary: string; value: string }[];
  empty: string;
}) {
  return (
    <div className="bg-card border rounded-xl p-5">
      <h2 className="font-semibold mb-4">{title}</h2>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground py-6 text-center">{empty}</p>
      ) : (
        <div className="space-y-2">
          {items.map((it) => (
            <div
              key={it.key}
              className="flex items-center justify-between gap-3 text-sm border-b last:border-0 pb-2 last:pb-0"
            >
              <span className="truncate text-muted-foreground">{it.primary}</span>
              <span className="font-semibold shrink-0">{it.value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TablePanel({
  title,
  headers,
  rows,
  empty,
}: {
  title: string;
  headers: string[];
  rows: React.ReactNode[];
  empty: string;
}) {
  return (
    <div className="bg-card border rounded-xl p-5">
      <h2 className="font-semibold mb-4">{title}</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-muted-foreground border-b">
              {headers.map((h) => (
                <th key={h} className="py-2">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={headers.length} className="py-6 text-center text-muted-foreground">
                  {empty}
                </td>
              </tr>
            ) : (
              rows
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
