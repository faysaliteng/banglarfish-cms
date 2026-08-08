import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site/SiteLayout";
import { listBlog } from "@/lib/catalog.functions";
import { X } from "lucide-react";

type BlogSearch = { category?: string; tag?: string };

export const Route = createFileRoute("/blog/")({
  validateSearch: (s: Record<string, unknown>): BlogSearch => ({
    category: typeof s.category === "string" && s.category ? s.category : undefined,
    tag: typeof s.tag === "string" && s.tag ? s.tag : undefined,
  }),
  loader: async () => ({ posts: await listBlog() }),
  head: () => ({
    meta: [
      { title: "Blog — Banglarfish" },
      { name: "description", content: "Recipes, sourcing stories, and fish-buying guides from Banglarfish." },
    ],
  }),
  component: BlogList,
});

function BlogList() {
  const { posts } = Route.useLoaderData();
  const { category, tag } = Route.useSearch();

  const filtered = posts.filter((p) => {
    if (category && p.category.toLowerCase() !== category.toLowerCase()) return false;
    if (tag && !p.tags.some((t) => t.toLowerCase() === tag.toLowerCase())) return false;
    return true;
  });

  const categories = Array.from(new Set(posts.map((p) => p.category).filter(Boolean)));
  const activeLabel = category ? `Category: ${category}` : tag ? `Tag: #${tag}` : null;

  return (
    <SiteLayout>
      <div className="container-x py-10">
        <h1 className="text-3xl font-bold mb-1">Blog</h1>
        <p className="text-sm text-muted-foreground mb-5">Recipes, guides &amp; stories from the Banglarfish kitchen.</p>

        {categories.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 mb-6">
            <Link to="/blog" className={`text-sm px-3 py-1.5 rounded-full border transition ${!category && !tag ? "bg-primary text-primary-foreground border-primary" : "hover:bg-muted"}`}>All</Link>
            {categories.map((c) => (
              <Link key={c} to="/blog" search={{ category: c }} className={`text-sm px-3 py-1.5 rounded-full border transition ${category?.toLowerCase() === c.toLowerCase() ? "bg-primary text-primary-foreground border-primary" : "hover:bg-muted"}`}>{c}</Link>
            ))}
          </div>
        )}

        {activeLabel && (
          <div className="mb-6 flex items-center gap-2 text-sm">
            <span className="font-semibold">{activeLabel}</span>
            <Link to="/blog" className="inline-flex items-center gap-1 text-muted-foreground hover:text-primary"><X className="h-3.5 w-3.5" /> clear</Link>
            <span className="text-muted-foreground">· {filtered.length} post{filtered.length === 1 ? "" : "s"}</span>
          </div>
        )}

        {filtered.length === 0 ? (
          <p className="text-muted-foreground py-12 text-center">{activeLabel ? "No posts match this filter." : "No posts yet — check back soon."}</p>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((p) => (
              <Link key={p.id} to="/blog/$slug" params={{ slug: p.slug }} className="group bg-card border rounded-2xl overflow-hidden hover:shadow-lg transition">
                {p.coverImage && (
                  <div className="aspect-[16/9] overflow-hidden bg-muted">
                    <img src={p.coverImage} alt={p.title} className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  </div>
                )}
                <div className="p-4">
                  {p.category && <span className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-brand)]">{p.category}</span>}
                  <h2 className="font-bold leading-snug mt-1 group-hover:text-primary line-clamp-2">{p.title}</h2>
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{p.excerpt}</p>
                  <p className="text-xs text-muted-foreground mt-3">{p.author}{p.publishedAt ? ` · ${new Date(p.publishedAt).toLocaleDateString()}` : ""}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </SiteLayout>
  );
}
