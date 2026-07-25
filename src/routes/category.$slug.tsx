import { createFileRoute, notFound } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site/SiteLayout";
import { ProductCard } from "@/components/site/ProductCard";
import { listProducts, listCategories } from "@/lib/catalog.functions";

export const Route = createFileRoute("/category/$slug")({
  loader: async ({ params }) => {
    const [categories, { items }] = await Promise.all([
      listCategories(),
      listProducts({ data: { category: params.slug } }),
    ]);
    const cat = categories.find((c) => c.slug === params.slug);
    if (!cat) throw notFound();
    return { cat, items };
  },
  head: ({ loaderData }) => {
    if (!loaderData) return { meta: [{ title: "Category not found" }, { name: "robots", content: "noindex" }] };
    return {
      meta: [
        { title: `${loaderData.cat.name} — Banglarfish` },
        { name: "description", content: `Fresh ${loaderData.cat.name} delivered to your door. Cleaned, iced, and dispatched same day.` },
      ],
    };
  },
  component: CategoryPage,
});

function CategoryPage() {
  const { cat, items } = Route.useLoaderData();
  return (
    <SiteLayout>
      <div className="relative h-56 md:h-72 overflow-hidden">
        <img src={cat.image} alt={cat.name} className="absolute inset-0 h-full w-full object-cover" />
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
