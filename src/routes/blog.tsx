import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site/SiteLayout";
import { listBlog } from "@/lib/catalog.functions";

export const Route = createFileRoute("/blog")({
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
  return (
    <SiteLayout>
      <div className="container-x py-10">
        <h1 className="text-3xl font-bold mb-1">Blog</h1>
        <p className="text-sm text-muted-foreground mb-8">Recipes, guides & stories from the Banglarfish kitchen.</p>
        {posts.length === 0 ? (
          <p className="text-muted-foreground py-12 text-center">No posts yet — check back soon.</p>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {posts.map((p) => (
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
