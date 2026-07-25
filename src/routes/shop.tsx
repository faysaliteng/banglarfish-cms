import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site/SiteLayout";
import { ProductCard } from "@/components/site/ProductCard";
import { listProducts, listCategories } from "@/lib/catalog.functions";
import { formatBDT } from "@/lib/cart";
import { useMemo, useState } from "react";
import { SlidersHorizontal, X, Star, Search as SearchIcon } from "lucide-react";
import type { Product } from "@/lib/types";

export const Route = createFileRoute("/shop")({
  validateSearch: (s: Record<string, unknown>): { q?: string; category?: string } => ({
    q: typeof s.q === "string" && s.q ? s.q : undefined,
    category: typeof s.category === "string" && s.category ? s.category : undefined,
  }),
  loader: async () => {
    const [{ items }, categories] = await Promise.all([listProducts({ data: {} }), listCategories()]);
    return { items, categories };
  },
  head: () => ({
    meta: [
      { title: "Shop — Banglarfish" },
      { name: "description", content: "Browse the full catalog with filters for category, price, brand, rating and availability." },
    ],
  }),
  component: Shop,
});

const PAGE = 12;

function Shop() {
  const { items, categories } = Route.useLoaderData();
  const { q, category } = Route.useSearch();

  const priceBounds = useMemo(() => {
    const ps = items.map((p) => p.price);
    return { min: 0, max: Math.max(100, ...ps) };
  }, [items]);
  const brands = useMemo(() => [...new Set(items.map((p) => p.brand).filter((b): b is string => !!b))].sort(), [items]);

  const [term, setTerm] = useState(q ?? "");
  const [selectedCat, setSelectedCat] = useState<string | null>(category ?? null);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [minPrice, setMinPrice] = useState(priceBounds.min);
  const [maxPrice, setMaxPrice] = useState(priceBounds.max);
  const [minRating, setMinRating] = useState(0);
  const [inStock, setInStock] = useState(false);
  const [onSale, setOnSale] = useState(false);
  const [sort, setSort] = useState("featured");
  const [page, setPage] = useState(1);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const filtered = useMemo(() => {
    let list = items.filter((p) => {
      if (term.trim() && !`${p.name} ${p.bn} ${p.slug} ${p.brand ?? ""} ${p.tags.join(" ")}`.toLowerCase().includes(term.trim().toLowerCase())) return false;
      if (selectedCat && p.category !== selectedCat) return false;
      if (selectedBrands.length && !(p.brand && selectedBrands.includes(p.brand))) return false;
      if (p.price < minPrice || p.price > maxPrice) return false;
      if (minRating && p.rating < minRating) return false;
      if (inStock && p.stock <= 0) return false;
      if (onSale && !(p.compareAt && p.compareAt > p.price)) return false;
      return true;
    });
    if (sort === "price-asc") list = [...list].sort((a, b) => a.price - b.price);
    else if (sort === "price-desc") list = [...list].sort((a, b) => b.price - a.price);
    else if (sort === "rating") list = [...list].sort((a, b) => b.rating - a.rating);
    else if (sort === "newest") list = [...list].sort((a, b) => Number(!!b.isNew) - Number(!!a.isNew));
    return list;
  }, [items, term, selectedCat, selectedBrands, minPrice, maxPrice, minRating, inStock, onSale, sort]);

  const shown = filtered.slice(0, page * PAGE);

  const activeChips: { label: string; clear: () => void }[] = [];
  if (selectedCat) activeChips.push({ label: categories.find((c) => c.slug === selectedCat)?.name ?? selectedCat, clear: () => setSelectedCat(null) });
  selectedBrands.forEach((b) => activeChips.push({ label: b, clear: () => setSelectedBrands((s) => s.filter((x) => x !== b)) }));
  if (minRating) activeChips.push({ label: `${minRating}★ & up`, clear: () => setMinRating(0) });
  if (inStock) activeChips.push({ label: "In stock", clear: () => setInStock(false) });
  if (onSale) activeChips.push({ label: "On sale", clear: () => setOnSale(false) });
  if (minPrice > priceBounds.min || maxPrice < priceBounds.max) activeChips.push({ label: `${formatBDT(minPrice)}–${formatBDT(maxPrice)}`, clear: () => { setMinPrice(priceBounds.min); setMaxPrice(priceBounds.max); } });

  const resetAll = () => { setSelectedCat(null); setSelectedBrands([]); setMinRating(0); setInStock(false); setOnSale(false); setMinPrice(priceBounds.min); setMaxPrice(priceBounds.max); setTerm(""); };
  const toggleBrand = (b: string) => setSelectedBrands((s) => (s.includes(b) ? s.filter((x) => x !== b) : [...s, b]));

  const Filters = (
    <div className="space-y-6">
      <div>
        <h3 className="font-semibold mb-2 text-sm">Search</h3>
        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input value={term} onChange={(e) => { setTerm(e.target.value); setPage(1); }} placeholder="Search products…" className="w-full border rounded-md pl-9 pr-3 py-2 text-sm" />
        </div>
      </div>
      <FilterGroup title="Category">
        <ul className="space-y-1 text-sm">
          <li><button onClick={() => { setSelectedCat(null); setPage(1); }} className={`w-full text-left px-2 py-1.5 rounded ${!selectedCat ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted"}`}>All products</button></li>
          {categories.map((c) => (
            <li key={c.slug}><button onClick={() => { setSelectedCat(c.slug); setPage(1); }} className={`w-full text-left px-2 py-1.5 rounded ${selectedCat === c.slug ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted"}`}>{c.name}</button></li>
          ))}
        </ul>
      </FilterGroup>
      <FilterGroup title="Price">
        <div className="flex items-center gap-2">
          <input type="number" value={minPrice} min={priceBounds.min} max={maxPrice} onChange={(e) => { setMinPrice(Number(e.target.value)); setPage(1); }} className="w-full border rounded-md px-2 py-1.5 text-sm" aria-label="Min price" />
          <span className="text-muted-foreground">–</span>
          <input type="number" value={maxPrice} min={minPrice} max={priceBounds.max} onChange={(e) => { setMaxPrice(Number(e.target.value)); setPage(1); }} className="w-full border rounded-md px-2 py-1.5 text-sm" aria-label="Max price" />
        </div>
        <input type="range" min={priceBounds.min} max={priceBounds.max} value={maxPrice} onChange={(e) => { setMaxPrice(Number(e.target.value)); setPage(1); }} className="w-full mt-3 accent-[var(--color-primary)]" aria-label="Max price slider" />
      </FilterGroup>
      {brands.length > 0 && (
        <FilterGroup title="Brand">
          <ul className="space-y-1.5 text-sm max-h-48 overflow-y-auto">
            {brands.map((b) => (
              <li key={b}><label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={selectedBrands.includes(b)} onChange={() => { toggleBrand(b); setPage(1); }} /> {b}</label></li>
            ))}
          </ul>
        </FilterGroup>
      )}
      <FilterGroup title="Rating">
        <ul className="space-y-1 text-sm">
          {[4, 3, 2].map((r) => (
            <li key={r}><button onClick={() => { setMinRating(minRating === r ? 0 : r); setPage(1); }} className={`w-full flex items-center gap-1.5 px-2 py-1.5 rounded ${minRating === r ? "bg-primary/10 text-primary" : "hover:bg-muted"}`}>
              <span className="flex text-yellow-400">{Array.from({ length: 5 }).map((_, i) => <Star key={i} className={`h-3.5 w-3.5 ${i < r ? "fill-yellow-400" : ""}`} />)}</span> & up
            </button></li>
          ))}
        </ul>
      </FilterGroup>
      <FilterGroup title="Availability">
        <label className="flex items-center gap-2 text-sm cursor-pointer mb-1.5"><input type="checkbox" checked={inStock} onChange={(e) => { setInStock(e.target.checked); setPage(1); }} /> In stock only</label>
        <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" checked={onSale} onChange={(e) => { setOnSale(e.target.checked); setPage(1); }} /> On sale</label>
      </FilterGroup>
    </div>
  );

  return (
    <SiteLayout>
      <div className="bg-muted/40 border-b">
        <div className="container-x py-8">
          <h1 className="text-3xl font-bold break-words">{term ? `Search: "${term}"` : selectedCat ? categories.find((c) => c.slug === selectedCat)?.name ?? "Shop" : "Shop All"}</h1>
          <p className="text-sm text-muted-foreground mt-1">{filtered.length} product{filtered.length === 1 ? "" : "s"}</p>
        </div>
      </div>
      <div className="container-x py-8 grid lg:grid-cols-[260px_1fr] gap-8">
        <aside className="hidden lg:block">{Filters}</aside>

        <div>
          <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
            <button onClick={() => setFiltersOpen(true)} className="lg:hidden inline-flex items-center gap-2 border rounded-md px-3 py-2 text-sm font-medium"><SlidersHorizontal className="h-4 w-4" /> Filters</button>
            <span className="text-sm text-muted-foreground hidden sm:block">Showing {shown.length} of {filtered.length}</span>
            <select value={sort} onChange={(e) => setSort(e.target.value)} className="border rounded-md px-3 py-2 text-sm bg-card ml-auto" aria-label="Sort products">
              <option value="featured">Featured</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
              <option value="rating">Top Rated</option>
              <option value="newest">Newest</option>
            </select>
          </div>

          {activeChips.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 mb-4">
              {activeChips.map((c, i) => (
                <button key={i} onClick={c.clear} className="inline-flex items-center gap-1 text-xs bg-primary/10 text-primary rounded-full pl-3 pr-2 py-1">{c.label} <X className="h-3 w-3" /></button>
              ))}
              <button onClick={resetAll} className="text-xs text-muted-foreground hover:text-primary underline">Clear all</button>
            </div>
          )}

          {shown.length === 0 ? (
            <div className="border rounded-2xl py-16 text-center text-muted-foreground">No products match your filters. <button onClick={resetAll} className="text-primary underline">Reset</button></div>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {shown.map((p: Product) => <ProductCard key={p.id} product={p} />)}
              </div>
              {shown.length < filtered.length && (
                <div className="text-center mt-8"><button onClick={() => setPage((p) => p + 1)} className="border rounded-full px-6 py-2.5 text-sm font-semibold hover:bg-muted">Load more ({filtered.length - shown.length} left)</button></div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Mobile filter drawer */}
      {filtersOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="w-80 max-w-[85%] bg-background overflow-y-auto p-5">
            <div className="flex items-center justify-between mb-4"><h2 className="font-bold">Filters</h2><button onClick={() => setFiltersOpen(false)} aria-label="Close"><X className="h-5 w-5" /></button></div>
            {Filters}
            <button onClick={() => setFiltersOpen(false)} className="w-full mt-6 bg-primary text-primary-foreground py-2.5 rounded-md font-semibold">Show {filtered.length} results</button>
          </div>
          <div className="flex-1 bg-black/50" onClick={() => setFiltersOpen(false)} />
        </div>
      )}
    </SiteLayout>
  );
}

function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="font-semibold mb-2 text-sm">{title}</h3>
      {children}
    </div>
  );
}
