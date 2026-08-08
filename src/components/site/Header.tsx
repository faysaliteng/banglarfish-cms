import { Link, useLoaderData } from "@tanstack/react-router";
import { Search, ShoppingBag, User, Menu, Phone, LogOut, LayoutDashboard, Globe, Mail } from "lucide-react";
import { useState } from "react";
import { Logo } from "./Logo";
import { useCart } from "@/lib/cart";
import { useSession, useIsAdmin, useSignOut } from "@/lib/auth";
import { withBase } from "@/lib/base-path";
import { useI18n, setLang } from "@/lib/i18n";

// 3D light-color pill button style for the main nav (soft layered shadow + hover lift).
const NAV_BTN =
  "shrink-0 whitespace-nowrap px-4 py-1.5 rounded-full bg-card text-foreground/80 border border-black/5 " +
  "shadow-[0_1px_1px_rgba(0,0,0,0.05),0_2px_5px_-2px_rgba(0,0,0,0.12),inset_0_1px_0_rgba(255,255,255,0.6)] " +
  "hover:shadow-[0_2px_4px_rgba(0,0,0,0.08),0_8px_16px_-6px_rgba(0,0,0,0.22),inset_0_1px_0_rgba(255,255,255,0.8)] " +
  "hover:-translate-y-0.5 hover:text-primary active:translate-y-0 transition-all duration-200 " +
  "[&.active]:bg-gradient-to-b [&.active]:from-primary [&.active]:to-primary/85 [&.active]:text-primary-foreground [&.active]:border-primary/30 [&.active]:shadow-[0_2px_6px_-1px_var(--tw-shadow-color,rgba(0,0,0,0.25))]";

