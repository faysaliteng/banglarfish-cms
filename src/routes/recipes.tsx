import { createFileRoute, Link } from "@tanstack/react-router";
import { Img } from "@/components/site/Img";
import { SiteLayout } from "@/components/site/SiteLayout";
import { listRecipes } from "@/lib/catalog.functions";
import { ChefHat, Clock } from "lucide-react";

export const Route = createFileRoute("/recipes")({
  loader: async () => ({ recipes: await listRecipes() }),
  head: () => ({
    meta: [
      { title: "Fish Recipes — Banglarfish" },
      { name: "description", content: "Easy, authentic Bangladeshi fish recipes — hilsa, rohu, prawn, and more, from the Banglarfish kitchen." },
    ],
  }),
  component: RecipesList,
});

function RecipesList() {
  const { recipes } = Route.useLoaderData();
  return (
    <SiteLayout>
      <div className="container-x py-10">
        <div className="flex items-center gap-2 text-[var(--color-brand)] mb-1">
          <ChefHat className="h-5 w-5" />
          <span className="text-xs font-semibold uppercase tracking-wide">From our kitchen</span>
        </div>
        <h1 className="text-3xl font-bold mb-1">Fish Recipes</h1>
        <p className="text-sm text-muted-foreground mb-8">Simple, authentic ways to cook the fish you love.</p>
        {recipes.length === 0 ? (
          <p className="text-muted-foreground py-12 text-center">No recipes yet — check back soon.</p>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {recipes.map((p) => (
              <Link key={p.id} to="/blog/$slug" params={{ slug: p.slug }} className="group bg-card border rounded-2xl overflow-hidden hover:shadow-xl transition">
                <div className="aspect-[16/10] overflow-hidden bg-muted">
                  {p.coverImage ? (
                    <Img src={p.coverImage} alt={p.title} width={600} height={400} sizes="(max-width: 768px) 100vw, 33vw" widths={[300, 600]} className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  ) : (
                    <div className="h-full w-full grid place-items-center text-muted-foreground"><ChefHat className="h-10 w-10 opacity-40" /></div>
                  )}
                </div>
                <div className="p-4">
                  <h2 className="font-bold leading-snug group-hover:text-primary line-clamp-2">{p.title}</h2>
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{p.excerpt}</p>
                  {p.tags.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {p.tags.slice(0, 3).map((t) => (
                        <span key={t} className="inline-flex items-center gap-1 text-[11px] bg-muted rounded-full px-2 py-0.5"><Clock className="h-3 w-3" /> {t}</span>
                      ))}
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </SiteLayout>
  );
}
