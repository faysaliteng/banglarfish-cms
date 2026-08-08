import { renderTitle } from "@/lib/seo-title";
import { getSeo } from "@/lib/site.functions";
import { createFileRoute, notFound } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site/SiteLayout";
import { ProductCard } from "@/components/site/ProductCard";
import { listProducts, listCategories } from "@/lib/catalog.functions";
import { Img } from "@/components/site/Img";

export const Route = createFileRoute("/category/$slug")({
  loader: async ({ params }) => {
    const [categories, { items }] = await Promise.all([
      listCategories(),
      listProducts({ data: { category: params.slug } }),
    ]);
    const cat = categories.find((c) => c.slug === params.slug);
    if (!cat) throw notFound();
    const siteUrl = typeof process !== "undefined" ? (process.env.APP_URL || "").replace(/\/+$/, "") : "";
    const seo = await getSeo().catch(() => null);
    return { cat, items, siteUrl, seo };
  },
  head: ({ loaderData }) => {
    if (!loaderData) return { meta: [{ title: "Category not found" }, { name: "robots", content: "noindex" }] };
    const canonical = (loaderData.siteUrl || "") ? `${loaderData.siteUrl}/category/${loaderData.cat.slug}` : `/category/${loaderData.cat.slug}`;
    return {
      meta: [
        { title: renderTitle(loaderData.seo?.categoryTitleTemplate || loaderData.seo?.titleTemplate, loaderData.cat.name, loaderData.seo?.siteName || "Banglarfish") },
        { name: "description", content: `Fresh ${loaderData.cat.name} delivered to your door. Cleaned, iced, and dispatched same day.` },
        { property: "og:title", content: `${loaderData.cat.name} — Banglarfish` },
        { property: "og:url", content: canonical },
      ],
      links: [{ rel: "canonical", href: canonical }],
    };
  },
  component: CategoryPage,
});

function CategoryPage() {
  const { cat, items } = Route.useLoaderData();
  return (
    <SiteLayout>
      <div className="relative h-56 md:h-72 overflow-hidden">
        <Img src={cat.image} alt={cat.name} sizes="100vw" widths={[800, 1600]} priority className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 to-black/30" />
        <div className="container-x relative h-full flex flex-col justify-center text-white">
          <p className="text-sm opacity-90" style={{ fontFamily: "var(--font-bangla)" }}>{cat.bn}</p>
          <h1 className="text-4xl md:text-5xl font-bold break-words">{cat.name}</h1>
          <p className="text-sm mt-2 opacity-90">{items.length} products</p>
        </div>
      </div>
      {items.length === 0 ? (
        <div className="container-x py-16 text-center text-muted-foreground">No products in this category yet.</div>
      ) : (
        <div className="container-x py-8 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {items.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      )}
    </SiteLayout>
  );
}
