import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { adminListOrders, adminUpdateOrderStatus, adminOrderHistory, adminRefundOrder, adminCreateManualOrder } from "@/lib/admin-orders.functions";
import { adminListProducts } from "@/lib/admin-catalog.functions";
import type { AdminProduct } from "@/lib/admin-catalog.functions";
import { formatBDT } from "@/lib/cart";
import { Search, Eye, Package, Printer, RotateCcw, Plus, Trash2, MessageCircle } from "lucide-react";
import { Modal } from "@/components/admin/Modal";
import { toast } from "sonner";

// Open WhatsApp with a prefilled message to the customer (international format, no +).
function waLink(phone: string, text: string): string {
  const digits = phone.replace(/\D/g, "");
  const intl = digits.startsWith("880") ? digits : digits.startsWith("0") ? "88" + digits : digits.startsWith("1") ? "880" + digits : digits;
  return `https://wa.me/${intl}?text=${encodeURIComponent(text)}`;
}

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
  const refundFn = useServerFn(adminRefundOrder);

  async function doRefund(o: { id: string; total: number }) {
    const input = window.prompt(`Refund amount in ৳ (blank = full ৳${o.total}). Stock will be restored.`, "");
    if (input === null) return;
    const amount = input.trim() ? Number(input) : undefined;
    try {
      const r = await refundFn({ data: { id: o.id, amount: amount && amount > 0 ? Math.round(amount) : undefined, restock: true } });
      toast.success(`Refunded ৳${r.amount}${r.partial ? " (partial)" : ""} · stock restored`);
      setOrders((prev) => prev.map((x) => (x.id === o.id ? { ...x, payment_status: "refunded" as PaymentStatus, status: "refunded" } : x)));
      setView((v) => (v && v.id === o.id ? { ...v, payment_status: "refunded" as PaymentStatus, status: "refunded" } : v));
    } catch (e) { toast.error(e instanceof Error ? e.message : "Refund failed"); }
  }
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<(typeof tabs)[number]>("All");
  const [q, setQ] = useState("");
  const [view, setView] = useState<Order | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [newOpen, setNewOpen] = useState(false);
  const [products, setProducts] = useState<AdminProduct[] | null>(null);
  const loadProducts = useServerFn(adminListProducts);

  function openNew() {
    setNewOpen(true);
    if (!products) loadProducts().then((p) => setProducts(p as AdminProduct[])).catch(() => setProducts([]));
  }

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
        <div className="flex items-center gap-3">
          <div className="text-sm text-muted-foreground">Total: {formatBDT(orders.reduce((s, o) => s + Number(o.total), 0))}</div>
          <button onClick={openNew} className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-semibold hover:bg-primary/90">
            <Plus className="h-4 w-4" /> New order
          </button>
        </div>
      </div>
      <p className="text-sm text-muted-foreground mb-6">Live orders from database · use <strong>New order</strong> for phone/WhatsApp/offline orders</p>

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
                    <div className="flex items-center gap-1">
                      <a href={waLink(o.phone, `Banglarfish: আপনার অর্ডার #${o.order_number} (৳${o.total})। ধন্যবাদ!`)} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="p-1.5 hover:bg-muted rounded text-emerald-600" title="WhatsApp customer"><MessageCircle className="h-4 w-4" /></a>
                      <button onClick={() => openView(o)} className="p-1.5 hover:bg-muted rounded text-primary" title="View"><Eye className="h-4 w-4" /></button>
                    </div>
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
            <div className="flex justify-end gap-2 no-print">
              <a href={waLink(view.phone, `Banglarfish: আপনার অর্ডার #${view.order_number} (৳${view.total})। মোট ${(view.items ?? []).reduce((s, i) => s + i.qty, 0)}টি পণ্য। ধন্যবাদ!`)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 border rounded-md px-3 py-1.5 text-xs font-semibold hover:bg-muted text-emerald-600">
                <MessageCircle className="h-4 w-4" /> WhatsApp
              </a>
              {view.payment_status !== "refunded" && (
                <button onClick={() => doRefund(view)} className="inline-flex items-center gap-1.5 border rounded-md px-3 py-1.5 text-xs font-semibold hover:bg-muted text-destructive">
                  <RotateCcw className="h-4 w-4" /> Refund
                </button>
              )}
              <a href={`/api/invoice/${view.order_number}.pdf`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 border rounded-md px-3 py-1.5 text-xs font-semibold hover:bg-muted">
                <Printer className="h-4 w-4" /> Download PDF invoice
              </a>
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

      <Modal open={newOpen} onClose={() => setNewOpen(false)} title="New order — phone / WhatsApp / offline" size="lg">
        <ManualOrderForm products={products} onCreated={() => { setNewOpen(false); load(); }} />
      </Modal>
    </div>
  );
}

type CartLine = { product: AdminProduct; variantId: string | null; qty: number };

