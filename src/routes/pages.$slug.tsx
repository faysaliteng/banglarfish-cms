import { renderTitle } from "@/lib/seo-title";
import { getSeo } from "@/lib/site.functions";
import { createFileRoute, notFound } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site/SiteLayout";
import { getPage } from "@/lib/catalog.functions";
import { sanitizeHtml } from "@/lib/sanitize-html";

export const Route = createFileRoute("/pages/$slug")({
  loader: async ({ params }) => {
    const page = await getPage({ data: { slug: params.slug } });
    if (!page) throw notFound();
    const siteUrl = typeof process !== "undefined" ? (process.env.APP_URL || "").replace(/\/+$/, "") : "";
    const seo = await getSeo().catch(() => null);
    return { page, siteUrl, seo };
  },
  head: ({ loaderData }) => {
    const p = loaderData?.page;
    if (!p) return { meta: [{ title: "Page — Banglarfish" }] };
    const canonical = (loaderData?.siteUrl || "") ? `${loaderData.siteUrl}/pages/${p.slug}` : `/pages/${p.slug}`;
    return {
      meta: [
        { title: renderTitle(loaderData?.seo?.titleTemplate, p.metaTitle || p.title, loaderData?.seo?.siteName || "Banglarfish") },
        { name: "description", content: p.metaDescription || "" },
        ...(p.noindex ? [{ name: "robots", content: "noindex" }] : []),
        { property: "og:title", content: p.metaTitle || p.title },
        { property: "og:url", content: canonical },
        ...(p.ogImage ? [{ property: "og:image", content: p.ogImage }] : []),
      ],
      links: [{ rel: "canonical", href: canonical }],
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
  const faq = (page.faq ?? []).filter((f) => f?.q && f?.a);
  const faqLd = faq.length
    ? {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
      }
    : null;
  return (
    <SiteLayout>
      <div className="container-x py-14 max-w-3xl">
        <h1 className="text-4xl font-bold break-words">{page.title}</h1>
        {looksLikeHtml(page.body) ? (
          <div className="prose-content mt-6 text-foreground" dangerouslySetInnerHTML={{ __html: sanitizeHtml(page.body) }} />
        ) : (
          <div className="mt-6 text-muted-foreground leading-relaxed text-lg whitespace-pre-line">{page.body}</div>
        )}

        {faq.length > 0 && (
          <section className="mt-12" aria-label="Frequently asked questions">
            <h2 className="text-2xl font-bold mb-4">Frequently asked questions</h2>
            <div className="divide-y border rounded-2xl bg-card">
              {faq.map((f, i) => (
                <details key={i} className="group p-4">
                  <summary className="cursor-pointer font-semibold list-none flex items-center justify-between gap-3">
                    {f.q}
                    <span className="text-muted-foreground transition group-open:rotate-45 text-xl leading-none">+</span>
                  </summary>
                  <p className="mt-3 text-muted-foreground leading-relaxed whitespace-pre-line">{f.a}</p>
                </details>
              ))}
            </div>
          </section>
        )}
        {faqLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd).replace(/</g, "\\u003c") }} />}
      </div>
    </SiteLayout>
  );
}
