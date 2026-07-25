import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { adminListOrders, adminUpdateOrderStatus, adminOrderHistory } from "@/lib/admin-orders.functions";
import { formatBDT } from "@/lib/cart";
import { Search, Eye, Package, Printer } from "lucide-react";
import { Modal } from "@/components/admin/Modal";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/orders")({ component: AdminOrders });

type OrderStatus = "pending" | "confirmed" | "processing" | "packed" | "shipped" | "delivered" | "cancelled" | "refunded";
type PaymentStatus = "pending" | "paid" | "failed" | "refunded";
type Item = { productId: string; variantId: string | null; name: string; image: string; weight: string; price: number; qty: number };

type Order = {
  id: string;
  order_number: string;
  full_name: string;
  phone: string;
  address_line1: string;
  address_line2: string | null;
  city: string;
  district: string | null;
  postal_code: string | null;
  notes: string | null;
  payment_method: string;
  payment_status: PaymentStatus;
  status: OrderStatus;
  items: Item[];
  subtotal: number;
  shipping: number;
  discount: number;
  total: number;
  coupon_code: string | null;
  created_at: string;
};

type HistoryEntry = { id: string; status: string; note: string | null; created_at: string };

const statuses: OrderStatus[] = ["pending", "confirmed", "processing", "packed", "shipped", "delivered", "cancelled", "refunded"];
const tabs: ("All" | OrderStatus)[] = ["All", ...statuses];

