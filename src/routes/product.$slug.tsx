import { renderTitle } from "@/lib/seo-title";
import { getSeo } from "@/lib/site.functions";
import { createFileRoute, notFound, Link } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site/SiteLayout";
import { ProductCard } from "@/components/site/ProductCard";
import { getProductBySlug } from "@/lib/catalog.functions";
import { cart, formatBDT, getCurrency } from "@/lib/cart";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { submitReview } from "@/lib/catalog.functions";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";
import { Star, ShoppingBag, Truck, ShieldCheck, Snowflake, Minus, Plus } from "lucide-react";
import type { Variant } from "@/lib/types";
import { sanitizeHtml } from "@/lib/sanitize-html";
import { Img } from "@/components/site/Img";

function stripHtml(s: string) {
  return s.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}
function looksLikeHtml(s: string) {
  return /<\/?[a-z][\s\S]*>/i.test(s);
}

export const Route = createFileRoute("/product/$slug")({
  loader: async ({ params }) => {
    const data = await getProductBySlug({ data: { slug: params.slug } });
    if (!data) throw notFound();
    const siteUrl = typeof process !== "undefined" ? (process.env.APP_URL || "").replace(/\/+$/, "") : "";
    const seo = await getSeo().catch(() => null);
    return { ...data, siteUrl, seo };
  },
  head: ({ loaderData }) => {
    if (!loaderData) return { meta: [{ title: "Product not found" }, { name: "robots", content: "noindex" }] };
    const p = loaderData.product;
    const base = (loaderData.siteUrl || "").replace(/\/+$/, "");
    const canonical = base ? `${base}/product/${p.slug}` : `/product/${p.slug}`;
    const ogImage = p.image ? (/^https?:\/\//i.test(p.image) ? p.image : base + p.image) : undefined;
    const desc = stripHtml(p.description).slice(0, 155);
    const seo = loaderData.seo;
    const title = renderTitle(seo?.productTitleTemplate || seo?.titleTemplate, p.metaTitle || p.name, seo?.siteName || "Banglarfish");
    return {
      meta: [
        { title },
        { name: "description", content: p.metaDescription || desc },
        { property: "og:title", content: title },
        { property: "og:description", content: p.metaDescription || desc },
        { property: "og:type", content: "product" },
        { property: "og:url", content: canonical },
        ...(ogImage ? [{ property: "og:image", content: ogImage }] : []),
        { name: "twitter:card", content: ogImage ? "summary_large_image" : "summary" },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: p.metaDescription || desc },
        ...(ogImage ? [{ name: "twitter:image", content: ogImage }] : []),
        ...(p.noindex ? [{ name: "robots", content: "noindex, follow" }] : []),
      ],
      links: [{ rel: "canonical", href: canonical }],
    };
  },
  component: ProductPage,
});

