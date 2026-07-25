import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site/SiteLayout";
import { useCart, cart, cartTotals, formatBDT } from "@/lib/cart";
import { Minus, Plus, X, ShoppingBag } from "lucide-react";

export const Route = createFileRoute("/cart")({
  head: () => ({ meta: [{ title: "Your Cart — Banglarfish" }, { name: "description", content: "Review your cart before checkout." }] }),
  component: CartPage,
});

function CartPage() {
  const { lines } = useCart();
  const totals = cartTotals(lines);

  if (lines.length === 0) {
    return (
      <SiteLayout>
        <div className="container-x py-20 text-center">
          <ShoppingBag className="h-14 w-14 mx-auto text-muted-foreground/50" />
          <h1 className="text-2xl font-bold mt-4">Your cart is empty</h1>
          <p className="text-muted-foreground mt-2">Start shopping for the freshest catch.</p>
          <Link to="/shop" className="inline-block mt-6 bg-primary text-primary-foreground px-6 py-3 rounded-full font-semibold">Browse shop</Link>
        </div>
      </SiteLayout>
    );
  }

  return (
    <SiteLayout>
      <div className="container-x py-8">
        <h1 className="text-3xl font-bold mb-6">Your Cart</h1>
        <div className="grid lg:grid-cols-[1fr_360px] gap-8">
          <div className="border rounded-xl divide-y">
            {lines.map((l) => (
              <div key={l.productId + l.weight} className="p-4 flex flex-wrap gap-4 items-center">
                <img src={l.image} alt={l.name} className="h-20 w-20 rounded-md object-cover shrink-0" />
                <div className="flex-1 min-w-[8rem]">
                  <Link to="/product/$slug" params={{ slug: l.slug }} className="font-semibold hover:text-primary break-words">{l.name}</Link>
                  <p className="text-xs text-muted-foreground">Weight: {l.weight}</p>
                  <p className="text-sm font-bold text-[var(--color-brand)] mt-1">{formatBDT(l.price)}</p>
                </div>
                <div className="flex items-center border rounded-md shrink-0">
                  <button onClick={() => cart.setQty(l.productId, l.weight, l.qty - 1)} className="p-2 hover:bg-muted"><Minus className="h-3 w-3" /></button>
                  <span className="w-10 text-center text-sm font-semibold">{l.qty}</span>
                  <button onClick={() => cart.setQty(l.productId, l.weight, l.qty + 1)} className="p-2 hover:bg-muted"><Plus className="h-3 w-3" /></button>
                </div>
                <div className="w-24 text-right font-semibold shrink-0">{formatBDT(l.price * l.qty)}</div>
                <button onClick={() => cart.remove(l.productId, l.weight)} className="p-1.5 text-muted-foreground hover:text-destructive shrink-0"><X className="h-4 w-4" /></button>
              </div>
            ))}
          </div>
          <aside className="border rounded-xl p-6 h-fit bg-muted/30">
            <h3 className="font-semibold text-lg mb-4">Order Summary</h3>
            <dl className="space-y-2 text-sm">
              <Row k="Subtotal" v={formatBDT(totals.subtotal)} />
              <Row k="Shipping" v={totals.shipping === 0 ? "FREE" : formatBDT(totals.shipping)} />
            </dl>
            <div className="border-t my-4" />
            <div className="flex justify-between text-lg font-bold">
              <span>Total</span>
              <span className="text-[var(--color-brand)]">{formatBDT(totals.total)}</span>
            </div>
            <Link to="/checkout" className="mt-6 block text-center bg-primary text-primary-foreground py-3 rounded-md font-semibold hover:bg-primary/90">Proceed to Checkout</Link>
            <Link to="/shop" className="mt-2 block text-center text-sm text-primary hover:underline">Continue shopping</Link>
          </aside>
        </div>
      </div>
    </SiteLayout>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return <div className="flex justify-between"><dt className="text-muted-foreground">{k}</dt><dd className="font-medium">{v}</dd></div>;
}
