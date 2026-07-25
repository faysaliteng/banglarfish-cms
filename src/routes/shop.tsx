import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site/SiteLayout";
import { ProductCard } from "@/components/site/ProductCard";
import { listProducts, listCategories } from "@/lib/catalog.functions";
import { useState, useMemo } from "react";

export const Route = createFileRoute("/shop")({
  validateSearch: (s: Record<string, unknown>): { q?: string } => {
    const q = typeof s.q === "string" && s.q ? s.q : undefined;
    return q ? { q } : {};
  },
  loader: async () => {
    const [{ items }, categories] = await Promise.all([listProducts({ data: {} }), listCategories()]);
    return { items, categories };
  },
  head: () => ({
    meta: [
      { title: "Shop All Fish & Seafood — Banglarfish" },
      { name: "description", content: "Browse the full Banglarfish catalog: hilsa, rohu, katla, prawn, tuna, dried fish, and more. Fresh, cleaned, delivered." },
    ],
  }),
  component: Shop,
});

function Shop() {
  const { items, categories } = Route.useLoaderData();
  const { q } = Route.useSearch();
  const [selectedCat, setSelectedCat] = useState<string | null>(null);
  const [sort, setSort] = useState("featured");
  const [maxPrice, setMaxPrice] = useState(2500);
  const [term, setTerm] = useState(q ?? "");

  const filtered = useMemo(() => {
    let list = [...items];
    if (term.trim()) {
      const t = term.trim().toLowerCase();
      list = list.filter((p) => `${p.name} ${p.bn} ${p.slug}`.toLowerCase().includes(t));
    }
    if (selectedCat) list = list.filter((p) => p.category === selectedCat);
    list = list.filter((p) => p.price <= maxPrice);
    if (sort === "price-asc") list.sort((a, b) => a.price - b.price);
    else if (sort === "price-desc") list.sort((a, b) => b.price - a.price);
    else if (sort === "rating") list.sort((a, b) => b.rating - a.rating);
    return list;
  }, [items, term, selectedCat, sort, maxPrice]);

  return (
    <SiteLayout>
      <div className="bg-muted/40 border-b">
        <div className="container-x py-8">
          <h1 className="text-3xl font-bold break-words">{term ? `Search: "${term}"` : "Shop All"}</h1>
          <p className="text-sm text-muted-foreground mt-1">{filtered.length} products</p>
        </div>
      </div>
      <div className="container-x py-8 grid md:grid-cols-[240px_1fr] gap-8">
        <aside className="space-y-6">
          <div>
            <h3 className="font-semibold mb-3">Search</h3>
            <input
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder="Search products..."
              aria-label="Filter products"
              className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div>
            <h3 className="font-semibold mb-3">Categories</h3>
            <ul className="space-y-1 text-sm">
              <li>
                <button onClick={() => setSelectedCat(null)} className={`w-full text-left px-2 py-1.5 rounded ${!selectedCat ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted"}`}>All</button>
              </li>
              {categories.map((c) => (
                <li key={c.slug}>
                  <button onClick={() => setSelectedCat(c.slug)} className={`w-full text-left px-2 py-1.5 rounded ${selectedCat === c.slug ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted"}`}>{c.name}</button>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="font-semibold mb-3">Max price: ৳{maxPrice}</h3>
            <input type="range" min={100} max={2500} step={50} value={maxPrice} onChange={(e) => setMaxPrice(Number(e.target.value))} className="w-full" aria-label="Maximum price" />
          </div>
        </aside>
        <div>
          <div className="flex justify-end mb-4">
            <select value={sort} onChange={(e) => setSort(e.target.value)} className="border rounded-md px-3 py-2 text-sm bg-card" aria-label="Sort products">
              <option value="featured">Featured</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
              <option value="rating">Top Rated</option>
            </select>
          </div>
          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground py-12 text-center">No products match your filters.</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {filtered.map((p) => <ProductCard key={p.id} product={p} />)}
            </div>
          )}
        </div>
      </div>
    </SiteLayout>
  );
}
