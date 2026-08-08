import { createFileRoute, Link, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { LayoutDashboard, Package, ShoppingCart, Users, Tag, FileText, Settings, Image as ImageIcon, MessageSquare, Ticket, Truck, BarChart3, Home, LogOut, Menu as MenuIcon, X, Newspaper, GalleryHorizontal, ListTree, Palette, Globe, CreditCard, Smartphone, Search, Sparkles, KeyRound, MapPin, ChefHat, Code, BookOpen, Blocks, LayoutTemplate, Rocket, RotateCcw, ArrowRightLeft, Mail, Receipt, Gift, LineChart, Languages, Cog, Plug, Webhook, Boxes, BadgePercent, ShieldCheck, Activity, Inbox } from "lucide-react";
import { Logo } from "@/components/site/Logo";
import { useSession, useIsAdmin, useSignOut } from "@/lib/auth";
import { useEffect, useState } from "react";
import { CommandPalette, type Command } from "@/components/admin/CommandPalette";

export const Route = createFileRoute("/admin")({
  ssr: false,
  head: () => ({ meta: [{ title: "Admin — Banglarfish" }, { name: "robots", content: "noindex" }] }),
  component: AdminLayout,
});

const navGroups: { label: string; items: { to: string; label: string; icon: typeof LayoutDashboard; exact?: boolean }[] }[] = [
  {
    label: "Overview",
    items: [
      { to: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
      { to: "/admin/analytics", label: "Analytics", icon: BarChart3 },
      { to: "/admin/reports", label: "Reports", icon: LineChart },
      { to: "/admin/visitors", label: "Visitors & IPs", icon: Globe },
    ],
  },
  {
    label: "Catalog",
    items: [
      { to: "/admin/products", label: "Products", icon: Package },
      { to: "/admin/categories", label: "Categories", icon: Tag },
      { to: "/admin/media", label: "Media Library", icon: ImageIcon },
    ],
  },
  {
    label: "Sales",
    items: [
      { to: "/admin/orders", label: "Orders", icon: ShoppingCart },
      { to: "/admin/coupons", label: "Coupons", icon: Ticket },
      { to: "/admin/subscribers", label: "Newsletter Subscribers", icon: Mail },
      { to: "/admin/promotions", label: "Promotions", icon: BadgePercent },
      { to: "/admin/shipping", label: "Shipping", icon: Truck },
      { to: "/admin/tax", label: "Tax Engine", icon: Receipt },
      { to: "/admin/delivery", label: "Delivery Areas", icon: MapPin },
      { to: "/admin/returns", label: "Returns / RMA", icon: RotateCcw },
      { to: "/admin/giftcards", label: "Gift Cards", icon: Gift },
    ],
  },
  {
    label: "Content",
    items: [
      { to: "/admin/homepage", label: "Homepage", icon: Home },
      { to: "/admin/homepage-templates", label: "Homepage Templates", icon: LayoutTemplate },
      { to: "/admin/landing", label: "Landing Pages (Builder)", icon: LayoutTemplate },
      { to: "/admin/pages", label: "Pages (CMS)", icon: FileText },
      { to: "/admin/content-types", label: "Content Types", icon: Boxes },
      { to: "/admin/blog", label: "Blog", icon: Newspaper },
      { to: "/admin/recipes", label: "Recipes", icon: ChefHat },
      { to: "/admin/banners", label: "Banners", icon: GalleryHorizontal },
      { to: "/admin/menus", label: "Menus", icon: ListTree },
      { to: "/admin/reviews", label: "Reviews", icon: MessageSquare },
      { to: "/admin/comments", label: "Comments", icon: MessageSquare },
      { to: "/admin/contact", label: "Contact Inbox", icon: Mail },
    ],
  },
  {
    label: "Appearance",
    items: [
      { to: "/admin/theme", label: "Theme & Layout", icon: Palette },
      { to: "/admin/branding", label: "Branding", icon: Sparkles },
      { to: "/admin/code", label: "Custom Code", icon: Code },
    ],
  },
  {
    label: "Configuration",
    items: [
      { to: "/admin/payments", label: "Payment Gateways", icon: CreditCard },
      { to: "/admin/sms", label: "SMS Gateway", icon: Smartphone },
      { to: "/admin/email", label: "Email Settings", icon: Mail },
      { to: "/admin/mail", label: "Email Inbox / Send", icon: Inbox },
      { to: "/admin/whatsapp", label: "WhatsApp", icon: MessageSquare },
      { to: "/admin/social", label: "Social Login", icon: KeyRound },
      { to: "/admin/seo", label: "SEO Engine", icon: Search },
      { to: "/admin/ai", label: "AI Assistant", icon: Sparkles },
      { to: "/admin/languages", label: "Languages", icon: Languages },
      { to: "/admin/redirects", label: "Redirects", icon: ArrowRightLeft },
      { to: "/admin/modules", label: "Modules", icon: Blocks },
      { to: "/admin/plugins", label: "Plugins", icon: Plug },
      { to: "/admin/api", label: "API & Webhooks", icon: Webhook },
      { to: "/admin/customers", label: "Users & Roles", icon: Users },
      { to: "/admin/customer-groups", label: "Customer Groups", icon: Users },
      { to: "/admin/settings", label: "Settings", icon: Settings },
    ],
  },
  {
    label: "System",
    items: [
      { to: "/admin/setup", label: "Setup Wizard", icon: Rocket },
      { to: "/admin/starter", label: "Starter Templates", icon: LayoutTemplate },
      { to: "/admin/docs", label: "Help & Docs", icon: BookOpen },
      { to: "/admin/jobs", label: "Background Jobs", icon: Cog },
      { to: "/admin/privacy", label: "Privacy & GDPR", icon: ShieldCheck },
      { to: "/admin/health", label: "System Health", icon: Activity },
      { to: "/admin/reset", label: "Restore Defaults", icon: RotateCcw },
    ],
  },
];

function AdminLayout() {
  const loc = useLocation();
  const nav_ = useNavigate();
  const { user, loading } = useSession();
  const { isAdmin } = useIsAdmin(user);
  const isSupport = !!user && user.role === "support";
  // Support users see ONLY the email client.
  const groups = isSupport ? [{ label: "Email", items: [{ to: "/admin/mail", label: "Email Inbox / Send", icon: Inbox, exact: false }] }] : navGroups;
  const signOut = useSignOut();
  const [drawer, setDrawer] = useState(false);
  const [cmdOpen, setCmdOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) nav_({ to: "/auth", search: { next: loc.pathname } });
  }, [loading, user, loc.pathname, nav_]);

  // Confine support users to the email client — bounce any other admin path.
  useEffect(() => {
    if (!loading && isSupport && !loc.pathname.startsWith("/admin/mail")) nav_({ to: "/admin/mail" });
  }, [loading, isSupport, loc.pathname, nav_]);

  // Close the mobile drawer on navigation.
  useEffect(() => setDrawer(false), [loc.pathname]);

  // ⌘K / Ctrl+K toggles the command palette.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCmdOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const commands: Command[] = [
    ...groups.flatMap((g) => g.items.map((it) => ({ label: it.label, group: g.label, icon: it.icon, run: () => nav_({ to: it.to as "/admin" }) }))),
    { label: "View store", group: "Actions", icon: Home, run: () => nav_({ to: "/" }) },
    { label: "Sign out", group: "Actions", icon: LogOut, run: async () => { await signOut(); nav_({ to: "/" }); } },
  ];
  const currentItem = groups.flatMap((g) => g.items).find((it) => (it.exact ? loc.pathname === it.to : loc.pathname.startsWith(it.to)));

  if (loading) {
    return <div className="min-h-screen grid place-items-center text-sm text-muted-foreground">Loading admin…</div>;
  }
  if (!user) return null;
  if (!isAdmin && !isSupport) {
    return (
      <div className="min-h-screen grid place-items-center p-6">
        <div className="max-w-md text-center border rounded-2xl p-8 bg-card">
          <h1 className="text-2xl font-bold mb-2">Not authorized</h1>
          <p className="text-sm text-muted-foreground mb-4">
            Your account ({user.email}) does not have admin access. Ask an administrator to grant you a staff, manager, or admin role.
          </p>
          <Link to="/" className="text-primary hover:underline text-sm">← Back to store</Link>
        </div>
      </div>
    );
  }

  const sidebar = (
    <>
      <div className="p-5 border-b border-white/10 flex items-center justify-between">
        <Logo variant="dark" />
        <button className="lg:hidden text-white/70" onClick={() => setDrawer(false)} aria-label="Close menu"><X className="h-5 w-5" /></button>
      </div>
      <p className="px-5 pt-3 text-xs text-white/50 truncate">Signed in · {user.email}</p>
      <nav className="p-3 text-sm flex-1 overflow-y-auto">
        {groups.map((group) => (
          <div key={group.label} className="mb-2">
            <p className="px-3 pt-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-white/35">{group.label}</p>
            <div className="space-y-0.5">
              {group.items.map((n) => {
                const active = n.exact ? loc.pathname === n.to : loc.pathname.startsWith(n.to);
                const Icon = n.icon;
                return (
                  <Link key={n.to} to={n.to as "/admin"} className={`flex items-center gap-3 px-3 py-2 rounded-md transition ${active ? "bg-primary text-primary-foreground font-semibold" : "hover:bg-white/10"}`}>
                    <Icon className="h-4 w-4 shrink-0" /> {n.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
      <div className="p-3 border-t border-white/10 space-y-1 text-sm">
        <Link to="/" className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-white/10">
          <Home className="h-4 w-4" /> View store
        </Link>
        <button onClick={async () => { await signOut(); nav_({ to: "/" }); }} className="w-full text-left flex items-center gap-3 px-3 py-2 rounded-md hover:bg-white/10">
          <LogOut className="h-4 w-4" /> Sign out
        </button>
      </div>
    </>
  );

  return (
    <div className="bf-admin min-h-screen bg-muted/30 lg:grid lg:grid-cols-[240px_1fr]">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex min-h-screen bg-[oklch(0.16_0.02_250)] text-white/90 sticky top-0 h-screen overflow-y-auto flex-col">
        {sidebar}
      </aside>

      {/* Mobile top bar */}
      <div className="lg:hidden sticky top-0 z-30 flex items-center justify-between bg-[oklch(0.16_0.02_250)] text-white px-4 py-3">
        <button onClick={() => setDrawer(true)} aria-label="Open menu"><MenuIcon className="h-6 w-6" /></button>
        <Logo variant="dark" />
        <button onClick={() => setCmdOpen(true)} aria-label="Search"><Search className="h-6 w-6" /></button>
      </div>

      {/* Mobile drawer */}
      {drawer && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <div className="w-72 max-w-[80%] bg-[oklch(0.16_0.02_250)] text-white/90 flex flex-col overflow-y-auto">{sidebar}</div>
          <div className="flex-1 bg-black/50" onClick={() => setDrawer(false)} />
        </div>
      )}

      <main className="min-w-0">
        {/* Desktop top bar */}
        <div className="hidden lg:flex items-center justify-between gap-3 px-8 py-3.5 border-b bg-card/70 backdrop-blur sticky top-0 z-20">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Admin</span>
            <span className="text-muted-foreground/50">/</span>
            <span className="font-semibold">{currentItem?.label ?? "Dashboard"}</span>
          </div>
          <button onClick={() => setCmdOpen(true)} className="inline-flex items-center gap-2 border rounded-lg px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted transition">
            <Search className="h-4 w-4" /> Search…
            <kbd className="text-[10px] border rounded px-1 ml-1">⌘K</kbd>
          </button>
        </div>
        <div className="p-4 sm:p-6 md:p-8">
          <Outlet />
        </div>
      </main>

      <CommandPalette open={cmdOpen} onClose={() => setCmdOpen(false)} commands={commands} />
    </div>
  );
}
