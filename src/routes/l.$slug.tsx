import { createFileRoute, notFound } from "@tanstack/react-router";
import { getLandingPublic } from "@/lib/landing.functions";

// Public, full-bleed render of a drag-and-drop landing page (no site chrome).
export const Route = createFileRoute("/l/$slug")({
  loader: async ({ params }) => {
    const page = await getLandingPublic({ data: { slug: params.slug } });
    if (!page) throw notFound();
    return { page };
  },
  head: ({ loaderData }) => ({ meta: [{ title: loaderData?.page.title ?? "Banglarfish" }] }),
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
