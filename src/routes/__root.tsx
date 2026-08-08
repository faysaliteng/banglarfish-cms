import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportError } from "../lib/error-reporting";
import { ThemeStyle } from "../components/site/ThemeStyle";
import { CustomCode } from "../components/site/CustomCode";
import { Toaster } from "../components/ui/sonner";
import { CookieConsent } from "../components/site/CookieConsent";
import { getTheme } from "@/lib/theme.functions";
import { getSeo, getBranding, getCustomCodePublic, getI18nState } from "@/lib/site.functions";
import { getSettings } from "@/lib/catalog.functions";
import { setCurrency, setPricing } from "@/lib/cart";
import { recordPageView } from "@/lib/analytics.functions";
import { recordNotFound } from "@/lib/redirects.functions";

function VisitorTracker() {
  const record = useServerFn(recordPageView);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  useEffect(() => {
    if (typeof document === "undefined") return;
    if (pathname.startsWith("/admin")) return; // don't track the admin panel itself
    record({ data: { path: pathname, referrer: document.referrer || null } }).catch(() => {});
  }, [pathname, record]);
  return null;
}

function NotFoundComponent() {
  const record = useServerFn(recordNotFound);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  useEffect(() => {
    if (typeof document === "undefined") return;
    record({ data: { path: pathname, referrer: document.referrer || null } }).catch(() => {});
  }, [pathname, record]);
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  loader: async () => {
    const [theme, seo, branding, customCode, settings, i18n] = await Promise.all([getTheme(), getSeo(), getBranding(), getCustomCodePublic(), getSettings(), getI18nState()]);
    const siteUrl = (process.env.APP_URL || "").replace(/\/+$/, "");
    return { theme, seo, branding, customCode, settings, siteUrl, i18n };
  },
  head: ({ loaderData }) => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: loaderData?.seo?.defaultTitle ?? "Banglarfish — Fresh Fish Delivered from River to Kitchen" },
      { name: "description", content: loaderData?.seo?.defaultDescription ?? "Bangladesh's freshest fish shop. Order hilsa, rohu, prawn, and dried fish online. Same-day delivery in Dhaka." },
      { name: "author", content: loaderData?.seo?.siteName ?? "Banglarfish" },
      { property: "og:site_name", content: loaderData?.seo?.siteName ?? "Banglarfish" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      ...(loaderData?.seo?.twitterHandle ? [{ name: "twitter:site", content: loaderData.seo.twitterHandle }] : []),
      ...(loaderData?.seo?.defaultOgImage ? [{ property: "og:image", content: loaderData.seo.defaultOgImage }] : []),
      ...(loaderData?.seo?.googleVerification ? [{ name: "google-site-verification", content: loaderData.seo.googleVerification }] : []),
      ...(loaderData?.seo?.bingVerification ? [{ name: "msvalidate.01", content: loaderData.seo.bingVerification }] : []),
      ...(loaderData?.seo?.noindexSite ? [{ name: "robots", content: "noindex, nofollow" }] : []),
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", type: "image/png", href: loaderData?.branding?.favicon ?? "/img/favicon.png" },
      { rel: "apple-touch-icon", type: "image/png", href: loaderData?.branding?.favicon ?? "/img/favicon.png" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Poppins:wght@500;600;700;800&family=Inter:wght@400;500;600;700&family=Manrope:wght@400;500;600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Montserrat:wght@400;500;600;700;800&family=Space+Grotesk:wght@400;500;600;700&family=Playfair+Display:wght@500;600;700;800&family=Hind+Siliguri:wght@400;500;600;700&display=swap" },
      // hreflang alternates for multi-language stores.
      ...((loaderData?.i18n?.enabled && loaderData.i18n.languages.length > 1 && loaderData?.siteUrl)
        ? [
            ...loaderData.i18n.languages.map((l) => ({ rel: "alternate", hrefLang: l.code, href: `${loaderData.siteUrl}/?lang=${l.code}` })),
            { rel: "alternate", hrefLang: "x-default", href: `${loaderData.siteUrl}/` },
          ]
        : []),
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const { theme, seo, customCode, settings, siteUrl, i18n } = Route.useLoaderData();
  // Apply the store currency site-wide (runs on both server render + client).
  setCurrency({ code: settings?.currency, symbol: settings?.currencySymbol, position: settings?.currencyPosition, decimals: settings?.currencyDecimals, thousandSep: settings?.currencyThousandSep });
  // Keep the cart/checkout preview in step with the store's shipping + tax rules.
  setPricing({ freeShippingThreshold: settings?.freeShippingThreshold, standardShipping: settings?.standardShipping, taxPercent: settings?.taxPercent });
  const siteCss = (customCode?.css ?? "").replace(/<\s*\//g, "").slice(0, 50000);

  const lb = seo.localBusiness;
  const orgLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${siteUrl}/#organization`,
        name: seo.organizationName || seo.siteName,
        url: siteUrl || undefined,
        logo: seo.organizationLogo ? { "@type": "ImageObject", url: seo.organizationLogo } : undefined,
        sameAs: seo.socialProfiles,
      },
      {
        "@type": "WebSite",
        "@id": `${siteUrl}/#website`,
        name: seo.siteName,
        url: siteUrl || undefined,
        publisher: { "@id": `${siteUrl}/#organization` },
        ...(siteUrl
          ? {
              potentialAction: {
                "@type": "SearchAction",
                target: { "@type": "EntryPoint", urlTemplate: `${siteUrl}/shop?q={search_term_string}` },
                "query-input": "required name=search_term_string",
              },
            }
          : {}),
      },
      ...(lb?.enabled
        ? [{
            "@type": lb.type || "Store",
            "@id": `${siteUrl}/#localbusiness`,
            name: lb.name || seo.siteName,
            url: siteUrl || undefined,
            image: seo.organizationLogo || undefined,
            telephone: lb.phone || undefined,
            priceRange: lb.priceRange || undefined,
            parentOrganization: { "@id": `${siteUrl}/#organization` },
            address: { "@type": "PostalAddress", streetAddress: lb.street || undefined, addressLocality: lb.city || undefined, addressRegion: lb.region || undefined, postalCode: lb.postalCode || undefined, addressCountry: lb.country || undefined },
            ...(lb.lat && lb.lng ? { geo: { "@type": "GeoCoordinates", latitude: lb.lat, longitude: lb.lng } } : {}),
            ...(lb.hours ? { openingHours: lb.hours } : {}),
          }]
        : []),
    ],
  };

  return (
    <QueryClientProvider client={queryClient}>
      <Toaster richColors closeButton position="top-center" />
      <CookieConsent />
      <ThemeStyle theme={theme} />
      {siteCss && <style id="bf-site-css" dangerouslySetInnerHTML={{ __html: siteCss }} />}
      {customCode && <CustomCode headHtml={customCode.headHtml} bodyEnd={customCode.bodyEnd} />}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(orgLd).replace(/</g, "\\u003c") }} />
      <VisitorTracker />
      {/* #bf-root carries the surface/layout/effect data-attributes the theme CSS keys off. */}
      <div
        id="bf-root"
        lang={i18n?.lang || "en"}
        dir={i18n?.dir === "rtl" ? "rtl" : "ltr"}
        data-surface={theme.surface}
        data-hero={theme.hero}
        data-bg={theme.bg}
        data-animations={theme.animations === false ? "off" : "on"}
        data-hover3d={theme.hover3d ? "on" : "off"}
        data-gradient-buttons={theme.gradientButtons ? "on" : "off"}
        data-pill={theme.pill ? "on" : "off"}
        className={theme.dark ? "dark" : ""}
      >
        {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
        <Outlet />
      </div>
    </QueryClientProvider>
  );
}
