import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site/SiteLayout";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { me } from "@/lib/auth.functions";
import { getProfile, updateMyProfile } from "@/lib/account.functions";
import { getDeliveryPublic } from "@/lib/site.functions";
import { isAddressCovered, coveredAreaNames } from "@/lib/delivery";
import type { DeliveryConfig } from "@/lib/config-types";
import { withBase } from "@/lib/base-path";
import { MapPin, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/complete-profile")({
  validateSearch: (s: Record<string, unknown>) => ({ next: typeof s.next === "string" ? s.next : "/account" }),
  head: () => ({ meta: [{ title: "Complete your profile — Banglarfish" }, { name: "robots", content: "noindex" }] }),
  component: CompleteProfile,
});

function safePath(next: string): string {
  if (!next.startsWith("/") || next.startsWith("//") || next.includes("\\")) return "/account";
  return next;
}

type Form = { full_name: string; phone: string; address_line1: string; address_line2: string; city: string; district: string; postal_code: string };
const empty: Form = { full_name: "", phone: "", address_line1: "", address_line2: "", city: "Dhaka", district: "", postal_code: "" };

function CompleteProfile() {
  const { next } = Route.useSearch();
  const dest = safePath(next);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState<Form>(empty);
  const [delivery, setDelivery] = useState<DeliveryConfig | null>(null);

  const fetchMe = useServerFn(me);
  const fetchProfile = useServerFn(getProfile);
  const fetchDelivery = useServerFn(getDeliveryPublic);
  const save = useServerFn(updateMyProfile);

  useEffect(() => {
    (async () => {
      const user = await fetchMe();
      if (!user) {
        window.location.href = withBase("/auth?next=" + encodeURIComponent("/complete-profile"));
        return;
      }
      const [p, d] = await Promise.all([fetchProfile().catch(() => null), fetchDelivery().catch(() => null)]);
      setDelivery(d);
      if (p && p.phone && p.address_line1) {
        // Already complete — no need to gate.
        window.location.href = withBase(dest);
        return;
      }
      setForm({
        full_name: p?.full_name ?? user.full_name ?? "",
        phone: p?.phone ?? user.phone ?? "",
        address_line1: p?.address_line1 ?? "",
        address_line2: p?.address_line2 ?? "",
        city: p?.city ?? "Dhaka",
        district: p?.district ?? "",
        postal_code: p?.postal_code ?? "",
      });
      setReady(true);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const set = (patch: Partial<Form>) => setForm((f) => ({ ...f, ...patch }));

  const covered = !delivery || isAddressCovered({ city: form.city, district: form.district, address_line1: form.address_line1, postal_code: form.postal_code }, delivery);
  const showCoverageWarning = !!delivery?.enabled && (form.city.trim() || form.address_line1.trim()).length > 0 && !covered;

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (delivery && !isAddressCovered({ city: form.city, district: form.district, address_line1: form.address_line1, postal_code: form.postal_code }, delivery)) {
      toast.error(delivery.message || "Sorry, we don't deliver to that area yet.");
      return;
    }
    setBusy(true);
    try {
      await save({ data: form });
      toast.success("All set — thanks!");
      window.location.href = withBase(dest);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save your details");
      setBusy(false);
    }
  }

  if (!ready) {
    return (
      <SiteLayout>
        <div className="container-x py-24 text-center text-muted-foreground flex items-center justify-center gap-2">
          <Loader2 className="h-5 w-5 animate-spin" /> Loading…
        </div>
      </SiteLayout>
    );
  }

  const areas = delivery ? coveredAreaNames(delivery) : [];

  return (
    <SiteLayout>
      <div className="container-x py-12 max-w-lg mx-auto">
        <div className="border rounded-2xl p-6 bg-card">
          <h1 className="text-2xl font-bold text-center">Almost there!</h1>
          <p className="text-sm text-muted-foreground text-center mt-1 mb-5">Add your phone &amp; delivery address so we can bring the fish to your door. This is required before you order.</p>

          {delivery?.enabled && areas.length > 0 && (
            <div className="mb-4 flex items-start gap-2 rounded-lg bg-primary/5 border border-primary/20 px-3 py-2 text-xs text-muted-foreground">
              <MapPin className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <span>We currently deliver to: <strong className="text-foreground">{areas.join(", ")}</strong>.</span>
            </div>
          )}

          <form onSubmit={submit} className="space-y-3">
            <Input placeholder="Full name *" required value={form.full_name} onChange={(e) => set({ full_name: e.target.value })} />
            <Input type="tel" placeholder="Phone * (e.g. 017XXXXXXXX)" required value={form.phone} onChange={(e) => set({ phone: e.target.value })} />
            <Input placeholder="Street address *" required value={form.address_line1} onChange={(e) => set({ address_line1: e.target.value })} />
            <Input placeholder="Apartment, suite, etc. (optional)" value={form.address_line2} onChange={(e) => set({ address_line2: e.target.value })} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input placeholder="City *" required value={form.city} onChange={(e) => set({ city: e.target.value })} />
              <Input placeholder="Postal code" value={form.postal_code} onChange={(e) => set({ postal_code: e.target.value })} />
            </div>
            <Input placeholder="District / area" value={form.district} onChange={(e) => set({ district: e.target.value })} />

            {showCoverageWarning && (
              <p className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">{delivery?.message}</p>
            )}

            <button disabled={busy || showCoverageWarning} className="w-full bg-primary text-primary-foreground py-2.5 rounded-md font-semibold hover:bg-primary/90 disabled:opacity-60">
              {busy ? "Saving…" : "Save & continue"}
            </button>
          </form>
        </div>
      </div>
    </SiteLayout>
  );
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className="w-full border rounded-md px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />;
}
