import { createFileRoute, notFound } from "@tanstack/react-router";
import { getLandingPublic } from "@/lib/landing.functions";

// Public, full-bleed render of a drag-and-drop landing page (no site chrome).
export const Route = createFileRoute("/l/$slug")({
  loader: async ({ params }) => {
    const page = await getLandingPublic({ data: { slug: params.slug } });
    if (!page) throw notFound();
    return { page };
  },
  head: ({ loaderData }) => {
    const p = loaderData?.page;
    if (!p) return { meta: [{ title: "Banglarfish" }] };
    const title = p.metaTitle || p.title;
    const desc = p.metaDescription || "";
    return {
      meta: [
        { title },
        ...(desc ? [{ name: "description", content: desc }] : []),
        ...(p.noindex ? [{ name: "robots", content: "noindex, nofollow" }] : []),
        { property: "og:title", content: title },
        ...(desc ? [{ property: "og:description", content: desc }] : []),
        { property: "og:type", content: "website" },
        ...(p.ogImage ? [{ property: "og:image", content: p.ogImage }] : []),
        { name: "twitter:card", content: p.ogImage ? "summary_large_image" : "summary" },
      ],
    };
  },
  component: LandingView,
});

function LandingView() {
  const { page } = Route.useLoaderData();
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: page.css }} />
      <div dangerouslySetInnerHTML={{ __html: page.html }} />
    </>
  );
}
