import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { Img } from "@/components/site/Img";
import { SiteLayout } from "@/components/site/SiteLayout";
import { useCart, cart, cartTotals, formatBDT, lineKey } from "@/lib/cart";
import { useEffect, useState, useRef } from "react";
import { useServerFn } from "@tanstack/react-start";
import { me } from "@/lib/auth.functions";
import { getProfile } from "@/lib/account.functions";
import { createOrder } from "@/lib/orders.functions";
import { getEnabledPaymentMethods, checkCoupon } from "@/lib/site.functions";
import { checkGiftCard } from "@/lib/giftcards.functions";
import { captureCheckout } from "@/lib/checkout.functions";
import { withBase } from "@/lib/base-path";
import { toast } from "sonner";

/** Human label for a cart line, including the preparation options. Used for the
 *  abandoned-cart record so a recovery email says what they actually configured. */
function itemLabel(l: { name: string; weight: string; options?: { group: string; choice: string }[] }): string {
  const opts = (l.options ?? []).map((o) => `${o.group}: ${o.choice}`).join(", ");
  const base = l.weight ? `${l.name} (${l.weight})` : l.name;
  return opts ? `${base} [${opts}]` : base;
}

export const Route = createFileRoute("/checkout")({
  head: () => ({ meta: [{ title: "Checkout — Banglarfish" }, { name: "description", content: "Complete your order." }] }),
  component: Checkout,
});

type Prefill = { full_name?: string; phone?: string; address_line1?: string; address_line2?: string | null; city?: string; district?: string | null; postal_code?: string | null };

