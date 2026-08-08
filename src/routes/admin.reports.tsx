import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { adminSalesReport, adminLowStock, type SalesReport, type LowStockRow } from "@/lib/reports.functions";
import { formatBDT } from "@/lib/cart";
import { BarChart3, TrendingUp, Receipt, Ticket, AlertTriangle, Package } from "lucide-react";

export const Route = createFileRoute("/admin/reports")({ component: ReportsPage });

const RANGES = [7, 30, 90, 365];

function ReportsPage() {
  const reportFn = useServerFn(adminSalesReport);
  const lowFn = useServerFn(adminLowStock);
  const [days, setDays] = useState(30);
  const [rep, setRep] = useState<SalesReport | null>(null);
  const [low, setLow] = useState<LowStockRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback((d: number) => {
    setLoading(true);
    Promise.all([reportFn({ data: { days: d } }), lowFn({ data: { globalThreshold: 10 } })])
      .then(([r, l]) => { setRep(r); setLow(l); })
      .catch((e) => toast.error(e instanceof Error ? e.message : "Failed"))
      .finally(() => setLoading(false));
  }, [reportFn, lowFn]);

  useEffect(() => { load(days); }, [days, load]);

  return (
    <div className="pb-16">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2"><BarChart3 className="h-6 w-6" /> Reports</h1>
        <div className="flex gap-1 border rounded-lg p-1">
          {RANGES.map((r) => (
            <button key={r} onClick={() => setDays(r)} className={`text-sm px-3 py-1 rounded-md ${days === r ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}>{r === 365 ? "1y" : `${r}d`}</button>
          ))}
        </div>
      </div>

      {loading || !rep ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            <Kpi icon={<TrendingUp className="h-4 w-4" />} label="Revenue" value={formatBDT(rep.totals.revenue)} />
            <Kpi icon={<BarChart3 className="h-4 w-4" />} label="Orders" value={String(rep.totals.orders)} sub={`${rep.totals.units} units`} />
            <Kpi icon={<Receipt className="h-4 w-4" />} label="Avg order" value={formatBDT(rep.totals.avgOrder)} />
            <Kpi icon={<Ticket className="h-4 w-4" />} label="Discounts" value={formatBDT(rep.totals.discount)} sub={`Tax ${formatBDT(rep.totals.tax)}`} />
          </div>

          <div className="border rounded-2xl p-5 bg-card mb-6">
            <h3 className="font-semibold mb-4">Revenue over time</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={rep.daily} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-primary, #2CA6E0)" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="var(--color-primary, #2CA6E0)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(d) => String(d).slice(5)} minTickGap={24} />
                  <YAxis tick={{ fontSize: 11 }} width={50} />
                  <Tooltip formatter={(v: number) => formatBDT(v)} />
                  <Area type="monotone" dataKey="revenue" stroke="var(--color-primary, #2CA6E0)" fill="url(#rev)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-6 mb-6">
            <Card title="Top products">
              {rep.topProducts.length === 0 ? <Empty /> : (
                <ul className="divide-y">
                  {rep.topProducts.map((p) => (
                    <li key={p.name} className="flex items-center justify-between py-2 text-sm">
                      <span className="truncate pr-2">{p.name}</span>
                      <span className="text-muted-foreground shrink-0">{p.qty}× · <span className="font-semibold text-foreground">{formatBDT(p.revenue)}</span></span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
            <Card title="Coupons used">
              {rep.coupons.length === 0 ? <Empty label="No coupons redeemed." /> : (
                <ul className="divide-y">
                  {rep.coupons.map((c) => (
                    <li key={c.code} className="flex items-center justify-between py-2 text-sm">
                      <span className="font-mono">{c.code}</span>
                      <span className="text-muted-foreground">{c.count}× · −{formatBDT(c.discount)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
            <Card title="Payment methods">
              {rep.payments.length === 0 ? <Empty /> : (
                <ul className="divide-y">
                  {rep.payments.map((p) => (
                    <li key={p.method} className="flex items-center justify-between py-2 text-sm">
                      <span className="capitalize">{p.method}</span>
                      <span className="text-muted-foreground">{p.count}× · <span className="font-semibold text-foreground">{formatBDT(p.revenue)}</span></span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
            <Card title="Order statuses">
              {rep.statuses.length === 0 ? <Empty /> : (
                <ul className="divide-y">
                  {rep.statuses.map((s) => (
                    <li key={s.status} className="flex items-center justify-between py-2 text-sm">
                      <span className="capitalize">{s.status}</span>
                      <span className="text-muted-foreground">{s.count}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>

          <div className="border rounded-2xl p-5 bg-card">
            <h3 className="font-semibold mb-1 flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-amber-500" /> Low-stock alerts <span className="text-sm font-normal text-muted-foreground">({low.length})</span></h3>
            <p className="text-sm text-muted-foreground mb-4">Products at or below their threshold (per-product, or 10 by default).</p>
            {low.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Everything is well stocked. 🎉</p>
            ) : (
              <div className="space-y-2">
                {low.map((p) => (
                  <div key={p.id} className="flex items-center gap-3 border rounded-lg p-2">
                    <img src={p.image} alt="" className="h-9 w-9 rounded object-cover" />
                    <span className="flex-1 truncate text-sm font-medium">{p.name}</span>
                    <span className={`text-sm font-semibold ${p.stock === 0 ? "text-red-600" : "text-amber-600"}`}>{p.stock === 0 ? "Out of stock" : `${p.stock} left`}</span>
                    <a href={`/admin/products`} className="text-xs text-primary hover:underline flex items-center gap-1"><Package className="h-3.5 w-3.5" /> Restock</a>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function Kpi({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub?: string }) {
  return (
    <div className="border rounded-2xl p-4 bg-card">
      <p className="text-xs text-muted-foreground uppercase font-semibold flex items-center gap-1.5">{icon} {label}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}
function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border rounded-2xl p-5 bg-card">
      <h3 className="font-semibold mb-2">{title}</h3>
      {children}
    </div>
  );
}
function Empty({ label = "No data in this range." }: { label?: string }) {
  return <p className="text-sm text-muted-foreground py-4 text-center">{label}</p>;
}
