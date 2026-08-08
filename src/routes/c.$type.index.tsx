import { createFileRoute, notFound, Link } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site/SiteLayout";
import { listEntriesPublic } from "@/lib/content-types.functions";

export const Route = createFileRoute("/c/$type/")({
  loader: async ({ params }) => {
    const res = await listEntriesPublic({ data: { typeSlug: params.type } });
    if (!res.type) throw notFound();
    return res;
  },
  head: ({ loaderData }) => ({ meta: [{ title: `${loaderData?.type?.namePlural ?? "Content"} — Banglarfish` }] }),
  component: EntryList,
});

function EntryList() {
  const { type, entries } = Route.useLoaderData();
  const { type: typeSlug } = Route.useParams();
  return (
    <SiteLayout>
      <div className="container-x py-10">
        <h1 className="text-3xl font-bold mb-6">{type?.namePlural}</h1>
        {entries.length === 0 ? (
          <p className="text-muted-foreground py-12 text-center">Nothing published yet.</p>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {entries.map((e) => {
              const img = (e.data.image || e.data.coverImage || e.data.photo) as string | undefined;
              return (
                <Link key={e.id} to="/c/$type/$slug" params={{ type: typeSlug, slug: e.slug }} className="group bg-card border rounded-2xl overflow-hidden hover:shadow-lg transition">
                  {img && <div className="aspect-[16/9] overflow-hidden bg-muted"><img src={img} alt={e.title} className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500" /></div>}
                  <div className="p-4"><h2 className="font-bold leading-snug group-hover:text-primary line-clamp-2">{e.title}</h2></div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </SiteLayout>
  );
}
