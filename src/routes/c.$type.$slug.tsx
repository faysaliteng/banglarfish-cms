import { createFileRoute, notFound } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site/SiteLayout";
import { getEntryPublic } from "@/lib/content-types.functions";
import { sanitizeHtml } from "@/lib/sanitize-html";

export const Route = createFileRoute("/c/$type/$slug")({
  loader: async ({ params }) => {
    const res = await getEntryPublic({ data: { typeSlug: params.type, slug: params.slug } });
    if (!res) throw notFound();
    return res;
  },
  head: ({ loaderData }) => {
    const e = loaderData?.entry;
    if (!e) return { meta: [{ title: "Not found" }] };
    return { meta: [{ title: `${e.metaTitle || e.title} — Banglarfish` }, ...(e.metaDescription ? [{ name: "description", content: e.metaDescription }] : [])] };
  },
  component: EntryPage,
});

function isHtml(s: string) { return /<\/?[a-z][\s\S]*>/i.test(s); }

function EntryPage() {
  const { type, entry } = Route.useLoaderData();
  return (
    <SiteLayout>
      <article className="container-x py-10 max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-brand)]">{type.name}</p>
        <h1 className="text-3xl md:text-4xl font-bold mt-1 break-words">{entry.title}</h1>
        <div className="mt-6 space-y-5">
          {type.fields.map((f) => {
            const v = entry.data[f.key];
            if (v === undefined || v === null || v === "") return null;
            if (f.type === "richtext") return <div key={f.key} className="prose-content">{isHtml(String(v)) ? <span dangerouslySetInnerHTML={{ __html: sanitizeHtml(String(v)) }} /> : <p className="whitespace-pre-line">{String(v)}</p>}</div>;
            if (f.type === "media") return <img key={f.key} src={String(v)} alt={f.label} className="w-full rounded-2xl object-cover max-h-[420px]" />;
            if (f.type === "boolean") return <p key={f.key}><strong>{f.label}:</strong> {v ? "Yes" : "No"}</p>;
            if (f.type === "url") return <p key={f.key}><strong>{f.label}:</strong> <a href={String(v)} className="text-primary underline" target="_blank" rel="noreferrer">{String(v)}</a></p>;
            if (f.key === "body") return <div key={f.key} className="prose-content whitespace-pre-line">{String(v)}</div>;
            return <p key={f.key}><strong>{f.label}:</strong> {String(v)}</p>;
          })}
        </div>
      </article>
    </SiteLayout>
  );
}