function AdminOrders() {
  const fetchAll = useServerFn(adminListOrders);
  const updateStatus = useServerFn(adminUpdateOrderStatus);
  const fetchHistory = useServerFn(adminOrderHistory);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<(typeof tabs)[number]>("All");
  const [q, setQ] = useState("");
  const [view, setView] = useState<Order | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  const load = useCallback(() => {
    setLoading(true);
    fetchAll()
      .then((d) => setOrders(d as Order[]))
      .catch((e) => toast.error(e instanceof Error ? e.message : "Failed"))
      .finally(() => setLoading(false));
  }, [fetchAll]);

  useEffect(() => { load(); }, [load]);

  const openView = useCallback((o: Order) => {
    setView(o);
    setHistory([]);
    fetchHistory({ data: { id: o.id } })
      .then((h) => setHistory(h as HistoryEntry[]))
      .catch(() => setHistory([]));
  }, [fetchHistory]);

  const filtered = useMemo(() => orders.filter((o) => {
    if (tab !== "All" && o.status !== tab) return false;
    if (q && !`${o.order_number} ${o.full_name} ${o.phone}`.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  }), [orders, tab, q]);

  async function setStatus(id: string, status: OrderStatus) {
    try {
      await updateStatus({ data: { id, status } });
      setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status } : o)));
      setView((v) => (v && v.id === id ? { ...v, status } : v));
      toast.success("Status updated");
      if (view && view.id === id) fetchHistory({ data: { id } }).then((h) => setHistory(h as HistoryEntry[])).catch(() => {});
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
  }

  async function setPayment(id: string, payment_status: PaymentStatus) {
    const current = orders.find((o) => o.id === id)?.status ?? view?.status ?? "pending";
    try {
      await updateStatus({ data: { id, status: current, payment_status } });
      setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, payment_status } : o)));
      setView((v) => (v && v.id === id ? { ...v, payment_status } : v));
      toast.success("Payment updated");
      if (view && view.id === id) fetchHistory({ data: { id } }).then((h) => setHistory(h as HistoryEntry[])).catch(() => {});
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
        <h1 className="text-2xl font-bold">Orders</h1>
        <div className="text-sm text-muted-foreground">Total: {formatBDT(orders.reduce((s, o) => s + Number(o.total), 0))}</div>
      </div>
      <p className="text-sm text-muted-foreground mb-6">Live orders from database</p>

      <div className="flex flex-wrap gap-2 mb-4">
        {tabs.map((t) => {
          const count = t === "All" ? orders.length : orders.filter((o) => o.status === t).length;
          return (
            <button key={t} onClick={() => setTab(t)} className={`px-3 py-1.5 rounded-full text-xs font-semibold border capitalize transition ${tab === t ? "bg-primary text-primary-foreground border-primary" : "hover:bg-muted"}`}>
              {t} <span className="opacity-70">({count})</span>
            </button>
          );
        })}
      </div>

      <div className="bg-card border rounded-xl overflow-hidden">
        <div className="p-4 border-b">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search order, customer, phone..." className="w-full border rounded-md pl-9 pr-3 py-2 text-sm" />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[820px]">
            <thead>
              <tr className="text-left text-muted-foreground border-b bg-muted/30">
                <th className="py-3 px-4">Order</th><th>Customer</th><th>Date</th><th>Items</th><th>Total</th><th>Payment</th><th>Status</th><th></th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={8} className="text-center py-12 text-muted-foreground">Loading…</td></tr>}
              {!loading && filtered.map((o) => (
                <tr key={o.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="py-3 px-4 font-mono text-xs">#{o.order_number}</td>
                  <td>
                    <p className="font-medium">{o.full_name}</p>
                    <p className="text-xs text-muted-foreground">{o.phone}</p>
                  </td>
                  <td className="text-muted-foreground text-xs">{o.created_at.slice(0, 10)}</td>
                  <td className="text-xs">{(o.items ?? []).reduce((s, i) => s + i.qty, 0)} items</td>
                  <td className="font-semibold">{formatBDT(Number(o.total))}</td>
                  <td className="text-xs">
                    <p className="capitalize">{o.payment_method}</p>
                    <p className={o.payment_status === "paid" ? "text-emerald-600 capitalize" : "text-muted-foreground capitalize"}>{o.payment_status}</p>
                  </td>
                  <td>
                    <select value={o.status} onChange={(e) => setStatus(o.id, e.target.value as OrderStatus)} className="border rounded px-2 py-1 text-xs bg-card capitalize">
                      {statuses.map((s) => <option key={s} value={s} className="capitalize">{s}</option>)}
                    </select>
                  </td>
                  <td>
                    <button onClick={() => openView(o)} className="p-1.5 hover:bg-muted rounded text-primary"><Eye className="h-4 w-4" /></button>
                  </td>
                </tr>
              ))}
              {!loading && filtered.length === 0 && (
                <tr><td colSpan={8} className="text-center py-12 text-muted-foreground"><Package className="h-8 w-8 mx-auto mb-2 opacity-40" />No orders match this filter</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={!!view} onClose={() => setView(null)} title={view ? `Order #${view.order_number}` : ""} size="lg">
        {view && (
          <div className="space-y-5 text-sm" id="admin-order-print">
            <div className="flex justify-end no-print">
              <button onClick={() => window.print()} className="inline-flex items-center gap-1.5 border rounded-md px-3 py-1.5 text-xs font-semibold hover:bg-muted">
                <Printer className="h-4 w-4" /> Print invoice
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-xs uppercase font-semibold text-muted-foreground">Customer</p>
                <p className="font-medium">{view.full_name}</p>
                <p>{view.phone}</p>
              </div>
              <div>
                <p className="text-xs uppercase font-semibold text-muted-foreground">Delivery</p>
                <p>{view.address_line1}</p>
                {view.address_line2 && <p>{view.address_line2}</p>}
                <p>{[view.city, view.district, view.postal_code].filter(Boolean).join(", ")}</p>
              </div>
              <div>
                <p className="text-xs uppercase font-semibold text-muted-foreground">Payment</p>
                <p className="capitalize">{view.payment_method} · <span className={view.payment_status === "paid" ? "text-emerald-600 font-semibold" : ""}>{view.payment_status}</span></p>
                <select value={view.payment_status} onChange={(e) => setPayment(view.id, e.target.value as PaymentStatus)} className="mt-1 border rounded px-2 py-1 text-xs capitalize no-print">
                  {(["pending", "paid", "failed", "refunded"] as PaymentStatus[]).map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <p className="text-xs uppercase font-semibold text-muted-foreground">Status</p>
                <p className="capitalize font-medium">{view.status}</p>
                <select value={view.status} onChange={(e) => setStatus(view.id, e.target.value as OrderStatus)} className="mt-1 border rounded px-2 py-1 text-xs capitalize no-print">
                  {statuses.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>

            <div>
              <p className="text-xs uppercase font-semibold text-muted-foreground mb-2">Items</p>
              <ul className="border rounded divide-y">
                {(view.items ?? []).map((it, i) => (
                  <li key={i} className="p-3 flex gap-3 items-center">
                    <img src={it.image} alt="" className="h-10 w-10 rounded object-cover" />
                    <div className="flex-1">
                      <p className="font-medium">{it.name}</p>
                      <p className="text-xs text-muted-foreground">{it.weight} × {it.qty}</p>
                    </div>
                    <span className="font-semibold">{formatBDT(it.price * it.qty)}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="border-t pt-3 space-y-1">
              <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{formatBDT(Number(view.subtotal))}</span></div>
              {Number(view.discount) > 0 && (
                <div className="flex justify-between"><span className="text-muted-foreground">Discount{view.coupon_code ? ` (${view.coupon_code})` : ""}</span><span>-{formatBDT(Number(view.discount))}</span></div>
              )}
              <div className="flex justify-between"><span className="text-muted-foreground">Shipping</span><span>{Number(view.shipping) === 0 ? "FREE" : formatBDT(Number(view.shipping))}</span></div>
              <div className="flex justify-between text-lg font-bold pt-1"><span>Total</span><span className="text-[var(--color-brand)]">{formatBDT(Number(view.total))}</span></div>
            </div>

            {view.notes && <div className="border rounded p-3 text-xs bg-muted/40"><b>Notes:</b> {view.notes}</div>}

            <div>
              <p className="text-xs uppercase font-semibold text-muted-foreground mb-2">History</p>
              {history.length === 0 ? (
                <p className="text-xs text-muted-foreground">No history yet.</p>
              ) : (
                <ul className="border rounded divide-y">
                  {history.map((h) => (
                    <li key={h.id} className="p-2.5 flex items-center justify-between text-xs">
                      <span className="capitalize font-medium">{h.status}{h.note ? ` · ${h.note}` : ""}</span>
                      <span className="text-muted-foreground">{h.created_at.slice(0, 16).replace("T", " ")}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
