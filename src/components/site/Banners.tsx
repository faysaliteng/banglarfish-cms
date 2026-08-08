import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listBanners } from "@/lib/catalog.functions";
import type { Banner } from "@/lib/types";
import { Img } from "./Img";

/**
 * Renders the admin-managed banners for a given placement.
 *
 * Admin → Banners writes to the `banners` table with a placement of
 * "hero" | "promo" | "strip"; this is what actually puts them on the storefront.
 */
export function Banners({ placement, className = "" }: { placement: "hero" | "promo" | "strip"; className?: string }) {
  const fn = useServerFn(listBanners);
  const { data = [] } = useQuery({ queryKey: ["banners"], queryFn: () => fn(), staleTime: 300_000 });
  const items = data.filter((b: Banner) => (b.placement || "promo") === placement);
  if (items.length === 0) return null;

  // Thin announcement-style ribbon.
  if (placement === "strip") {
    return (
      <div className={className}>
        {items.map((b) => (
          <Wrap key={b.id} href={b.href} className="block bg-[var(--color-brand)] text-[var(--color-brand-foreground)]">
            <div className="container-x py-2.5 text-center text-sm font-medium">
              {b.title}
              {b.subtitle && <span className="opacity-85"> · {b.subtitle}</span>}
            </div>
          </Wrap>
        ))}
      </div>
    );
  }

  // Full-width image banner.
  if (placement === "hero") {
    return (
      <section className={`container-x ${className}`}>
        {items.map((b) => (
          <Wrap key={b.id} href={b.href} className="group relative block rounded-2xl overflow-hidden mb-4 last:mb-0">
            {b.image && <Img src={b.image} alt={b.title} width={1600} height={640} sizes="100vw" widths={[800, 1200, 1600]} className="w-full h-[220px] md:h-[320px] object-cover group-hover:scale-[1.02] transition-transform duration-500" />}
            {(b.title || b.subtitle) && (
              <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-transparent flex flex-col justify-center p-8 md:p-12 text-white">
                {b.subtitle && <p className="text-sm font-semibold uppercase tracking-wider opacity-90">{b.subtitle}</p>}
                {b.title && <h2 className="text-2xl md:text-4xl font-bold mt-1 max-w-lg">{b.title}</h2>}
              </div>
            )}
          </Wrap>
        ))}
      </section>
    );
  }

  // Promo cards, two across.
  return (
    <section className={`container-x grid md:grid-cols-2 gap-5 ${className}`}>
      {items.map((b) => (
        <Wrap key={b.id} href={b.href} className="group relative block rounded-2xl overflow-hidden min-h-[180px] bg-muted">
          {b.image && <Img src={b.image} alt={b.title} width={800} height={400} sizes="(max-width: 768px) 100vw, 50vw" widths={[400, 800]} className="absolute inset-0 h-full w-full object-cover group-hover:scale-105 transition-transform duration-500" />}
          <div className="relative p-8 flex flex-col justify-center min-h-[180px] bg-gradient-to-r from-black/55 to-black/10 text-white">
            {b.subtitle && <p className="text-sm font-semibold uppercase tracking-wider opacity-90">{b.subtitle}</p>}
            {b.title && <h3 className="text-2xl font-bold mt-1">{b.title}</h3>}
          </div>
        </Wrap>
      ))}
    </section>
  );
}

// A banner is only a link when the admin gave it one.
function Wrap({ href, className, children }: { href: string; className: string; children: React.ReactNode }) {
  if (!href) return <div className={className}>{children}</div>;
  return <a href={href} className={className}>{children}</a>;
}