export function Header() {
  const { lines } = useCart();
  const count = lines.reduce((s, l) => s + l.qty, 0);
  const [open, setOpen] = useState(false);
  const [menu, setMenu] = useState(false);
  const { user, loading } = useSession();
  const { isAdmin } = useIsAdmin(user);
  const signOut = useSignOut();

  // Chrome data comes from the root loader (SSR-rendered, zero client requests).
  const root = useLoaderData({ from: "__root__" });
  const categories = root?.categories ?? [];
  const menus = root?.menus;
  const sections = root?.sections;
  const showBlog = sections?.blog !== false;
  const showRecipes = sections?.recipes !== false;
  const showContact = sections?.contact !== false;
  // Drop any menu items that duplicate the built-in Blog / Recipes links.
  const headerLinks = (menus?.header ?? []).filter((l) => !/\/(blog|recipes)\/?$/i.test(l.href));
  const branding = root?.branding;
  const settings = root?.settings;
  const phone = settings?.storePhone || "+880 9642-057407";
  const { t, enabled: i18nOn, languages, lang } = useI18n();

  return (
    <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b">
      <div className="bg-primary text-primary-foreground text-xs">
        <div className="container-x flex items-center justify-between py-2">
          <span className="hidden sm:block">{branding?.announcement ?? "Free delivery on orders over ৳2,000 · Same-day delivery in Dhaka"}</span>
          <div className="flex items-center gap-4">
            {showContact && (
              <Link to="/contact" className="hidden sm:flex items-center gap-1.5 font-medium hover:underline">
                <Mail className="h-3.5 w-3.5" /> {t("nav.contact")}
              </Link>
            )}
            <a href={`tel:${phone.replace(/[^+\d]/g, "")}`} className="flex items-center gap-1.5 font-medium">
              <Phone className="h-3.5 w-3.5" /> {phone}
            </a>
          </div>
        </div>
      </div>
      <div className="container-x flex items-center gap-3 md:gap-6 py-4">
        <button className="md:hidden -m-2 p-2 grid place-items-center min-h-[44px] min-w-[44px]" onClick={() => setOpen(!open)} aria-label="Menu">
          <Menu className="h-6 w-6" />
        </button>
        <Link to="/" className="shrink-0" aria-label="Banglarfish home">
          <Logo variant="light" className="h-11 w-auto" />
        </Link>
        <form action="/shop" className="hidden md:flex flex-1 max-w-xl mx-auto relative">
          <input
            name="q"
            aria-label="Search products"
            placeholder={t("action.searchPlaceholder")}
            className="w-full rounded-full border pl-5 pr-12 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
          <button className="absolute right-1.5 top-1/2 -translate-y-1/2 bg-primary text-primary-foreground rounded-full p-2" aria-label="Search">
            <Search className="h-4 w-4" />
          </button>
        </form>
        <div className="ml-auto flex items-center gap-3">
          {i18nOn && languages.length > 1 && (
            <div className="relative hidden sm:flex items-center gap-1 text-sm">
              <Globe className="h-4 w-4 text-muted-foreground" />
              <select value={lang} onChange={(e) => setLang(e.target.value)} aria-label="Language" className="bg-transparent border rounded-md px-1.5 py-1 text-xs focus:outline-none">
                {languages.map((l) => <option key={l.code} value={l.code}>{l.code.toUpperCase()}</option>)}
              </select>
            </div>
          )}
          {!loading && !user && (
            <Link to="/auth" search={{ next: "/account" }} className="hidden sm:flex items-center gap-1.5 text-sm hover:text-primary min-h-[44px] px-1">
              <User className="h-5 w-5" /> <span className="hidden lg:inline">{t("nav.signIn")}</span>
            </Link>
          )}
          {!loading && user && (
            <div className="relative">
              <button onClick={() => setMenu(!menu)} className="hidden sm:flex items-center gap-1.5 text-sm hover:text-primary">
                <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground grid place-items-center text-xs font-bold">
                  {(user.email ?? "?").slice(0, 1).toUpperCase()}
                </div>
                <span className="hidden lg:inline max-w-[140px] truncate">{user.email}</span>
              </button>
              {menu && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-background border rounded-lg shadow-lg py-1 text-sm z-50">
                  <Link to="/account" onClick={() => setMenu(false)} className="flex items-center gap-2 px-3 py-2 hover:bg-muted">
                    <User className="h-4 w-4" /> {t("nav.account")}
                  </Link>
                  {isAdmin && (
                    <Link to="/admin" onClick={() => setMenu(false)} className="flex items-center gap-2 px-3 py-2 hover:bg-muted">
                      <LayoutDashboard className="h-4 w-4" /> {t("nav.admin")}
                    </Link>
                  )}
                  <button
                    onClick={async () => { setMenu(false); await signOut(); window.location.href = withBase("/"); }}
                    className="w-full text-left flex items-center gap-2 px-3 py-2 hover:bg-muted text-destructive"
                  >
                    <LogOut className="h-4 w-4" /> {t("nav.signOut")}
                  </button>
                </div>
              )}
            </div>
          )}
          <Link to="/cart" className="relative flex items-center justify-center gap-1.5 text-sm hover:text-primary min-h-[44px] min-w-[44px] px-1" aria-label="Cart">
            <ShoppingBag className="h-5 w-5" />
            {count > 0 && (
              <span className="absolute -top-2 -right-2 bg-[var(--color-brand)] text-[var(--color-brand-foreground)] text-[10px] font-bold rounded-full h-5 min-w-5 px-1 flex items-center justify-center">
                {count}
              </span>
            )}
            <span className="hidden lg:inline">{t("nav.cart")}</span>
          </Link>
        </div>
      </div>
      <nav className="hidden md:block border-t bg-gradient-to-b from-background to-muted/30">
        <div className="container-x flex items-center gap-2 py-2.5 text-sm font-semibold overflow-x-auto">
          <Link to="/" className={NAV_BTN} activeOptions={{ exact: true }}>{t("nav.home")}</Link>
          <Link to="/shop" className={NAV_BTN}>{t("nav.shop")}</Link>
          {categories.map((c) => (
            <Link key={c.slug} to="/category/$slug" params={{ slug: c.slug }} className={NAV_BTN}>
              {c.name}
            </Link>
          ))}
          {showRecipes && <Link to="/recipes" className={NAV_BTN}>{t("nav.recipes")}</Link>}
          {showBlog && <Link to="/blog" className={NAV_BTN}>{t("nav.blog")}</Link>}
          {showContact && <Link to="/contact" className={NAV_BTN}>{t("nav.contact")}</Link>}
          {headerLinks.map((l, i) => (
            <a key={i} href={l.href} className={NAV_BTN}>{l.label}</a>
          ))}
        </div>
      </nav>
      {open && (
        <div className="md:hidden border-t bg-background">
          <div className="container-x py-3 flex flex-col gap-1 text-sm">
            <form action="/shop" className="relative mb-2">
              <input
                name="q"
                aria-label="Search products"
                placeholder={t("action.searchPlaceholder")}
                className="w-full rounded-full border pl-4 pr-10 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
              <button className="absolute right-1 top-1/2 -translate-y-1/2 bg-primary text-primary-foreground rounded-full p-1.5" aria-label="Search">
                <Search className="h-4 w-4" />
              </button>
            </form>
            {user ? (
              <Link to="/account" onClick={() => setOpen(false)} className="py-2 font-medium">{t("nav.account")}</Link>
            ) : (
              <Link to="/auth" search={{ next: "/account" }} onClick={() => setOpen(false)} className="py-2 font-medium">{t("nav.signIn")}</Link>
            )}
            {isAdmin && (
              <Link to="/admin" onClick={() => setOpen(false)} className="py-2 font-medium">{t("nav.admin")}</Link>
            )}
            <Link to="/shop" onClick={() => setOpen(false)} className="py-2">{t("nav.shop")}</Link>
            {categories.map((c) => (
              <Link key={c.slug} to="/category/$slug" params={{ slug: c.slug }} onClick={() => setOpen(false)} className="py-2">
                {c.name}
              </Link>
            ))}
            {showRecipes && <Link to="/recipes" onClick={() => setOpen(false)} className="py-2">{t("nav.recipes")}</Link>}
            {showBlog && <Link to="/blog" onClick={() => setOpen(false)} className="py-2">{t("nav.blog")}</Link>}
            {showContact && <Link to="/contact" onClick={() => setOpen(false)} className="py-2">{t("nav.contact")}</Link>}
          </div>
        </div>
      )}
    </header>
  );
}
