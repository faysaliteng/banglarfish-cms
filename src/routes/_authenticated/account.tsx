import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site/SiteLayout";
import { ProductCard } from "@/components/site/ProductCard";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getProfile, updateMyProfile, changeEmail, changePassword, listWishlist, toggleWishlist, listMySessions, revokeSession, revokeOtherSessions, type Profile, type SessionRow } from "@/lib/account.functions";
import { requestPhoneVerify, confirmPhoneVerify } from "@/lib/auth.functions";
import { listMyOrders } from "@/lib/orders.functions";
import { submitReturn } from "@/lib/returns.functions";
import { exportMyData, deleteMyAccount } from "@/lib/privacy.functions";
import { get2FAStatus, begin2FASetup, confirm2FASetup, disable2FA, type TwoFactorSetup } from "@/lib/twofactor.functions";
import { useQueryClient } from "@tanstack/react-query";
import { useSession, useSignOut } from "@/lib/auth";
import type { Product } from "@/lib/types";
import { LayoutDashboard, ShoppingBag, Heart, User as UserIcon, ShieldCheck, LogOut, ShieldAlert, Package, ArrowRight, BadgeCheck, Download, Trash2 } from "lucide-react";
import { toast } from "sonner";

const fmt = (n: number) => `৳${n.toLocaleString("en-IN")}`;

export const Route = createFileRoute("/_authenticated/account")({
  head: () => ({ meta: [{ title: "My Account — Banglarfish" }, { name: "robots", content: "noindex" }] }),
  component: AccountPage,
});

type OrderRow = {
  id: string;
  order_number: string;
  status: string;
  payment_status: string;
  total: number;
  items: Array<{ name: string; qty: number; price: number; image: string; weight: string }>;
  created_at: string;
};

type Tab = "overview" | "orders" | "wishlist" | "profile" | "security";
const NAV: { id: Tab; label: string; icon: typeof LayoutDashboard }[] = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "orders", label: "Orders", icon: ShoppingBag },
  { id: "wishlist", label: "Wishlist", icon: Heart },
  { id: "profile", label: "Profile", icon: UserIcon },
  { id: "security", label: "Security", icon: ShieldCheck },
];