function ProductPage() {
  const { product, related, reviews, siteUrl } = Route.useLoaderData();
  const hasVariants = product.variants.length > 0;
  const [variant, setVariant] = useState<Variant | null>(product.variants[1] ?? product.variants[0] ?? null);
  const [weightLabel, setWeightLabel] = useState(product.weightOptions[1] ?? product.weightOptions[0] ?? "");
  const [qty, setQty] = useState(1);
  const { t } = useI18n();
  const [tab, setTab] = useState<"desc" | "shipping" | "reviews">("desc");
  const [added, setAdded] = useState(false);

  const unitPrice = variant?.price ?? product.price;

  function addToCart() {
    cart.add({
      productId: product.id,
      variantId: variant?.id ?? null,
      slug: product.slug,
      name: product.name,
      image: product.image,
      price: unitPrice,
      weight: variant?.label ?? weightLabel,
      qty,
      isDigital: !!product.isDigital,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  }

  return (
    <SiteLayout>
      <div className="container-x py-4 text-sm text-muted-foreground">
        <Link to="/" className="hover:text-primary">Home</Link> / <Link to="/shop" className="hover:text-primary">Shop</Link> / <span className="text-foreground">{product.name}</span>
      </div>
      <div className="container-x pb-10 grid md:grid-cols-2 gap-10">
        <div>
          <div className="aspect-square rounded-2xl overflow-hidden bg-muted border">
            <Img src={product.image} alt={product.name} width={800} height={800} widths={[600, 1000]} sizes="(max-width: 768px) 100vw, 50vw" priority className="h-full w-full object-cover" />
          </div>
        </div>
        <div>
          <p className="text-sm text-muted-foreground" style={{ fontFamily: "var(--font-bangla)" }}>{product.bn}</p>
          <h1 className="text-3xl md:text-4xl font-bold mt-1 break-words">{product.name}</h1>
          <div className="flex items-center gap-2 mt-2 text-sm">
            <div className="flex text-yellow-400" aria-label={`Rated ${product.rating} out of 5`}>
              {Array.from({ length: 5 }).map((_, i) => <Star key={i} className={`h-4 w-4 ${i < Math.floor(product.rating) ? "fill-yellow-400" : ""}`} />)}
            </div>
            <span className="font-medium">{product.rating}</span>
            <span className="text-muted-foreground">({product.reviews} reviews)</span>
          </div>
          <div className="mt-5 flex items-baseline gap-3">
            <span className="text-4xl font-bold text-[var(--color-brand)]">{formatBDT(unitPrice)}</span>
            {product.compareAt && <span className="text-lg text-muted-foreground line-through">{formatBDT(product.compareAt)}</span>}
            <span className="text-sm text-muted-foreground">{variant ? `/ ${variant.label}` : `/ ${product.unit}`}</span>
          </div>
          <p className="mt-4 text-muted-foreground leading-relaxed">{stripHtml(product.description).slice(0, 220)}</p>

          <div className="mt-6">
            <label className="text-sm font-semibold">Weight</label>
            <div className="mt-2 flex flex-wrap gap-2">
              {hasVariants
                ? product.variants.map((v) => (
                    <button
                      key={v.id}
                      onClick={() => setVariant(v)}
                      className={`px-4 py-2 rounded-md border text-sm font-medium ${variant?.id === v.id ? "border-primary bg-primary/10 text-primary" : "hover:border-foreground/30"}`}
                    >
                      {v.label} · {formatBDT(v.price)}
                    </button>
                  ))
                : product.weightOptions.map((w) => (
                    <button
                      key={w}
                      onClick={() => setWeightLabel(w)}
                      className={`px-4 py-2 rounded-md border text-sm font-medium ${weightLabel === w ? "border-primary bg-primary/10 text-primary" : "hover:border-foreground/30"}`}
                    >
                      {w}
                    </button>
                  ))}
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3 items-center">
            <div className="flex items-center border rounded-md">
              <button onClick={() => setQty(Math.max(1, qty - 1))} className="p-2.5 hover:bg-muted" aria-label="Decrease quantity"><Minus className="h-4 w-4" /></button>
              <span className="w-12 text-center font-semibold">{qty}</span>
              <button onClick={() => setQty(qty + 1)} className="p-2.5 hover:bg-muted" aria-label="Increase quantity"><Plus className="h-4 w-4" /></button>
            </div>
            <button onClick={addToCart} className="flex-1 min-w-[200px] inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-md font-semibold hover:bg-primary/90 transition">
              <ShoppingBag className="h-5 w-5" /> {added ? "Added ✓" : "Add to Cart"}
            </button>
          </div>

          <div className="mt-6 grid grid-cols-3 gap-3 pt-6 border-t">
            <Perk icon={<Truck className="h-5 w-5" />} label="Same-day delivery" />
            <Perk icon={<Snowflake className="h-5 w-5" />} label="Iced & fresh" />
            <Perk icon={<ShieldCheck className="h-5 w-5" />} label="Quality guarantee" />
          </div>
        </div>
      </div>

      <div className="container-x pb-14">
        <div className="border-b flex gap-6 text-sm font-semibold overflow-x-auto whitespace-nowrap">
          {(["desc", "shipping", "reviews"] as const).map((tb) => (
            <button key={tb} onClick={() => setTab(tb)} className={`py-3 border-b-2 -mb-px ${tab === tb ? "border-primary text-primary" : "border-transparent text-muted-foreground"}`}>
              {tb === "desc" ? t("product.description") : tb === "shipping" ? t("product.shipping") : `${t("product.reviews")} (${reviews.length})`}
            </button>
          ))}
        </div>
        <div className="py-6 text-sm text-muted-foreground leading-relaxed max-w-3xl">
          {tab === "desc" && (looksLikeHtml(product.description)
            ? <div className="prose-content text-foreground" dangerouslySetInnerHTML={{ __html: sanitizeHtml(product.description) }} />
            : <p>{product.description}</p>)}
          {tab === "shipping" && (
            <ul className="space-y-2 list-disc pl-5">
              <li>Order before 11 AM for same-day delivery in Dhaka.</li>
              <li>Chattogram and Sylhet: next-day delivery.</li>
              <li>Free delivery on orders over ৳2,000.</li>
              <li>All items are cleaned, iced, and shipped in insulated cold-chain packaging.</li>
            </ul>
          )}
          {tab === "reviews" && (
            <>
            <ReviewForm productId={product.id} />
            {reviews.length === 0 ? (
              <p>No reviews yet — be the first to review this product.</p>
            ) : (
              <ul className="space-y-4 mt-6">
                {reviews.map((r) => (
                  <li key={r.id} className="border rounded-lg p-4">
                    <div className="flex items-center gap-2">
                      <div className="flex text-yellow-400">
                        {Array.from({ length: 5 }).map((_, i) => <Star key={i} className={`h-3.5 w-3.5 ${i < r.rating ? "fill-yellow-400" : ""}`} />)}
                      </div>
                      <span className="font-medium text-foreground">{r.title}</span>
                    </div>
                    <p className="mt-1">{r.body}</p>
                    <p className="mt-1 text-xs">— {r.customer}</p>
                  </li>
                ))}
              </ul>
            )}
            </>
          )}
        </div>
      </div>

      {related.length > 0 && (
        <div className="container-x pb-14">
          <h3 className="text-2xl font-bold mb-6">You may also like</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {related.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        </div>
      )}

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Product",
            name: product.name,
            image: product.image,
            sku: product.sku || undefined,
            description: stripHtml(product.description).slice(0, 300),
            brand: product.brand ? { "@type": "Brand", name: product.brand } : undefined,
            offers: { "@type": "Offer", priceCurrency: getCurrency().code, price: getCurrency().decimals > 0 ? unitPrice / Math.pow(10, getCurrency().decimals) : unitPrice, availability: product.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock" },
            aggregateRating: product.reviews > 0 ? { "@type": "AggregateRating", ratingValue: product.rating, reviewCount: product.reviews } : undefined,
          }),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Home", item: siteUrl ? `${siteUrl}/` : undefined },
              { "@type": "ListItem", position: 2, name: "Shop", item: siteUrl ? `${siteUrl}/shop` : undefined },
              { "@type": "ListItem", position: 3, name: product.name, item: siteUrl ? `${siteUrl}/product/${product.slug}` : undefined },
            ],
          }),
        }}
      />
    </SiteLayout>
  );
}