function ManualOrderForm({ products, onCreated }: { products: AdminProduct[] | null; onCreated: () => void }) {
  const create = useServerFn(adminCreateManualOrder);
  const [q, setQ] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [cust, setCust] = useState({ full_name: "", phone: "", email: "", address_line1: "", city: "", district: "", postal_code: "" });
  const [payMethod, setPayMethod] = useState<"cod" | "bkash" | "nagad" | "card">("cod");
  const [payStatus, setPayStatus] = useState<"pending" | "paid">("pending");
  const [shipping, setShipping] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [notes, setNotes] = useState("");
  const [createAccount, setCreateAccount] = useState(true);
  const [notifySms, setNotifySms] = useState(true);
  const [notifyEmail, setNotifyEmail] = useState(true);
  const [busy, setBusy] = useState(false);

  const results = useMemo(
    () => (products ?? []).filter((p) => p.active && (!q.trim() || `${p.name} ${p.slug} ${p.sku ?? ""}`.toLowerCase().includes(q.toLowerCase()))).slice(0, 8),
    [products, q],
  );

  function priceOf(l: CartLine): number {
    const v = l.variantId ? l.product.variants?.find((x) => x.id === l.variantId) : null;
    return v?.price ?? l.product.price;
  }
  const subtotal = cart.reduce((s, l) => s + priceOf(l) * l.qty, 0);
  const total = Math.max(0, subtotal - (Number(discount) || 0) + (Number(shipping) || 0));

  function addProduct(p: AdminProduct) {
    const variantId = p.variants && p.variants.length ? p.variants[0].id : null;
    setCart((prev) => {
      const idx = prev.findIndex((l) => l.product.id === p.id && l.variantId === variantId);
      if (idx >= 0) { const n = [...prev]; n[idx] = { ...n[idx], qty: n[idx].qty + 1 }; return n; }
      return [...prev, { product: p, variantId, qty: 1 }];
    });
    setQ("");
  }

  async function submit() {
    if (cart.length === 0) return toast.error("Add at least one product");
    if (!cust.full_name.trim() || !cust.phone.trim()) return toast.error("Customer name and phone are required");
    if (createAccount && !cust.email.trim()) return toast.error("Email is required to create a customer account (or uncheck 'Create account')");
    setBusy(true);
    try {
      const res = await create({ data: {
        customer: {
          full_name: cust.full_name.trim(), phone: cust.phone.trim(), email: cust.email.trim(),
          address_line1: cust.address_line1.trim(), city: cust.city.trim(), district: cust.district.trim(), postal_code: cust.postal_code.trim(),
        },
        items: cart.map((l) => ({ productId: l.product.id, variantId: l.variantId, qty: l.qty })),
        payment_method: payMethod, payment_status: payStatus, status: "confirmed",
        shipping: Math.round(Number(shipping)) || 0, discount: Math.round(Number(discount)) || 0, notes: notes.trim(),
        create_account: createAccount, notify_sms: notifySms, notify_email: notifyEmail,
      } });
      const bits: string[] = [];
      if (res.account_created) bits.push("account created");
      if (res.sms) bits.push("SMS sent");
      if (res.email) bits.push("email sent");
      toast.success(`Order #${res.order_number} created${bits.length ? " · " + bits.join(", ") : ""}`);
      onCreated();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create order");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5 text-sm">
      {/* Product picker */}
      <div>
        <p className="text-xs uppercase font-semibold text-muted-foreground mb-2">Products</p>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={products ? "Search products to add…" : "Loading products…"} className="w-full border rounded-md pl-9 pr-3 py-2 text-sm" />
          {q.trim() && (
            <div className="absolute z-10 mt-1 w-full bg-card border rounded-md shadow-lg max-h-64 overflow-y-auto">
              {results.length === 0 && <p className="p-3 text-xs text-muted-foreground">No products found.</p>}
              {results.map((p) => (
                <button key={p.id} type="button" onClick={() => addProduct(p)} className="w-full flex items-center gap-3 p-2 hover:bg-muted text-left">
                  <img src={p.image} alt="" className="h-8 w-8 rounded object-cover" />
                  <span className="flex-1 truncate">{p.name}</span>
                  <span className="text-xs text-muted-foreground">{formatBDT(p.price)}</span>
                  <Plus className="h-4 w-4 text-primary" />
                </button>
              ))}
            </div>
          )}
        </div>

        {cart.length > 0 && (
          <ul className="border rounded-md divide-y mt-3">
            {cart.map((l, i) => (
              <li key={i} className="p-2.5 flex items-center gap-3">
                <img src={l.product.image} alt="" className="h-9 w-9 rounded object-cover" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{l.product.name}</p>
                  {l.product.variants && l.product.variants.length > 0 && (
                    <select value={l.variantId ?? ""} onChange={(e) => setCart((prev) => prev.map((x, j) => j === i ? { ...x, variantId: e.target.value || null } : x))} className="mt-1 border rounded px-1.5 py-0.5 text-xs bg-card">
                      {l.product.variants.map((v) => <option key={v.id} value={v.id}>{v.label} — {formatBDT(v.price)}</option>)}
                    </select>
                  )}
                </div>
                <input type="number" min={1} value={l.qty} onChange={(e) => setCart((prev) => prev.map((x, j) => j === i ? { ...x, qty: Math.max(1, Number(e.target.value) || 1) } : x))} className="w-16 border rounded px-2 py-1 text-sm text-center" />
                <span className="w-20 text-right font-semibold">{formatBDT(priceOf(l) * l.qty)}</span>
                <button type="button" onClick={() => setCart((prev) => prev.filter((_, j) => j !== i))} className="p-1 text-destructive hover:bg-muted rounded"><Trash2 className="h-4 w-4" /></button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Customer */}
      <div>
        <p className="text-xs uppercase font-semibold text-muted-foreground mb-2">Customer</p>
        <div className="grid sm:grid-cols-2 gap-2">
          <Inp v={cust.full_name} set={(x) => setCust({ ...cust, full_name: x })} ph="Full name *" />
          <Inp v={cust.phone} set={(x) => setCust({ ...cust, phone: x })} ph="Phone * (017XXXXXXXX)" />
          <Inp v={cust.email} set={(x) => setCust({ ...cust, email: x })} ph="Email (for account + email notify)" />
          <Inp v={cust.city} set={(x) => setCust({ ...cust, city: x })} ph="City" />
          <div className="sm:col-span-2"><Inp v={cust.address_line1} set={(x) => setCust({ ...cust, address_line1: x })} ph="Address" /></div>
          <Inp v={cust.district} set={(x) => setCust({ ...cust, district: x })} ph="District" />
          <Inp v={cust.postal_code} set={(x) => setCust({ ...cust, postal_code: x })} ph="Postal code" />
        </div>
      </div>

      {/* Payment + charges */}
      <div className="grid sm:grid-cols-2 gap-2">
        <label className="block"><span className="text-xs text-muted-foreground">Payment method</span>
          <select value={payMethod} onChange={(e) => setPayMethod(e.target.value as typeof payMethod)} className="mt-1 w-full border rounded-md px-3 py-2 text-sm bg-card capitalize">
            {(["cod", "bkash", "nagad", "card"] as const).map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </label>
        <label className="block"><span className="text-xs text-muted-foreground">Payment status</span>
          <select value={payStatus} onChange={(e) => setPayStatus(e.target.value as typeof payStatus)} className="mt-1 w-full border rounded-md px-3 py-2 text-sm bg-card capitalize">
            <option value="pending">pending</option><option value="paid">paid</option>
          </select>
        </label>
        <label className="block"><span className="text-xs text-muted-foreground">Shipping (৳)</span>
          <input type="number" min={0} value={shipping || ""} onChange={(e) => setShipping(Number(e.target.value) || 0)} className="mt-1 w-full border rounded-md px-3 py-2 text-sm" />
        </label>
        <label className="block"><span className="text-xs text-muted-foreground">Discount (৳)</span>
          <input type="number" min={0} value={discount || ""} onChange={(e) => setDiscount(Number(e.target.value) || 0)} className="mt-1 w-full border rounded-md px-3 py-2 text-sm" />
        </label>
      </div>

      <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Order notes (optional)" className="w-full border rounded-md px-3 py-2 text-sm" />

      <div className="flex flex-wrap gap-4 text-sm">
        <label className="flex items-center gap-2"><input type="checkbox" checked={createAccount} onChange={(e) => setCreateAccount(e.target.checked)} /> Create customer account</label>
        <label className="flex items-center gap-2"><input type="checkbox" checked={notifySms} onChange={(e) => setNotifySms(e.target.checked)} /> Send SMS</label>
        <label className="flex items-center gap-2"><input type="checkbox" checked={notifyEmail} onChange={(e) => setNotifyEmail(e.target.checked)} /> Send email</label>
      </div>

      {/* Totals + submit */}
      <div className="border-t pt-3 space-y-1">
        <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{formatBDT(subtotal)}</span></div>
        <div className="flex justify-between"><span className="text-muted-foreground">Shipping</span><span>{formatBDT(Number(shipping) || 0)}</span></div>
        {Number(discount) > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Discount</span><span>-{formatBDT(Number(discount))}</span></div>}
        <div className="flex justify-between text-lg font-bold pt-1"><span>Total</span><span className="text-[var(--color-brand)]">{formatBDT(total)}</span></div>
      </div>

      <div className="flex justify-end gap-2">
        <button type="button" onClick={submit} disabled={busy} className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-md font-semibold disabled:opacity-60">
          {busy ? "Creating…" : "Create order"}
        </button>
      </div>
      <p className="text-xs text-muted-foreground text-center">After creating, use the <span className="text-emerald-600 font-medium">WhatsApp</span> button on the order row to message the customer.</p>
    </div>
  );
}

function Inp({ v, set, ph }: { v: string; set: (x: string) => void; ph: string }) {
  return <input value={v} onChange={(e) => set(e.target.value)} placeholder={ph} className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />;
}