function Checkout() {
  const { lines } = useCart();
  const totals = cartTotals(lines);
  const nav = useNavigate();
  const [placing, setPlacing] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [signedIn, setSignedIn] = useState(false);
  const [prefill, setPrefill] = useState<Prefill | null>(null);
  // Stable idempotency key for this checkout attempt — dedupes double-submits server-side.
  const idemKeyRef = useRef<string>("");

  const fetchMe = useServerFn(me);
  const fetchProfile = useServerFn(getProfile);
  const submitOrder = useServerFn(createOrder);
  const capture = useServerFn(captureCheckout);
  const payMethodsFn = useServerFn(getEnabledPaymentMethods);
  const [pay, setPay] = useState<{ cod: boolean; bkash: boolean; nagad: boolean; card: boolean } | null>(null);
  const couponFn = useServerFn(checkCoupon);
  const giftFn = useServerFn(checkGiftCard);
  const [coupon, setCoupon] = useState({ code: "", discount: 0, msg: "", ok: false, busy: false });
  const [gift, setGift] = useState({ code: "", balance: 0, msg: "", ok: false, busy: false });

  // Save an in-progress checkout for abandoned-cart recovery (fires when contact entered).
  function captureNow(e: React.FocusEvent<HTMLInputElement>) {
    try {
      const form = e.currentTarget.form;
      if (!form || lines.length === 0) return;
      const fd = new FormData(form);
      const phone = String(fd.get("phone") ?? "").trim();
      const email = String(fd.get("email") ?? "").trim();
      if (!phone && !email) return;
      void capture({ data: { name: String(fd.get("full_name") ?? ""), phone, email, subtotal: totals.subtotal, items: lines.map((l) => ({ name: itemLabel(l), qty: l.qty, price: l.price })) } });
    } catch { /* ignore */ }
  }

  useEffect(() => {
    payMethodsFn().then(setPay).catch(() => setPay({ cod: true, bkash: false, nagad: false, card: false }));
  }, [payMethodsFn]);

  useEffect(() => {
    fetchMe().then(async (user) => {
      const isIn = !!user;
      setSignedIn(isIn);
      if (isIn) {
        try {
          const p = await fetchProfile();
          setPrefill(p as Prefill);
        } catch { /* ignore */ }
      }
      setCheckingAuth(false);
    });
  }, [fetchMe, fetchProfile]);

  if (lines.length === 0) {
    return (
      <SiteLayout>
        <div className="container-x py-20 text-center">
          <p>Your cart is empty.</p>
          <Link to="/shop" className="text-primary hover:underline">Go to shop</Link>
        </div>
      </SiteLayout>
    );
  }

  if (checkingAuth) {
    return <SiteLayout><div className="container-x py-20 text-center text-sm text-muted-foreground">Loading…</div></SiteLayout>;
  }

  // Validate codes as they are entered so an invalid one can't silently no-op.
  async function validateCoupon(code: string) {
    const c = code.trim();
    if (!c) { setCoupon({ code: "", discount: 0, msg: "", ok: false, busy: false }); return; }
    setCoupon((p) => ({ ...p, busy: true }));
    try {
      const r = await couponFn({ data: { code: c, subtotal: totals.subtotal } });
      setCoupon({ code: c, discount: r.discount, msg: r.reason, ok: r.valid, busy: false });
    } catch { setCoupon({ code: c, discount: 0, msg: "Could not check that code.", ok: false, busy: false }); }
  }
  async function validateGift(code: string) {
    const c = code.trim();
    if (!c) { setGift({ code: "", balance: 0, msg: "", ok: false, busy: false }); return; }
    setGift((p) => ({ ...p, busy: true }));
    try {
      const r = await giftFn({ data: { code: c } });
      setGift({ code: c, balance: r.balance, msg: r.valid ? `Balance ${formatBDT(r.balance)} will be applied` : "That gift card isn't valid.", ok: r.valid, busy: false });
    } catch { setGift({ code: c, balance: 0, msg: "Could not check that card.", ok: false, busy: false }); }
  }

  async function place(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPlacing(true);
    const fd = new FormData(e.currentTarget);
    try {
      const result = await submitOrder({
        data: {
          full_name: String(fd.get("full_name") ?? ""),
          phone: String(fd.get("phone") ?? ""),
          address_line1: String(fd.get("address_line1") ?? ""),
          address_line2: String(fd.get("address_line2") ?? "") || null,
          city: String(fd.get("city") ?? ""),
          district: String(fd.get("district") ?? "") || null,
          postal_code: String(fd.get("postal_code") ?? "") || null,
          notes: String(fd.get("notes") ?? "") || null,
          payment_method: String(fd.get("pay") ?? "cod") as "cod" | "bkash" | "nagad" | "card",
          coupon_code: String(fd.get("coupon") ?? "").trim() || null,
          gift_card_code: String(fd.get("gift_card") ?? "").trim() || null,
          email: String(fd.get("email") ?? "").trim() || null,
          idempotency_key: (idemKeyRef.current ||= (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`)),
          items: lines.map((l) => ({
            productId: l.productId, variantId: l.variantId ?? null, weight: l.weight, qty: l.qty,
            // Names only — the server prices them from the product.
            options: (l.options ?? []).map((o) => ({ group: o.group, choice: o.choice })),
          })),
        },
      });
      cart.clear();
      // COD returns a relative confirmation URL; online methods return a gateway URL.
      window.location.href = withBase(result.redirect_url);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to place order");
      setPlacing(false);
    }
  }

  return (
    <SiteLayout>
      <div className="container-x py-8">
        <h1 className="text-3xl font-bold mb-6">Checkout</h1>
        <form onSubmit={place} className="grid lg:grid-cols-[1fr_380px] gap-8">
          <div className="space-y-6">
            {!signedIn && (
              <Section title="Contact">
                <Input name="email" type="email" placeholder="Email * (order updates)" required onBlur={captureNow} />
                <p className="text-xs text-muted-foreground">Checking out as a guest. <Link to="/auth" search={{ next: "/checkout" }} className="text-primary hover:underline">Sign in</Link> for faster checkout &amp; order history.</p>
              </Section>
            )}
            <Section title="Delivery Address">
              <Input name="full_name" placeholder="Full name *" required defaultValue={prefill?.full_name ?? ""} />
              <Input name="phone" type="tel" placeholder="Phone * (e.g. 017XXXXXXXX)" required defaultValue={prefill?.phone ?? ""} onBlur={captureNow} />
              <Input name="address_line1" placeholder="Street address *" required defaultValue={prefill?.address_line1 ?? ""} />
              <Input name="address_line2" placeholder="Apartment, suite, etc. (optional)" defaultValue={prefill?.address_line2 ?? ""} />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input name="city" placeholder="City *" required defaultValue={prefill?.city ?? "Dhaka"} />
                <Input name="postal_code" placeholder="Postal code" defaultValue={prefill?.postal_code ?? ""} />
              </div>
              <Input name="district" placeholder="District" defaultValue={prefill?.district ?? ""} />
              <textarea name="notes" placeholder="Delivery notes (optional)" rows={2} className="w-full border rounded-md px-3 py-2 text-sm" />
            </Section>
            <Section title="Payment">
              {/* Only methods the merchant enabled in Admin -> Payment Gateways. */}
              {(() => {
                const m = pay ?? { cod: true, bkash: false, nagad: false, card: false };
                const opts = [
                  m.cod && { v: "cod", t: "Cash on Delivery", d: "Pay when your order arrives" },
                  m.bkash && { v: "bkash", t: "bKash", d: "Mobile financial service" },
                  m.nagad && { v: "nagad", t: "Nagad", d: "Mobile financial service" },
                  m.card && { v: "card", t: "Card (Visa / Mastercard)", d: "Secured via SSLCommerz" },
                ].filter(Boolean) as { v: string; t: string; d: string }[];
                if (!opts.length) return <p className="text-sm text-muted-foreground">No payment method is available right now. Please contact us to place your order.</p>;
                return opts.map((o, i) => <PayOption key={o.v} value={o.v} defaultChecked={i === 0} title={o.t} desc={o.d} />);
              })()}
            </Section>
          </div>
          <aside className="border rounded-xl p-6 h-fit bg-muted/30">
            <h3 className="font-semibold text-lg mb-4">Order ({lines.length})</h3>
            <ul className="space-y-3 text-sm max-h-72 overflow-auto">
              {lines.map((l) => (
                <li key={lineKey(l)} className="flex gap-3">
                  <Img src={l.image} alt={l.name} width={96} height={96} sizes="48px" widths={[48, 96]} className="h-12 w-12 rounded object-cover" />
                  <div className="flex-1">
                    <p className="font-medium leading-tight">{l.name}</p>
                    <p className="text-xs text-muted-foreground">{l.weight} × {l.qty}</p>
                  </div>
                  <span className="font-semibold">{formatBDT(l.price * l.qty)}</span>
                </li>
              ))}
            </ul>
            <div className="mt-4 space-y-2">
              <div>
                <input name="coupon" placeholder="Coupon code (optional)" onBlur={(e) => validateCoupon(e.target.value)} className={`w-full border rounded-md px-3 py-2 text-sm uppercase ${coupon.code && !coupon.busy ? (coupon.ok ? "border-emerald-400" : "border-amber-400") : ""}`} />
                {coupon.busy ? <p className="text-[11px] text-muted-foreground mt-1">Checking…</p>
                  : coupon.msg && <p className={`text-[11px] mt-1 ${coupon.ok ? "text-emerald-600" : "text-amber-600"}`}>{coupon.ok ? `✓ ${coupon.msg} (−${formatBDT(coupon.discount)})` : coupon.msg}</p>}
              </div>
              <div>
                <input name="gift_card" placeholder="Gift card code (optional)" onBlur={(e) => validateGift(e.target.value)} className={`w-full border rounded-md px-3 py-2 text-sm uppercase ${gift.code && !gift.busy ? (gift.ok ? "border-emerald-400" : "border-amber-400") : ""}`} />
                {gift.busy ? <p className="text-[11px] text-muted-foreground mt-1">Checking…</p>
                  : gift.msg && <p className={`text-[11px] mt-1 ${gift.ok ? "text-emerald-600" : "text-amber-600"}`}>{gift.ok ? `✓ ${gift.msg}` : gift.msg}</p>}
              </div>
              <p className="text-[11px] text-muted-foreground">Final amounts are confirmed by us when the order is placed.</p>
            </div>
            <div className="border-t mt-4 pt-4 space-y-1.5 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{formatBDT(totals.subtotal)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Shipping</span><span>{totals.shipping === 0 ? "FREE" : formatBDT(totals.shipping)}</span></div>
              {totals.tax > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Tax</span><span>{formatBDT(totals.tax)}</span></div>}
              {coupon.ok && coupon.discount > 0 && <div className="flex justify-between text-emerald-600"><span>Coupon discount</span><span>−{formatBDT(coupon.discount)}</span></div>}
              {gift.ok && gift.balance > 0 && <div className="flex justify-between text-emerald-600"><span>Gift card</span><span>−{formatBDT(Math.min(gift.balance, Math.max(0, totals.total - coupon.discount)))}</span></div>}
              <div className="flex justify-between text-lg font-bold pt-2"><span>Total</span><span className="text-[var(--color-brand)]">{formatBDT(Math.max(0, totals.total - (coupon.ok ? coupon.discount : 0) - (gift.ok ? Math.min(gift.balance, Math.max(0, totals.total - (coupon.ok ? coupon.discount : 0))) : 0)))}</span></div>
            </div>
            <button disabled={placing} className="w-full mt-5 bg-primary text-primary-foreground py-3 rounded-md font-semibold hover:bg-primary/90 disabled:opacity-60">
              {placing ? "Placing order..." : "Place Order"}
            </button>
          </aside>
        </form>
      </div>
    </SiteLayout>
  );
}

function PayOption({ value, title, desc, defaultChecked }: { value: string; title: string; desc: string; defaultChecked?: boolean }) {
  return (
    <label className="flex items-center gap-3 p-3 border rounded-md cursor-pointer has-[:checked]:border-primary has-[:checked]:bg-primary/5">
      <input type="radio" name="pay" value={value} defaultChecked={defaultChecked} />
      <div>
        <p className="font-semibold text-sm">{title}</p>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
    </label>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border rounded-xl p-5">
      <h3 className="font-semibold mb-4">{title}</h3>
      <div className="space-y-3">{children}</div>
    </div>
  );
}
function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />;
}
