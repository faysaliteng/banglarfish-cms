import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site/SiteLayout";
import { CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/order-confirmed")({
  validateSearch: (s: Record<string, unknown>) => ({ id: String(s.id ?? "") }),
  head: () => ({ meta: [{ title: "Order Confirmed — Banglarfish" }, { name: "robots", content: "noindex" }] }),
  component: Confirmed,
});

function Confirmed() {
  const { id } = Route.useSearch();
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
