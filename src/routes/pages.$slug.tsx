import { createFileRoute, notFound } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site/SiteLayout";
import { getPage } from "@/lib/catalog.functions";
import { sanitizeHtml } from "@/lib/sanitize-html";

export const Route = createFileRoute("/pages/$slug")({
  loader: async ({ params }) => {
    const page = await getPage({ data: { slug: params.slug } });
    if (!page) throw notFound();
    return { page };
  },
  head: ({ loaderData }) => {
    const p = loaderData?.page;
    if (!p) return { meta: [{ title: "Page — Banglarfish" }] };
    return {
      meta: [
        { title: `${p.metaTitle || p.title} — Banglarfish` },
        { name: "description", content: p.metaDescription || "" },
        ...(p.noindex ? [{ name: "robots", content: "noindex" }] : []),
        { property: "og:title", content: p.metaTitle || p.title },
        ...(p.ogImage ? [{ property: "og:image", content: p.ogImage }] : []),
      ],
    };
  },
  component: Page,
});

// Content is authored HTML (rich editor). Rendered plain-text falls back gracefully.
function looksLikeHtml(s: string) {
  return /<\/?[a-z][\s\S]*>/i.test(s);
}

function Page() {
  const { page } = Route.useLoaderData();
  return (
    <SiteLayout>
      <div className="container-x py-14 max-w-3xl">
        <h1 className="text-4xl font-bold break-words">{page.title}</h1>
        {looksLikeHtml(page.body) ? (
          <div className="prose-content mt-6 text-foreground" dangerouslySetInnerHTML={{ __html: sanitizeHtml(page.body) }} />
        ) : (
          <div className="mt-6 text-muted-foreground leading-relaxed text-lg whitespace-pre-line">{page.body}</div>
        )}
      </div>
    </SiteLayout>
  );
}
