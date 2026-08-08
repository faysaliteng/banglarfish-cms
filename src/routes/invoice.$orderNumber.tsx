import { createFileRoute, notFound } from "@tanstack/react-router";
import { getInvoice } from "@/lib/orders.functions";
import { formatBDT } from "@/lib/cart";

export const Route = createFileRoute("/invoice/$orderNumber")({
  loader: async ({ params }) => {
    try {
      const inv = await getInvoice({ data: { order_number: params.orderNumber } });
      return { inv };
    } catch (e) {
      throw notFound({ data: { message: e instanceof Error ? e.message : "Invoice not available" } });
    }
  },
  head: () => ({ meta: [{ title: "Invoice — Banglarfish" }, { name: "robots", content: "noindex" }] }),
  component: InvoicePage,
});

function InvoicePage() {
  const { inv } = Route.useLoaderData();
  const s = inv.store;
  const custAddr = [inv.address_line1, inv.address_line2, [inv.city, inv.district, inv.postal_code].filter(Boolean).join(", ")].filter(Boolean);

  return (
    <div style={{ background: "#f3f4f6", minHeight: "100vh", padding: "clamp(12px, 4vw, 24px)", fontFamily: "system-ui, Arial, sans-serif", color: "#111827" }}>
      <style>{`@media print { .noprint { display: none !important; } body, .page { background: #fff !important; } .page { box-shadow: none !important; margin: 0 !important; } @page { size: A4; margin: 14mm; } }`}</style>

      <div className="noprint" style={{ maxWidth: 760, margin: "0 auto 12px", display: "flex", justifyContent: "flex-end", gap: 8 }}>
        <a href={`/api/invoice/${inv.order_number}.pdf`} target="_blank" rel="noreferrer" style={{ background: "#0ea5b7", color: "#fff", border: 0, borderRadius: 8, padding: "10px 18px", fontWeight: 600, cursor: "pointer", textDecoration: "none" }}>⬇ Download PDF invoice</a>
        <button onClick={() => window.print()} style={{ background: "#fff", color: "#0ea5b7", border: "1px solid #0ea5b7", borderRadius: 8, padding: "10px 18px", fontWeight: 600, cursor: "pointer" }}>🖨 Print</button>
      </div>

      <div className="page" style={{ maxWidth: 760, margin: "0 auto", background: "#fff", borderRadius: 10, boxShadow: "0 1px 8px rgba(0,0,0,.08)", padding: "clamp(16px, 5vw, 40px)" }}>
        {/* Header: store (left) + invoice meta (right) */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 24, flexWrap: "wrap" }}>
          <div style={{ maxWidth: 340 }}>
            {s.logo
              ? <img src={s.logo} alt={s.name} style={{ height: 46, maxWidth: 220, objectFit: "contain", marginBottom: 8 }} />
              : <div style={{ fontSize: 24, fontWeight: 800, color: "#0ea5b7", marginBottom: 8 }}>{s.name}</div>}
            <div style={{ fontSize: 12, color: "#4b5563", lineHeight: 1.6 }}>
              {s.logo && <div style={{ fontWeight: 700, color: "#111827" }}>{s.name}</div>}
              {s.address && <div>{s.address}</div>}
              {s.phone && <div>{s.phone}</div>}
              {s.email && <div>{s.email}</div>}
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: 1, color: "#111827" }}>INVOICE</div>
            <div style={{ fontSize: 13, marginTop: 6 }}><span style={{ color: "#6b7280" }}>Invoice #</span> <strong>{inv.order_number}</strong></div>
            <div style={{ fontSize: 13 }}><span style={{ color: "#6b7280" }}>Date</span> {new Date(inv.created_at).toLocaleDateString()}</div>
            <div style={{ fontSize: 13 }}><span style={{ color: "#6b7280" }}>Status</span> <span style={{ textTransform: "capitalize" }}>{inv.status}</span></div>
          </div>
        </div>

        <div style={{ height: 3, background: "#0ea5b7", borderRadius: 2, margin: "18px 0 22px" }} />

        {/* Bill to + payment */}
        <div style={{ display: "flex", justifyContent: "space-between", gap: 24, fontSize: 13, marginBottom: 22, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 1, color: "#6b7280", fontWeight: 700, marginBottom: 4 }}>Bill to</div>
            <div style={{ fontWeight: 700 }}>{inv.full_name}</div>
            {inv.phone && <div>{inv.phone}</div>}
            {inv.email && <div>{inv.email}</div>}
            {custAddr.map((l, i) => <div key={i} style={{ color: "#374151" }}>{l}</div>)}
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 1, color: "#6b7280", fontWeight: 700, marginBottom: 4 }}>Payment</div>
            <div style={{ textTransform: "capitalize" }}>{inv.payment_method}</div>
            <div style={{ textTransform: "capitalize", color: inv.payment_status === "paid" ? "#059669" : "#6b7280" }}>{inv.payment_status}</div>
          </div>
        </div>

        {/* Items */}
        <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 420 }}>
          <thead>
            <tr style={{ background: "#f9fafb", color: "#374151", textAlign: "left" }}>
              <th style={{ padding: "10px 8px", borderBottom: "2px solid #e5e7eb" }}>Description</th>
              <th style={{ padding: "10px 8px", borderBottom: "2px solid #e5e7eb", textAlign: "center", width: 60 }}>Qty</th>
              <th style={{ padding: "10px 8px", borderBottom: "2px solid #e5e7eb", textAlign: "right", width: 110 }}>Unit price</th>
              <th style={{ padding: "10px 8px", borderBottom: "2px solid #e5e7eb", textAlign: "right", width: 110 }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {inv.items.map((it, i) => (
              <tr key={i}>
                <td style={{ padding: "10px 8px", borderBottom: "1px solid #f1f5f9" }}>{it.name}{it.weight ? ` — ${it.weight}` : ""}</td>
                <td style={{ padding: "10px 8px", borderBottom: "1px solid #f1f5f9", textAlign: "center" }}>{it.qty}</td>
                <td style={{ padding: "10px 8px", borderBottom: "1px solid #f1f5f9", textAlign: "right" }}>{formatBDT(it.price)}</td>
                <td style={{ padding: "10px 8px", borderBottom: "1px solid #f1f5f9", textAlign: "right" }}>{formatBDT(it.price * it.qty)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>

        {/* Totals */}
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 18 }}>
          <div style={{ width: 280, fontSize: 13 }}>
            <Row label="Subtotal" value={formatBDT(inv.subtotal)} />
            {inv.discount > 0 && <Row label="Discount" value={`-${formatBDT(inv.discount)}`} />}
            <Row label="Shipping" value={inv.shipping === 0 ? "Free" : formatBDT(inv.shipping)} />
            {inv.tax > 0 && <Row label="Tax" value={formatBDT(inv.tax)} />}
            <div style={{ display: "flex", justifyContent: "space-between", borderTop: "2px solid #111827", marginTop: 8, paddingTop: 10, fontSize: 17, fontWeight: 800 }}>
              <span>Total</span><span style={{ color: "#0ea5b7" }}>{formatBDT(inv.total)}</span>
            </div>
          </div>
        </div>

        <div style={{ borderTop: "1px solid #f1f5f9", marginTop: 34, paddingTop: 14, textAlign: "center", color: "#9ca3af", fontSize: 12 }}>
          Thank you for your order! {s.email ? `Questions? ${s.email}` : ""}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0" }}><span style={{ color: "#6b7280" }}>{label}</span><span>{value}</span></div>;
}