function Perk({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex flex-col items-center text-center gap-1.5 text-xs">
      <div className="text-primary">{icon}</div>
      <span className="font-medium text-foreground">{label}</span>
    </div>
  );
}


// Customer review form. submitReview is guarded by requireUser server-side, so a
// signed-out visitor is told to sign in rather than silently failing.
function ReviewForm({ productId }: { productId: string }) {
  const send = useServerFn(submitReview);
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  if (done) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800 p-4 text-sm">
        Thanks for your review! It will appear here once it has been approved.
      </div>
    );
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await send({ data: { productId, rating, title: title.trim(), body: body.trim() } });
      setDone(true);
      toast.success("Review submitted for approval");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not submit your review";
      toast.error(/sign in|unauthor/i.test(msg) ? "Please sign in to write a review" : msg);
    } finally { setBusy(false); }
  }

  return (
    <form onSubmit={onSubmit} className="rounded-xl border p-4 bg-card">
      <p className="font-semibold text-foreground mb-3">Write a review</p>
      <div className="flex items-center gap-1 mb-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <button key={i} type="button" onClick={() => setRating(i + 1)} aria-label={`${i + 1} star${i ? "s" : ""}`} className="p-0.5">
            <Star className={`h-6 w-6 ${i < rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`} />
          </button>
        ))}
        <span className="ml-2 text-xs text-muted-foreground">{rating} / 5</span>
      </div>
      <input value={title} onChange={(e) => setTitle(e.target.value)} required minLength={2} maxLength={120} placeholder="Sum it up in a few words" className="w-full border rounded-md px-3 py-2 text-sm mb-2" />
      <textarea value={body} onChange={(e) => setBody(e.target.value)} required minLength={2} maxLength={2000} rows={4} placeholder="What did you think of it?" className="w-full border rounded-md px-3 py-2 text-sm" />
      <button disabled={busy} className="mt-3 bg-primary text-primary-foreground px-5 py-2 rounded-md text-sm font-semibold disabled:opacity-60">
        {busy ? "Submitting…" : "Submit review"}
      </button>
    </form>
  );
}