function AccountPage() {
  const nav = useNavigate();
  const { user } = useSession();
  const signOut = useSignOut();
  const isStaff = !!user && ["staff", "manager", "admin"].includes(user.role);

  const [tab, setTab] = useState<Tab>("overview");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [wishlist, setWishlist] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useServerFn(getProfile);
  const saveProfile = useServerFn(updateMyProfile);
  const fetchOrders = useServerFn(listMyOrders);
  const fetchWishlist = useServerFn(listWishlist);
  const doToggleWishlist = useServerFn(toggleWishlist);
  const doChangeEmail = useServerFn(changeEmail);
  const doChangePassword = useServerFn(changePassword);

  useEffect(() => {
    Promise.all([fetchProfile(), fetchOrders(), fetchWishlist()])
      .then(([p, o, w]) => {
        setProfile(p);
        setOrders(o as OrderRow[]);
        setWishlist(w);
      })
      .catch((e) => toast.error(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [fetchProfile, fetchOrders, fetchWishlist]);

  const spent = useMemo(() => orders.reduce((s, o) => s + Number(o.total), 0), [orders]);

  async function onSaveProfile(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    try {
      await saveProfile({
        data: {
          full_name: String(fd.get("full_name") ?? ""),
          phone: String(fd.get("phone") ?? ""),
          address_line1: String(fd.get("address_line1") ?? ""),
          address_line2: String(fd.get("address_line2") ?? "") || null,
          city: String(fd.get("city") ?? ""),
          district: String(fd.get("district") ?? "") || null,
          postal_code: String(fd.get("postal_code") ?? "") || null,
        },
      });
      toast.success("Profile updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update");
    }
  }

  async function onChangeEmail(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    try {
      await doChangeEmail({ data: { email: String(fd.get("email") ?? "").trim() } });
      toast.success("Email updated. Use it next time you sign in.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update email");
    }
  }

  async function onChangePassword(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    try {
      await doChangePassword({ data: { current: String(fd.get("current") ?? ""), password: String(fd.get("password") ?? "") } });
      form.reset();
      toast.success("Password updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update password");
    }
  }

  async function onRemoveWishlist(productId: string) {
    try {
      await doToggleWishlist({ data: { productId } });
      setWishlist((prev) => prev.filter((p) => p.id !== productId));
    } catch {
      toast.error("Failed to update wishlist");
    }
  }

  async function onSignOut() {
    await signOut();
    nav({ to: "/" });
  }

  const initial = (user?.full_name || user?.email || "?").slice(0, 1).toUpperCase();

  return (
    <SiteLayout>
      <div className="container-x py-8">
        <div className="grid lg:grid-cols-[260px_1fr] gap-6">
          {/* Left menu */}
          <aside className="lg:sticky lg:top-24 h-fit">
            <div className="border rounded-2xl bg-card overflow-hidden">
              <div className="p-5 bg-gradient-to-br from-primary/10 to-[var(--color-brand)]/10 border-b">
                <div className="flex items-center gap-3">
                  <div className="h-11 w-11 rounded-full bg-primary text-primary-foreground grid place-items-center font-bold">{initial}</div>
                  <div className="min-w-0">
                    <p className="font-semibold truncate">{user?.full_name || "My Account"}</p>
                    <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                  </div>
                </div>
                {user && user.role !== "customer" && (
                  <span className="mt-3 inline-block text-[11px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-primary text-primary-foreground capitalize">{user.role}</span>
                )}
              </div>
              <nav className="p-2 flex lg:flex-col gap-1 overflow-x-auto text-sm">
                {NAV.map((n) => {
                  const Icon = n.icon;
                  const active = tab === n.id;
                  return (
                    <button
                      key={n.id}
                      onClick={() => setTab(n.id)}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg whitespace-nowrap transition ${active ? "bg-primary text-primary-foreground font-semibold" : "hover:bg-muted text-foreground"}`}
                    >
                      <Icon className="h-4 w-4 shrink-0" /> {n.label}
                    </button>
                  );
                })}
              </nav>
              {isStaff && (
                <div className="px-2 pb-2">
                  <Link to="/admin" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold bg-[oklch(0.16_0.02_250)] text-white hover:opacity-90">
                    <ShieldAlert className="h-4 w-4" /> Admin Panel <ArrowRight className="h-4 w-4 ml-auto" />
                  </Link>
                </div>
              )}
              <div className="border-t p-2">
                <button onClick={onSignOut} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm hover:bg-muted text-destructive">
                  <LogOut className="h-4 w-4" /> Sign out
                </button>
              </div>
            </div>
          </aside>

          {/* Content */}
          <div className="min-w-0">
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : tab === "overview" ? (
              <Overview user={user} orders={orders} wishlistCount={wishlist.length} spent={spent} onGoTo={setTab} />
            ) : tab === "orders" ? (
              <OrdersTab orders={orders} />
            ) : tab === "wishlist" ? (
              <WishlistTab items={wishlist} onRemove={onRemoveWishlist} />
            ) : tab === "profile" ? (
              <ProfileTab profile={profile} onSubmit={onSaveProfile} verified={!!user?.phone_verified} />
            ) : (
              <SecurityTab email={user?.email ?? ""} onEmail={onChangeEmail} onPassword={onChangePassword} />
            )}
          </div>
        </div>
      </div>
    </SiteLayout>
  );
}

function SectionTitle({ title, desc }: { title: string; desc?: string }) {
  return (
    <div className="mb-5">
      <h1 className="text-2xl font-bold">{title}</h1>
      {desc && <p className="text-sm text-muted-foreground mt-1">{desc}</p>}
    </div>
  );
}

function Overview({ user, orders, wishlistCount, spent, onGoTo }: { user: { full_name: string } | null; orders: OrderRow[]; wishlistCount: number; spent: number; onGoTo: (t: Tab) => void }) {
  const stats = [
    { label: "Total Orders", value: String(orders.length), icon: ShoppingBag },
    { label: "Total Spent", value: fmt(spent), icon: Package },
    { label: "Wishlist Items", value: String(wishlistCount), icon: Heart },
  ];
  return (
    <div>
      <SectionTitle title={`Welcome back${user?.full_name ? ", " + user.full_name.split(" ")[0] : ""}`} desc="Here's a snapshot of your account." />
      <div className="grid sm:grid-cols-3 gap-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="border rounded-2xl p-5 bg-card">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">{s.label}</p>
                <div className="p-2 rounded-lg bg-primary/10 text-primary"><Icon className="h-4 w-4" /></div>
              </div>
              <p className="text-2xl font-bold mt-2">{s.value}</p>
            </div>
          );
        })}
      </div>

      <div className="mt-6 border rounded-2xl bg-card">
        <div className="flex items-center justify-between p-5 border-b">
          <h3 className="font-semibold">Recent orders</h3>
          <button onClick={() => onGoTo("orders")} className="text-sm text-primary hover:underline">View all →</button>
        </div>
        {orders.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-muted-foreground mb-4">You haven't placed any orders yet.</p>
            <Link to="/shop" className="inline-block bg-primary text-primary-foreground rounded-md px-5 py-2.5 text-sm font-semibold">Start shopping</Link>
          </div>
        ) : (
          <ul className="divide-y">
            {orders.slice(0, 4).map((o) => (
              <li key={o.id} className="flex items-center justify-between gap-3 p-4 text-sm">
                <div>
                  <p className="font-semibold">#{o.order_number}</p>
                  <p className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleDateString()}</p>
                </div>
                <span className="px-2 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium capitalize">{o.status}</span>
                <span className="font-bold">{fmt(Number(o.total))}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function OrdersTab({ orders }: { orders: OrderRow[] }) {
  if (orders.length === 0) {
    return (
      <div>
        <SectionTitle title="Orders" />
        <div className="border rounded-2xl p-12 text-center bg-card">
          <p className="text-muted-foreground mb-4">You haven't placed any orders yet.</p>
          <Link to="/shop" className="inline-block bg-primary text-primary-foreground rounded-md px-5 py-2.5 text-sm font-semibold">Start shopping</Link>
        </div>
      </div>
    );
  }
  return (
    <div>
      <SectionTitle title="Orders" desc={`${orders.length} order(s)`} />
      <div className="space-y-3">
        {orders.map((o) => (
          <div key={o.id} className="border rounded-xl p-4 bg-card">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <div>
                <p className="font-semibold">#{o.order_number}</p>
                <p className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleString()}</p>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="px-2 py-1 rounded-full bg-primary/10 text-primary font-medium capitalize">{o.status}</span>
                <span className="px-2 py-1 rounded-full bg-muted capitalize">{o.payment_status}</span>
                <span className="font-bold text-sm">{fmt(Number(o.total))}</span>
                <a href={`/invoice/${o.order_number}`} target="_blank" rel="noreferrer" className="px-2 py-1 rounded-md border font-semibold hover:bg-muted">Invoice</a>
              </div>
            </div>
            <div className="space-y-2">
              {o.items.map((it, i) => (
                <div key={i} className="flex items-center gap-3 text-sm">
                  <img src={it.image} alt={it.name} className="h-10 w-10 rounded object-cover" />
                  <div className="flex-1">
                    <p className="font-medium">{it.name}</p>
                    <p className="text-xs text-muted-foreground">{it.weight} · Qty {it.qty}</p>
                  </div>
                  <span>{fmt(it.price * it.qty)}</span>
                </div>
              ))}
            </div>
            <ReturnRequest orderId={o.id} />
          </div>
        ))}
      </div>
    </div>
  );
}

function ReturnRequest({ orderId }: { orderId: string }) {
  const submit = useServerFn(submitReturn);
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  if (done) return <p className="mt-3 pt-3 border-t text-xs text-emerald-700">✓ Return request submitted. We'll review it shortly.</p>;

  return (
    <div className="mt-3 pt-3 border-t">
      {!open ? (
        <button onClick={() => setOpen(true)} className="text-xs font-semibold text-primary hover:underline">Request a return</button>
      ) : (
        <div className="space-y-2">
          <textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Tell us why you'd like to return this order…" rows={2} className="w-full border rounded-md px-3 py-2 text-sm" />
          <div className="flex gap-2">
            <button
              disabled={busy || reason.trim().length < 5}
              onClick={async () => { setBusy(true); try { await submit({ data: { orderId, reason } }); setDone(true); } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); } finally { setBusy(false); } }}
              className="text-xs font-semibold bg-primary text-primary-foreground px-3 py-1.5 rounded-md disabled:opacity-60"
            >{busy ? "Submitting…" : "Submit request"}</button>
            <button onClick={() => setOpen(false)} className="text-xs px-3 py-1.5 rounded-md border">Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}

function WishlistTab({ items, onRemove }: { items: Product[]; onRemove: (id: string) => void }) {
  return (
    <div>
      <SectionTitle title="Wishlist" desc={`${items.length} saved item(s)`} />
      {items.length === 0 ? (
        <div className="border rounded-2xl p-12 text-center bg-card">
          <p className="text-muted-foreground mb-4">Your wishlist is empty.</p>
          <Link to="/shop" className="inline-block bg-primary text-primary-foreground rounded-md px-5 py-2.5 text-sm font-semibold">Browse products</Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {items.map((p) => (
            <div key={p.id} className="relative">
              <ProductCard product={p} />
              <button onClick={() => onRemove(p.id)} className="absolute top-2 right-2 z-10 bg-background/90 border rounded-full px-2 py-1 text-xs hover:bg-destructive hover:text-white">Remove</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ProfileTab({ profile, onSubmit, verified }: { profile: Profile | null; onSubmit: (e: React.FormEvent<HTMLFormElement>) => void; verified: boolean }) {
  return (
    <div>
      <SectionTitle title="Profile" desc="Your delivery details." />
      <div className="max-w-3xl mb-4"><PhoneVerify phone={profile?.phone ?? ""} verified={verified} /></div>
      <form onSubmit={onSubmit} className="grid md:grid-cols-2 gap-4 max-w-3xl border rounded-2xl p-6 bg-card">
        <Field label="Full name *" name="full_name" defaultValue={profile?.full_name ?? ""} required />
        <Field label="Phone *" name="phone" defaultValue={profile?.phone ?? ""} required />
        <div className="md:col-span-2"><Field label="Street address *" name="address_line1" defaultValue={profile?.address_line1 ?? ""} required /></div>
        <div className="md:col-span-2"><Field label="Address line 2" name="address_line2" defaultValue={profile?.address_line2 ?? ""} /></div>
        <Field label="City *" name="city" defaultValue={profile?.city ?? ""} required />
        <Field label="District" name="district" defaultValue={profile?.district ?? ""} />
        <Field label="Postal code" name="postal_code" defaultValue={profile?.postal_code ?? ""} />
        <div className="md:col-span-2">
          <button className="bg-primary text-primary-foreground px-5 py-2.5 rounded-md text-sm font-semibold hover:bg-primary/90">Save changes</button>
        </div>
      </form>
    </div>
  );
}

function PhoneVerify({ phone, verified }: { phone: string; verified: boolean }) {
  const qc = useQueryClient();
  const req = useServerFn(requestPhoneVerify);
  const confirmFn = useServerFn(confirmPhoneVerify);
  const [done, setDone] = useState(verified);
  const [stage, setStage] = useState<"idle" | "code">("idle");
  const [busy, setBusy] = useState(false);
  const [code, setCode] = useState("");

  if (done) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-emerald-300/60 bg-emerald-50 text-emerald-700 px-4 py-2.5 text-sm">
        <BadgeCheck className="h-4 w-4" /> Phone verified{phone ? <span className="text-emerald-600/80"> · {phone}</span> : null}
      </div>
    );
  }

  async function send() {
    if (!phone) return toast.error("Add a phone number below and save first.");
    setBusy(true);
    try {
      const res = await req();
      setStage("code");
      toast.success("We sent a 6-digit code by SMS.");
      if (res.devCode) toast.message(`Dev code: ${res.devCode}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not send code");
    } finally {
      setBusy(false);
    }
  }
  async function check(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const user = await confirmFn({ data: { code: code.trim() } });
      qc.setQueryData(["me"], user);
      setDone(true);
      toast.success("Phone verified!");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Verification failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-xl border border-amber-300/60 bg-amber-50 text-amber-800 px-4 py-3 text-sm">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <span><strong>Phone not verified.</strong> Verify by SMS to secure your account{phone ? ` (${phone})` : ""}.</span>
        {stage === "idle" && <button onClick={send} disabled={busy} className="bg-primary text-primary-foreground px-3 py-1.5 rounded-md text-xs font-semibold disabled:opacity-60">{busy ? "Sending…" : "Verify by SMS"}</button>}
      </div>
      {stage === "code" && (
        <form onSubmit={check} className="mt-3 flex items-center gap-2">
          <input value={code} onChange={(e) => setCode(e.target.value)} inputMode="numeric" maxLength={6} placeholder="6-digit code" className="border rounded-md px-3 py-2 text-sm w-40 text-center tracking-widest bg-white" />
          <button disabled={busy} className="bg-primary text-primary-foreground px-3 py-2 rounded-md text-xs font-semibold disabled:opacity-60">{busy ? "…" : "Confirm"}</button>
        </form>
      )}
    </div>
  );
}

function SecurityTab({ email, onEmail, onPassword }: { email: string; onEmail: (e: React.FormEvent<HTMLFormElement>) => void; onPassword: (e: React.FormEvent<HTMLFormElement>) => void }) {
  return (
    <div>
      <SectionTitle title="Security" desc="Manage your login credentials." />
      <div className="grid md:grid-cols-2 gap-6 max-w-4xl">
        <form onSubmit={onEmail} className="border rounded-2xl p-6 bg-card space-y-3">
          <h3 className="font-semibold">Change email</h3>
          <p className="text-xs text-muted-foreground">Current: {email}</p>
          <input name="email" type="email" placeholder="New email" required className="w-full border rounded-md px-3 py-2.5 text-sm" />
          <button className="bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-semibold">Update email</button>
        </form>
        <form onSubmit={onPassword} className="border rounded-2xl p-6 bg-card space-y-3">
          <h3 className="font-semibold">Change password</h3>
          <input name="current" type="password" placeholder="Current password" required className="w-full border rounded-md px-3 py-2.5 text-sm" />
          <input name="password" type="password" placeholder="New password (min 8 chars)" minLength={8} required className="w-full border rounded-md px-3 py-2.5 text-sm" />
          <button className="bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-semibold">Update password</button>
        </form>
      </div>
      <TwoFactorSection />
      <SessionManager />
      <PrivacySection />
    </div>
  );
}

function TwoFactorSection() {
  const statusFn = useServerFn(get2FAStatus);
  const beginFn = useServerFn(begin2FASetup);
  const confirmFn = useServerFn(confirm2FASetup);
  const disableFn = useServerFn(disable2FA);
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [setup, setSetup] = useState<TwoFactorSetup | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [recovery, setRecovery] = useState<string[] | null>(null);
  const [disabling, setDisabling] = useState(false);

  useEffect(() => { statusFn().then((s) => setEnabled(s.enabled)).catch(() => setEnabled(false)); }, [statusFn]);

  async function onBegin() {
    setBusy(true);
    try { setSetup(await beginFn()); } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); } finally { setBusy(false); }
  }
  async function onConfirm() {
    setBusy(true);
    try {
      const res = await confirmFn({ data: { code: code.trim() } });
      setRecovery(res.recoveryCodes);
      setEnabled(true);
      setSetup(null);
      setCode("");
      toast.success("Two-factor authentication enabled.");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Invalid code"); } finally { setBusy(false); }
  }
  async function onDisable() {
    setBusy(true);
    try {
      await disableFn({ data: { code: code.trim() } });
      setEnabled(false);
      setDisabling(false);
      setCode("");
      toast.success("Two-factor authentication disabled.");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Invalid code"); } finally { setBusy(false); }
  }

  return (
    <div className="mt-8 border rounded-2xl p-6 bg-card max-w-4xl">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold flex items-center gap-2"><ShieldCheck className="h-4 w-4" /> Two-factor authentication</h3>
          <p className="text-sm text-muted-foreground mt-1">Protect your account with a code from an authenticator app (Google Authenticator, Authy, 1Password…).</p>
        </div>
        {enabled !== null && (
          <span className={`text-xs font-semibold px-3 py-1 rounded-full ${enabled ? "bg-emerald-100 text-emerald-700" : "bg-muted text-muted-foreground"}`}>{enabled ? "Enabled" : "Off"}</span>
        )}
      </div>

      {recovery && (
        <div className="mt-4 rounded-xl border border-amber-300/60 bg-amber-50 p-4">
          <p className="text-sm font-semibold text-amber-800">Save your recovery codes</p>
          <p className="text-xs text-amber-700 mb-3">Each can be used once if you lose your device. Store them somewhere safe — they won't be shown again.</p>
          <div className="grid grid-cols-2 gap-2 font-mono text-sm">
            {recovery.map((c) => <span key={c} className="bg-white/70 rounded px-2 py-1 text-center">{c}</span>)}
          </div>
          <button onClick={() => setRecovery(null)} className="mt-3 text-xs font-semibold bg-amber-600 text-white px-3 py-1.5 rounded-md">I've saved them</button>
        </div>
      )}

      {enabled === false && !setup && !recovery && (
        <button onClick={onBegin} disabled={busy} className="mt-4 text-sm font-semibold bg-primary text-primary-foreground px-4 py-2 rounded-md disabled:opacity-60">{busy ? "Preparing…" : "Enable 2FA"}</button>
      )}

      {setup && (
        <div className="mt-4 space-y-3">
          <p className="text-sm">1. Add this secret to your authenticator app (manual entry):</p>
          <code className="block font-mono text-sm bg-muted rounded-md px-3 py-2 select-all break-all">{setup.secret}</code>
          <p className="text-xs text-muted-foreground break-all">Or use this setup URL: <span className="select-all">{setup.otpauthUrl}</span></p>
          <p className="text-sm">2. Enter the 6-digit code it shows:</p>
          <div className="flex gap-2">
            <input value={code} onChange={(e) => setCode(e.target.value)} inputMode="numeric" placeholder="123456" className="border rounded-md px-3 py-2 text-sm w-40 text-center tracking-widest" />
            <button onClick={onConfirm} disabled={busy || code.trim().length < 6} className="text-sm font-semibold bg-primary text-primary-foreground px-4 py-2 rounded-md disabled:opacity-60">{busy ? "Verifying…" : "Confirm & enable"}</button>
            <button onClick={() => { setSetup(null); setCode(""); }} className="text-sm px-4 py-2 rounded-md border">Cancel</button>
          </div>
        </div>
      )}

      {enabled === true && !disabling && !recovery && (
        <button onClick={() => setDisabling(true)} className="mt-4 text-sm font-semibold border border-destructive/40 text-destructive px-4 py-2 rounded-md hover:bg-destructive/10">Disable 2FA</button>
      )}
      {enabled === true && disabling && (
        <div className="mt-4 space-y-2">
          <p className="text-sm text-muted-foreground">Enter a current code (or recovery code) to disable 2FA.</p>
          <div className="flex gap-2">
            <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Code" className="border rounded-md px-3 py-2 text-sm w-40 text-center tracking-widest" />
            <button onClick={onDisable} disabled={busy || code.trim().length < 6} className="text-sm font-semibold bg-destructive text-white px-4 py-2 rounded-md disabled:opacity-50">{busy ? "…" : "Disable"}</button>
            <button onClick={() => { setDisabling(false); setCode(""); }} className="text-sm px-4 py-2 rounded-md border">Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}

function PrivacySection() {
  const nav = useNavigate();
  const signOut = useSignOut();
  const doExport = useServerFn(exportMyData);
  const doDelete = useServerFn(deleteMyAccount);
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [confirmText, setConfirmText] = useState("");

  async function onExport() {
    setBusy(true);
    try {
      const json = await doExport();
      const blob = new Blob([json], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `my-data-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(a.href);
      toast.success("Your data export was downloaded.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Export failed");
    } finally {
      setBusy(false);
    }
  }

  async function onDelete() {
    setBusy(true);
    try {
      await doDelete({ data: { confirm: "DELETE" } });
      toast.success("Your account has been deleted.");
      try { await signOut(); } catch { /* already signed out server-side */ }
      nav({ to: "/" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Deletion failed");
      setBusy(false);
    }
  }

  return (
    <div className="mt-8 border rounded-2xl p-6 bg-card max-w-4xl">
      <h3 className="font-semibold">Privacy & your data</h3>
      <p className="text-sm text-muted-foreground mt-1">Download everything we hold about you, or permanently delete your account.</p>
      <div className="mt-4 flex flex-wrap gap-3">
        <button onClick={onExport} disabled={busy} className="inline-flex items-center gap-2 text-sm font-semibold border rounded-md px-4 py-2 hover:bg-muted disabled:opacity-60">
          <Download className="h-4 w-4" /> Download my data
        </button>
        {!confirming ? (
          <button onClick={() => setConfirming(true)} className="inline-flex items-center gap-2 text-sm font-semibold border border-destructive/40 text-destructive rounded-md px-4 py-2 hover:bg-destructive/10">
            <Trash2 className="h-4 w-4" /> Delete my account
          </button>
        ) : (
          <div className="w-full mt-2 rounded-xl border border-destructive/40 bg-destructive/5 p-4 space-y-3">
            <p className="text-sm text-destructive font-medium">This permanently deletes your account and removes your personal data. Your past orders are anonymized and kept for accounting. This cannot be undone.</p>
            <p className="text-xs text-muted-foreground">Type <strong>DELETE</strong> to confirm.</p>
            <input value={confirmText} onChange={(e) => setConfirmText(e.target.value)} className="border rounded-md px-3 py-2 text-sm w-48" placeholder="DELETE" />
            <div className="flex gap-2">
              <button onClick={onDelete} disabled={busy || confirmText !== "DELETE"} className="text-sm font-semibold bg-destructive text-white px-4 py-2 rounded-md disabled:opacity-50">{busy ? "Deleting…" : "Permanently delete"}</button>
              <button onClick={() => { setConfirming(false); setConfirmText(""); }} className="text-sm px-4 py-2 rounded-md border">Cancel</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SessionManager() {
  const listFn = useServerFn(listMySessions);
  const revokeFn = useServerFn(revokeSession);
  const revokeAllFn = useServerFn(revokeOtherSessions);
  const [rows, setRows] = useState<SessionRow[]>([]);
  const load = () => listFn().then(setRows).catch(() => {});
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);
  function device(ua: string | null) {
    if (!ua) return "Unknown device";
    const s = ua.toLowerCase();
    const os = /iphone|ipad|ios/.test(s) ? "iOS" : /android/.test(s) ? "Android" : /windows/.test(s) ? "Windows" : /mac/.test(s) ? "macOS" : /linux/.test(s) ? "Linux" : "Device";
    const br = /edg/.test(s) ? "Edge" : /chrome/.test(s) ? "Chrome" : /firefox/.test(s) ? "Firefox" : /safari/.test(s) ? "Safari" : "Browser";
    return `${br} on ${os}`;
  }
  return (
    <div className="mt-8 border rounded-2xl p-6 bg-card max-w-4xl">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold">Active sessions</h3>
        {rows.length > 1 && (
          <button onClick={async () => { await revokeAllFn(); load(); }} className="text-sm px-3 py-1.5 rounded-md border hover:bg-muted">Sign out other devices</button>
        )}
      </div>
      <div className="space-y-2">
        {rows.map((s) => (
          <div key={s.id} className="flex items-center gap-3 border rounded-lg p-3 text-sm">
            <div className="min-w-0 flex-1">
              <p className="font-medium">{device(s.userAgent)} {s.current && <span className="text-[10px] uppercase font-bold text-primary ml-1">this device</span>}</p>
              <p className="text-xs text-muted-foreground">{s.ip || "unknown IP"} · started {new Date(s.createdAt).toLocaleString()}</p>
            </div>
            {!s.current && <button onClick={async () => { await revokeFn({ data: { id: s.id } }); load(); }} className="text-xs px-2.5 py-1 rounded-md border text-destructive hover:bg-muted">Revoke</button>}
          </div>
        ))}
        {rows.length === 0 && <p className="text-sm text-muted-foreground">No active sessions.</p>}
      </div>
    </div>
  );
}

function Field({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block text-sm">
      <span className="block mb-1 text-muted-foreground text-xs font-medium">{label}</span>
      <input {...props} className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
    </label>
  );
}
