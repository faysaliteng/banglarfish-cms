import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site/SiteLayout";
import { ProductCard } from "@/components/site/ProductCard";
import { useServerFn } from "@tanstack/react-start";
import { getHomepage, listCategories, listBestSellers, listNewArrivals, listRecipes, listBlog, listProducts, subscribeNewsletter } from "@/lib/catalog.functions";
import { getTheme } from "@/lib/theme.functions";
import { Truck, ShieldCheck, Snowflake, Clock, ArrowRight, ShoppingBag, PackageCheck, Bike, ChefHat } from "lucide-react";
import { toast } from "sonner";
import { Reveal } from "@/components/site/Reveal";
import { CountUp } from "@/components/site/CountUp";
import type { Homepage, ThemeHero, Product, BlogPost } from "@/lib/types";

export const Route = createFileRoute("/")({
  loader: async () => {
    const h = await getHomepage();
    const [categories, best, arrivals, theme, recipes, blog, masala] = await Promise.all([
      listCategories(),
      listBestSellers(),
      listNewArrivals(),
      getTheme(),
      listRecipes(),
      listBlog(),
      listProducts({ data: { category: h.masalaCategory || "fish-masala" } }),
    ]);
    return { h, categories, best, arrivals, hero: theme.hero, recipes, blog, masala: masala.items };
  },
  head: () => ({
    meta: [
      { title: "Banglarfish — Fresh Fish Delivered from River to Kitchen" },
      { name: "description", content: "Order fresh hilsa, rohu, prawn, and dried fish online in Bangladesh. Cleaned, iced, and delivered the same day. Free delivery over ৳2,000." },
      { property: "og:title", content: "Banglarfish — Fresh Fish Delivered from River to Kitchen" },
      { property: "og:description", content: "Bangladesh's freshest fish shop. Same-day delivery in Dhaka." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

const iconMap = { truck: Truck, snowflake: Snowflake, shield: ShieldCheck, clock: Clock } as const;

function Home() {
  const { h, categories, best, arrivals, hero, recipes, blog, masala } = Route.useLoaderData();
  const s = h.sections;
  const subscribe = useServerFn(subscribeNewsletter);

  async function onSubscribe(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    try {
      await subscribe({ data: { email: String(fd.get("email") ?? "").trim() } });
      (e.target as HTMLFormElement).reset();
      toast.success("Subscribed! Check your inbox for a welcome discount.");
    } catch {
      toast.error("Could not subscribe. Try again.");
    }
  }

  return (
    <SiteLayout>
      {/* Hero (layout switches with the admin Theme setting) */}
      <Hero h={h} hero={hero} />

      {/* Trust bar */}
      <section className="border-y bg-muted/40">
        <div className="container-x grid grid-cols-2 md:grid-cols-4 gap-4 py-6">
          {h.features.map((f, i) => {
            const Icon = iconMap[f.icon] ?? Truck;
            return (
              <div key={i} className="flex items-center gap-3 min-w-0">
                <div className="p-2.5 rounded-full bg-primary/10 text-primary shrink-0"><Icon className="h-6 w-6" /></div>
                <div className="min-w-0">
                  <p className="font-semibold text-sm">{f.title}</p>
                  <p className="text-xs text-muted-foreground">{f.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Categories */}
      {s.categories && (
      <section className="container-x py-14">
        <SectionHead eyebrow={h.categoriesEyebrow} title={h.categoriesTitle} />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {categories.map((c, i) => (
            <Reveal key={c.slug} delay={(i % 6) * 60}>
              <Link to="/category/$slug" params={{ slug: c.slug }} className="group text-center block">
                <div className="aspect-square rounded-2xl overflow-hidden bg-muted mb-3 border group-hover:border-primary transition group-hover:-translate-y-1 group-hover:shadow-xl duration-300">
                  <img src={c.image} alt={c.name} loading="lazy" className="h-full w-full object-cover group-hover:scale-110 transition-transform duration-500" />
                </div>
                <p className="font-semibold text-sm group-hover:text-primary">{c.name}</p>
                <p className="text-xs text-muted-foreground" style={{ fontFamily: "var(--font-bangla)" }}>{c.bn}</p>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>
      )}

      {/* How it works */}
      {s.howItWorks && <HowItWorks />}

      {/* Best Sellers */}
      {s.bestSellers && best.length > 0 && (
        <section className="container-x py-8">
          <SectionHead eyebrow={h.bestSellersEyebrow} title={h.bestSellersTitle} cta={{ href: "/shop", label: "View all" }} />
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {best.slice(0, 8).map((p, i) => <Reveal key={p.id} delay={(i % 4) * 70}><ProductCard product={p} /></Reveal>)}
          </div>
        </section>
      )}

      {/* Fish Masala */}
      {s.masala && <MasalaSection h={h} products={masala} />}

      {/* Promo banners */}
      {s.promos && (
      <section className="container-x py-14 grid md:grid-cols-2 gap-5">
        {h.promos.map((p, i) => (
          <a key={i} href={p.href} className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${p.theme === "brand" ? "from-[var(--color-brand)] to-[var(--color-brand)]/70" : "from-primary to-primary/70"} text-white p-8 min-h-[180px] flex flex-col justify-center hover:scale-[1.01] transition-transform`}>
            <p className="text-sm font-semibold opacity-90 uppercase tracking-wider">{p.subtitle}</p>
            <h3 className="text-2xl md:text-3xl font-bold mt-1">{p.title}</h3>
            <span className="mt-4 inline-flex items-center gap-2 font-semibold">Shop now <ArrowRight className="h-4 w-4" /></span>
          </a>
        ))}
      </section>
      )}

      {/* New Arrivals */}
      {s.newArrivals && arrivals.length > 0 && (
        <section className="container-x py-8">
          <SectionHead eyebrow={h.newArrivalsEyebrow} title={h.newArrivalsTitle} cta={{ href: "/shop", label: "Shop new" }} />
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {arrivals.slice(0, 8).map((p, i) => <Reveal key={p.id} delay={(i % 4) * 70}><ProductCard product={p} /></Reveal>)}
          </div>
        </section>
      )}

      {/* Recipes */}
      {s.recipes && recipes.length > 0 && <RecipeSection h={h} recipes={recipes} />}

      {/* Blog */}
      {s.blog && blog.length > 0 && <BlogSection h={h} posts={blog} />}

      {/* Testimonials */}
      {s.testimonials && (
      <section className="bg-muted/40 py-16 mt-8">
        <div className="container-x">
          <SectionHead eyebrow={h.testimonialsEyebrow} title={h.testimonialsTitle} />
          <div className="grid md:grid-cols-3 gap-5">
            {h.testimonials.map((r, i) => (
              <Reveal key={i} delay={i * 90}>
                <div className="bg-card rounded-xl p-6 border h-full">
                  <div className="flex gap-1 mb-3">{Array.from({ length: 5 }).map((_, j) => <span key={j} className="text-yellow-400">★</span>)}</div>
                  <p className="text-sm leading-relaxed">"{r.t}"</p>
                  <div className="mt-4 text-sm">
                    <p className="font-semibold">{r.n}</p>
                    <p className="text-muted-foreground text-xs">{r.loc}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>
      )}

      {/* Newsletter */}
      {s.newsletter && (
      <section className="container-x py-14">
        <div className="rounded-2xl bg-gradient-to-r from-primary to-primary/80 text-primary-foreground p-8 md:p-12 text-center">
          <h3 className="text-2xl md:text-3xl font-bold">{h.newsletterTitle}</h3>
          <p className="mt-2 opacity-90">{h.newsletterSubtitle}</p>
          <form onSubmit={onSubscribe} className="mt-6 flex flex-col sm:flex-row gap-2 max-w-md mx-auto">
            <input type="email" name="email" required placeholder="your@email.com" className="flex-1 rounded-full px-5 py-3 text-foreground bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-brand)]" />
            <button className="rounded-full bg-[var(--color-brand)] text-white font-semibold px-6 py-3 hover:opacity-90">{h.newsletterCta}</button>
          </form>
        </div>
      </section>
      )}
    </SiteLayout>
  );
}

function HeroCtas({ h, center }: { h: Homepage; center?: boolean }) {
  return (
    <div className={`mt-7 flex flex-wrap gap-3 ${center ? "justify-center" : ""}`}>
      <a href={h.heroCtaPrimary.href} className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-full font-semibold hover:bg-primary/90 transition">
        {h.heroCtaPrimary.label} <ArrowRight className="h-4 w-4" />
      </a>
      <a href={h.heroCtaSecondary.href} className="inline-flex items-center gap-2 border-2 border-foreground/15 px-6 py-3 rounded-full font-semibold hover:border-primary hover:text-primary transition">
        {h.heroCtaSecondary.label}
      </a>
    </div>
  );
}

function HeroStats({ h, center }: { h: Homepage; center?: boolean }) {
  return (
    <div className={`mt-8 grid grid-cols-3 gap-4 max-w-md ${center ? "mx-auto" : ""}`}>
      {h.stats.map((s, i) => (
        <div key={i} className={center ? "text-center" : ""}>
          <p className="text-2xl font-bold text-primary"><CountUp value={s.n} /></p>
          <p className="text-xs text-muted-foreground">{s.label}</p>
        </div>
      ))}
    </div>
  );
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return <span className="inline-block px-3 py-1 rounded-full bg-[var(--color-brand)]/15 text-[var(--color-brand)] text-xs font-semibold tracking-wide uppercase">{children}</span>;
}

function Hero({ h, hero }: { h: Homepage; hero: ThemeHero }) {
  if (hero === "fullbleed") {
    return (
      <section className="relative">
        <div className="relative h-[520px] md:h-[600px] overflow-hidden">
          <img src={h.heroImage} alt="Fresh fish" className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-transparent" />
          <div className="container-x relative h-full flex items-center">
            <div className="max-w-xl bg-card/80 backdrop-blur-md rounded-2xl p-6 sm:p-8 border shadow-2xl">
              <Eyebrow>{h.heroEyebrow}</Eyebrow>
              <h1 className="mt-4 text-4xl md:text-5xl font-bold leading-tight">{h.heroTitleTop} <span className="text-primary">{h.heroTitleBottom}</span></h1>
              <p className="mt-4 text-muted-foreground">{h.heroSubtitle}</p>
              <HeroCtas h={h} />
              <HeroStats h={h} />
            </div>
          </div>
        </div>
      </section>
    );
  }
  if (hero === "centered") {
    return (
      <section className="relative overflow-hidden bg-gradient-to-b from-primary/10 to-background">
        <div className="container-x py-16 md:py-20 text-center">
          <div className="max-w-3xl mx-auto">
            <Eyebrow>{h.heroEyebrow}</Eyebrow>
            <h1 className="mt-4 text-4xl md:text-6xl font-bold leading-tight">{h.heroTitleTop} <span className="text-primary">{h.heroTitleBottom}</span></h1>
            <p className="mt-5 text-lg text-muted-foreground max-w-xl mx-auto">{h.heroSubtitle}</p>
            <HeroCtas h={h} center />
            <HeroStats h={h} center />
          </div>
          <div className="mt-12 relative max-w-4xl mx-auto">
            <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full" />
            <img src={h.heroImage} alt="Fresh fish on ice" className="relative rounded-2xl shadow-2xl w-full object-cover max-h-[380px]" />
          </div>
        </div>
      </section>
    );
  }
  if (hero === "minimal") {
    return (
      <section className="border-b">
        <div className="container-x py-20 md:py-28 text-center max-w-2xl mx-auto">
          <Eyebrow>{h.heroEyebrow}</Eyebrow>
          <h1 className="mt-5 text-5xl md:text-7xl font-bold leading-none tracking-tight">{h.heroTitleTop} <span className="text-primary">{h.heroTitleBottom}</span></h1>
          <p className="mt-6 text-lg text-muted-foreground">{h.heroSubtitle}</p>
          <HeroCtas h={h} center />
        </div>
      </section>
    );
  }
  if (hero === "spotlight") {
    return (
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute left-1/2 top-2 h-[520px] w-[520px] -translate-x-1/2 rounded-full blur-3xl opacity-60" style={{ background: "radial-gradient(circle, var(--brand), transparent 60%)" }} />
          <div className="absolute left-1/4 top-24 h-[360px] w-[360px] rounded-full blur-3xl opacity-40" style={{ background: "radial-gradient(circle, var(--primary), transparent 60%)" }} />
        </div>
        <div className="container-x py-16 md:py-24 text-center">
          <div className="max-w-3xl mx-auto">
            <Eyebrow>{h.heroEyebrow}</Eyebrow>
            <h1 className="mt-5 text-4xl md:text-6xl font-bold leading-tight">{h.heroTitleTop} <span className="text-primary">{h.heroTitleBottom}</span></h1>
            <p className="mt-5 text-lg text-muted-foreground max-w-xl mx-auto">{h.heroSubtitle}</p>
            <HeroCtas h={h} center />
          </div>
          <div className="relative mt-12 max-w-3xl mx-auto">
            <div className="absolute -inset-5 rounded-[2rem] blur-2xl opacity-50" style={{ background: "conic-gradient(from 90deg, var(--primary), var(--accent2), var(--brand), var(--primary))" }} />
            <div className="relative bg-card rounded-2xl p-2">
              <img src={h.heroImage} alt="Fresh fish on ice" className="rounded-xl w-full object-cover max-h-[360px]" />
            </div>
          </div>
          <HeroStats h={h} center />
        </div>
      </section>
    );
  }
  if (hero === "diagonal") {
    return (
      <section className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-background to-[var(--color-brand)]/10">
        <div className="container-x grid md:grid-cols-2 gap-8 items-center py-12 md:py-20">
          <div>
            <Eyebrow>{h.heroEyebrow}</Eyebrow>
            <h1 className="mt-4 text-4xl md:text-6xl font-bold leading-tight">{h.heroTitleTop} <span className="text-primary">{h.heroTitleBottom}</span></h1>
            <p className="mt-5 text-lg text-muted-foreground max-w-md">{h.heroSubtitle}</p>
            <HeroCtas h={h} />
            <HeroStats h={h} />
          </div>
          <div className="relative h-[280px] md:h-[440px]">
            <div className="absolute -inset-3 rounded-2xl blur-2xl opacity-40" style={{ background: "linear-gradient(135deg, var(--primary), var(--brand))" }} />
            <div className="relative h-full overflow-hidden rounded-2xl md:[clip-path:polygon(14%_0,100%_0,100%_100%,0_100%)]">
              <img src={h.heroImage} alt="Fresh fish on ice" className="h-full w-full object-cover" />
            </div>
          </div>
        </div>
      </section>
    );
  }
  if (hero === "showcase") {
    return (
      <section className="relative overflow-hidden">
        <div className="container-x py-12 md:py-20 grid lg:grid-cols-[1.1fr_1fr] gap-10 items-center">
          <div>
            <Eyebrow>{h.heroEyebrow}</Eyebrow>
            <h1 className="mt-4 text-4xl md:text-6xl font-bold leading-[1.05]">{h.heroTitleTop} <span className="text-primary">{h.heroTitleBottom}</span></h1>
            <p className="mt-5 text-lg text-muted-foreground max-w-md">{h.heroSubtitle}</p>
            <HeroCtas h={h} />
            <HeroStats h={h} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-card rounded-2xl overflow-hidden row-span-2">
              <img src={h.heroImage} alt="Fresh fish" className="h-full w-full object-cover min-h-[260px]" />
            </div>
            <div className="bg-card rounded-2xl p-5 flex flex-col justify-center">
              <p className="text-3xl font-bold text-primary">{h.stats[0]?.n ?? "10K+"}</p>
              <p className="text-xs text-muted-foreground mt-1">{h.stats[0]?.label ?? "Happy customers"}</p>
            </div>
            <div className="rounded-2xl p-5 flex flex-col justify-center text-white" style={{ background: "var(--bf-grad, linear-gradient(135deg, var(--primary), var(--brand)))" }}>
              <p className="text-3xl font-bold">{h.stats[2]?.n ?? h.stats[1]?.n ?? "24h"}</p>
              <p className="text-xs text-white/85 mt-1">{h.stats[2]?.label ?? h.stats[1]?.label ?? "Fast delivery"}</p>
            </div>
          </div>
        </div>
      </section>
    );
  }
  if (hero === "gradient") {
    return (
      <section className="relative overflow-hidden text-white" style={{ background: "linear-gradient(135deg, var(--primary), var(--accent2) 50%, var(--brand))" }}>
        <div className="pointer-events-none absolute inset-0 opacity-40" style={{ backgroundImage: "radial-gradient(at 18% 18%, rgba(255,255,255,.35), transparent 42%), radial-gradient(at 82% 0%, rgba(255,255,255,.22), transparent 46%)" }} />
        <div className="container-x relative py-20 md:py-28 text-center">
          <span className="inline-block px-3 py-1 rounded-full bg-white/20 text-white text-xs font-semibold tracking-wide uppercase backdrop-blur">{h.heroEyebrow}</span>
          <h1 className="mt-5 text-5xl md:text-7xl font-bold leading-none tracking-tight max-w-4xl mx-auto">{h.heroTitleTop} {h.heroTitleBottom}</h1>
          <p className="mt-6 text-lg md:text-xl text-white/90 max-w-xl mx-auto">{h.heroSubtitle}</p>
          <div className="mt-8 flex flex-wrap gap-3 justify-center">
            <a href={h.heroCtaPrimary.href} className="inline-flex items-center gap-2 bg-white text-slate-900 px-6 py-3 rounded-full font-semibold hover:opacity-90 transition">{h.heroCtaPrimary.label} <ArrowRight className="h-4 w-4" /></a>
            <a href={h.heroCtaSecondary.href} className="inline-flex items-center gap-2 border-2 border-white/50 text-white px-6 py-3 rounded-full font-semibold hover:bg-white/10 transition">{h.heroCtaSecondary.label}</a>
          </div>
          <div className="mt-10 grid grid-cols-3 gap-4 max-w-md mx-auto">
            {h.stats.map((s, i) => (
              <div key={i} className="text-center">
                <p className="text-2xl font-bold">{s.n}</p>
                <p className="text-xs text-white/80">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }
  // split (default)
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-background to-[var(--color-brand)]/10">
      <div className="container-x grid md:grid-cols-2 gap-8 items-center py-12 md:py-20">
        <div>
          <Eyebrow>{h.heroEyebrow}</Eyebrow>
          <h1 className="mt-4 text-4xl md:text-6xl font-bold leading-tight">{h.heroTitleTop} <br /><span className="text-primary">{h.heroTitleBottom}</span></h1>
          <p className="mt-5 text-lg text-muted-foreground max-w-md">{h.heroSubtitle}</p>
          <HeroCtas h={h} />
          <HeroStats h={h} />
        </div>
        <div className="relative">
          <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full" />
          <img src={h.heroImage} alt="Fresh fish on ice" width={1600} height={1000} className="relative rounded-2xl shadow-2xl w-full h-auto max-w-full" />
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    { icon: ShoppingBag, title: "Order online", desc: "Browse the catalog and pick your fish, prawns or shutki — fresh from Bangladesh." },
    { icon: PackageCheck, title: "Cleaned, cut & iced", desc: "We clean, cut to your preference, and pack it cold in hygienic packaging." },
    { icon: Bike, title: "Same-day delivery", desc: "Dispatched the same day — delivered chilled right to your door in Dhaka." },
  ];
  return (
    <section className="container-x py-14">
      <Reveal>
        <SectionHead eyebrow="How it works" title="From our net to your kitchen in 3 steps" />
      </Reveal>
      <div className="relative grid md:grid-cols-3 gap-5">
        {/* connecting line on desktop */}
        <div className="hidden md:block absolute top-9 left-[16%] right-[16%] h-px bg-gradient-to-r from-transparent via-[var(--color-primary)]/40 to-transparent" />
        {steps.map((s, i) => {
          const Icon = s.icon;
          return (
            <Reveal key={s.title} delay={i * 110}>
              <div className="relative bg-card border rounded-2xl p-6 text-center h-full transition-transform">
                <div className="relative mx-auto mb-4 grid place-items-center h-16 w-16 rounded-2xl text-white" style={{ background: "var(--bf-grad3, linear-gradient(135deg, var(--color-primary), var(--color-brand)))" }}>
                  <Icon className="h-7 w-7" />
                  <span className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-[var(--color-brand)] text-white text-xs font-bold grid place-items-center border-2 border-card">{i + 1}</span>
                </div>
                <h3 className="font-semibold text-lg">{s.title}</h3>
                <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{s.desc}</p>
              </div>
            </Reveal>
          );
        })}
      </div>
    </section>
  );
}

function MasalaSection({ h, products }: { h: Homepage; products: Product[] }) {
  return (
    <section className="container-x py-8">
      <Reveal>
        <SectionHead eyebrow={h.masalaEyebrow} title={h.masalaTitle} cta={products.length ? { href: `/category/${h.masalaCategory}`, label: "Shop all" } : undefined} />
      </Reveal>
      {products.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {products.slice(0, 8).map((p, i) => <Reveal key={p.id} delay={(i % 4) * 70}><ProductCard product={p} /></Reveal>)}
        </div>
      ) : (
        <Reveal>
          <a href={`/category/${h.masalaCategory}`} className="block rounded-2xl bg-gradient-to-br from-[var(--color-brand)] to-[var(--color-brand)]/70 text-white p-8 md:p-12 text-center hover:scale-[1.005] transition">
            <p className="text-sm font-semibold uppercase tracking-wider opacity-90">{h.masalaEyebrow}</p>
            <h3 className="text-2xl md:text-3xl font-bold mt-1">{h.masalaTitle}</h3>
            <p className="opacity-90 mt-2">Freshly-ground fish masala &amp; spice blends — add products in Admin → Products (category "{h.masalaCategory}").</p>
          </a>
        </Reveal>
      )}
    </section>
  );
}

function RecipeSection({ h, recipes }: { h: Homepage; recipes: BlogPost[] }) {
  return (
    <section className="container-x py-8">
      <Reveal>
        <SectionHead eyebrow={h.recipesEyebrow} title={h.recipesTitle} cta={{ href: "/recipes", label: "All recipes" }} />
      </Reveal>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {recipes.slice(0, 3).map((p, i) => (
          <Reveal key={p.id} delay={i * 80}>
            <Link to="/blog/$slug" params={{ slug: p.slug }} className="group bg-card border rounded-2xl overflow-hidden block h-full">
              <div className="aspect-[16/10] overflow-hidden bg-muted">
                {p.coverImage ? (
                  <img src={p.coverImage} alt={p.title} className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500" />
                ) : (
                  <div className="h-full w-full grid place-items-center text-muted-foreground"><ChefHat className="h-10 w-10 opacity-40" /></div>
                )}
              </div>
              <div className="p-4">
                <h3 className="font-bold group-hover:text-primary line-clamp-2">{p.title}</h3>
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{p.excerpt}</p>
              </div>
            </Link>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

function BlogSection({ h, posts }: { h: Homepage; posts: BlogPost[] }) {
  return (
    <section className="container-x py-8">
      <Reveal>
        <SectionHead eyebrow={h.blogEyebrow} title={h.blogTitle} cta={{ href: "/blog", label: "Read the blog" }} />
      </Reveal>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {posts.slice(0, 3).map((p, i) => (
          <Reveal key={p.id} delay={i * 80}>
            <Link to="/blog/$slug" params={{ slug: p.slug }} className="group bg-card border rounded-2xl overflow-hidden block h-full">
              {p.coverImage && (
                <div className="aspect-[16/9] overflow-hidden bg-muted">
                  <img src={p.coverImage} alt={p.title} className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500" />
                </div>
              )}
              <div className="p-4">
                {p.category && <span className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-brand)]">{p.category}</span>}
                <h3 className="font-bold group-hover:text-primary line-clamp-2 mt-1">{p.title}</h3>
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{p.excerpt}</p>
              </div>
            </Link>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

function SectionHead({ eyebrow, title, cta }: { eyebrow: string; title: string; cta?: { href: string; label: string } }) {
  return (
    <div className="flex items-end justify-between mb-6">
      <div>
        <p className="text-xs font-semibold text-[var(--color-brand)] uppercase tracking-wider">{eyebrow}</p>
        <h2 className="text-2xl md:text-3xl font-bold mt-1">{title}</h2>
      </div>
      {cta && <Link to={cta.href as "/shop"} className="text-sm font-semibold text-primary hover:underline">{cta.label} →</Link>}
    </div>
  );
}
