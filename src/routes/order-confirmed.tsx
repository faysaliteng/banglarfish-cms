import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site/SiteLayout";
import { CheckCircle2, AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/order-confirmed")({
  validateSearch: (s: Record<string, unknown>) => ({ id: String(s.id ?? ""), payment: s.payment ? String(s.payment) : "" }),
  head: () => ({ meta: [{ title: "Order Confirmed — Banglarfish" }, { name: "robots", content: "noindex" }] }),
  component: Confirmed,
});

function Confirmed() {
  const { id, payment } = Route.useSearch();
  const failed = payment === "error" || payment === "failed" || payment === "cancelled";
  if (failed) {
    return (
      <SiteLayout>
        <div className="container-x py-20 text-center max-w-lg">
          <AlertTriangle className="h-14 w-14 mx-auto text-amber-500 mb-4" />
          <h1 className="text-2xl font-bold mb-2">Payment didn't go through</h1>
          <p className="text-muted-foreground mb-6">
            Your order <strong>#{id}</strong> was created but the payment was {payment === "cancelled" ? "cancelled" : "not completed"}.
            Nothing has been charged. You can retry payment or choose cash on delivery.
          </p>
          <div className="flex gap-3 justify-center flex-wrap">
            <Link to="/checkout" className="bg-primary text-primary-foreground px-5 py-2.5 rounded-md font-semibold">Try again</Link>
            <Link to="/account" className="border px-5 py-2.5 rounded-md font-semibold">View my orders</Link>
          </div>
        </div>
      </SiteLayout>
    );
  }

  return (
    <SiteLayout>
      <div className="container-x py-20 text-center max-w-lg mx-auto">
        <CheckCircle2 className="h-16 w-16 mx-auto text-primary" />
        <h1 className="text-3xl font-bold mt-4">Thank you for your order!</h1>
        <p className="text-muted-foreground mt-2">
          Your order <span className="font-semibold text-foreground">#{id}</span> has been placed successfully.
          You'll receive an SMS when it's out for delivery. Track status any time from your account.
        </p>
        <div className="flex flex-wrap gap-3 justify-center mt-6">
          <Link to="/account" className="bg-primary text-primary-foreground px-6 py-3 rounded-full font-semibold">View my orders</Link>
          <Link to="/shop" className="border px-6 py-3 rounded-full font-semibold">Continue shopping</Link>
        </div>
      </div>
    </SiteLayout>
  );
}
