import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getI18nPublic } from "@/lib/site.functions";
import type { I18nConfig } from "@/lib/config-types";

// The catalog of translatable UI-string keys, with their English defaults.
// Admins fill in translations for these keys per language in Admin → Languages.
export const DEFAULT_STRINGS: Record<string, string> = {
  "nav.home": "Home",
  "nav.shop": "Shop All",
  "nav.recipes": "Recipes",
  "nav.blog": "Blog",
  "nav.contact": "Contact",
  "nav.cart": "Cart",
  "nav.signIn": "Sign in",
  "nav.account": "My account",
  "nav.admin": "Admin panel",
  "nav.signOut": "Sign out",
  "action.searchPlaceholder": "Search for products...",
  "action.addToCart": "Add to Cart",
  "action.viewAll": "View all",
  "action.checkout": "Checkout",
  "action.continueShopping": "Continue shopping",
  "action.loadMore": "Load more",
  "footer.shop": "Shop",
  "footer.help": "Help",
  "footer.contact": "Contact",
  "footer.rights": "All rights reserved.",
  "product.reviews": "reviews",
  "product.description": "Description",
  "product.shipping": "Shipping",
  "product.inStock": "In stock",
  "cart.title": "Your Cart",
  "cart.empty": "Your cart is empty.",
  "cart.subtotal": "Subtotal",
  "cart.shipping": "Shipping",
  "cart.total": "Total",
  "cart.free": "FREE",
};

// Built-in Bengali translations — used as the fallback layer so BN works out of
// the box. Admin-entered strings (Admin → Languages) still take precedence.
export const BUILTIN_TRANSLATIONS: Record<string, Record<string, string>> = {
  bn: {
    "nav.home": "হোম",
    "nav.shop": "সব পণ্য",
    "nav.recipes": "রেসিপি",
    "nav.blog": "ব্লগ",
    "nav.contact": "যোগাযোগ",
    "nav.cart": "কার্ট",
    "nav.signIn": "সাইন ইন",
    "nav.account": "আমার অ্যাকাউন্ট",
    "nav.admin": "অ্যাডমিন প্যানেল",
    "nav.signOut": "সাইন আউট",
    "action.searchPlaceholder": "পণ্য খুঁজুন...",
    "action.addToCart": "কার্টে যোগ করুন",
    "action.orderNow": "অর্ডার করুন",
    "action.whatsapp": "Whatsapp করুন",
    "action.viewAll": "সব দেখুন",
    "action.checkout": "চেকআউট",
    "action.continueShopping": "কেনাকাটা চালিয়ে যান",
    "action.loadMore": "আরও দেখুন",
    "footer.shop": "শপ",
    "footer.help": "সহায়তা",
    "footer.contact": "যোগাযোগ",
    "footer.rights": "সর্বস্বত্ব সংরক্ষিত।",
    "product.reviews": "রিভিউ",
    "product.description": "বিবরণ",
    "product.shipping": "ডেলিভারি",
    "product.inStock": "স্টকে আছে",
    "cart.title": "আপনার কার্ট",
    "cart.empty": "আপনার কার্ট খালি।",
    "cart.subtotal": "সাব-টোটাল",
    "cart.shipping": "ডেলিভারি চার্জ",
    "cart.total": "সর্বমোট",
    "cart.free": "ফ্রি",
  },
};

export const LANG_COOKIE = "bf_lang";

export function readLangCookie(): string {
  if (typeof document === "undefined") return "";
  const m = document.cookie.match(/(?:^|;\s*)bf_lang=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : "";
}

export function setLang(code: string) {
  if (typeof document === "undefined") return;
  document.cookie = `${LANG_COOKIE}=${encodeURIComponent(code)}; Path=/; Max-Age=${60 * 60 * 24 * 365}; SameSite=Lax`;
  // Reload so SSR (dir/hreflang/lang attribute) re-renders in the chosen language.
  window.location.reload();
}

export type I18n = {
  enabled: boolean;
  lang: string;
  defaultLang: string;
  languages: I18nConfig["languages"];
  t: (key: string, fallback?: string) => string;
};

// Storefront translation hook. Reads the active language from the cookie and the
// catalog from the public i18n config. Falls back to English defaults.
export function useI18n(): I18n {
  const getFn = useServerFn(getI18nPublic);
  const { data } = useQuery({ queryKey: ["i18n"], queryFn: () => getFn(), staleTime: 300_000 });
  const [lang, setLangState] = useState("");

  useEffect(() => {
    const qp = new URLSearchParams(window.location.search).get("lang");
    setLangState(qp || readLangCookie());
  }, []);

  const cfg = data;
  const enabled = !!cfg?.enabled;
  const defaultLang = cfg?.defaultLang ?? "en";
  const active = enabled && lang ? lang : defaultLang;

  const t = (key: string, fallback?: string): string => {
    const fb = fallback ?? DEFAULT_STRINGS[key] ?? key;
    if (!enabled || active === defaultLang) return fb;
    // Priority: admin-entered translation → built-in pack → English default.
    return cfg?.strings?.[active]?.[key] || BUILTIN_TRANSLATIONS[active]?.[key] || fb;
  };

  return { enabled, lang: active, defaultLang, languages: cfg?.languages ?? [{ code: "en", name: "English", rtl: false }], t };
}
