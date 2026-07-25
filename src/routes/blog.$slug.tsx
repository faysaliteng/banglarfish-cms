import { createFileRoute, notFound, Link } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site/SiteLayout";
import { getBlogPost } from "@/lib/catalog.functions";
import { sanitizeHtml } from "@/lib/sanitize-html";

export const Route = createFileRoute("/blog/$slug")({
  loader: async ({ params }) => {
    const post = await getBlogPost({ data: { slug: params.slug } });
    if (!post) throw notFound();
    return { post };
  },
  head: ({ loaderData }) => {
    const p = loaderData?.post;
    if (!p) return { meta: [{ title: "Post — Banglarfish" }] };
    return {
      meta: [
        { title: `${p.metaTitle || p.title} — Banglarfish` },
        { name: "description", content: p.metaDescription || p.excerpt },
        { property: "og:type", content: "article" },
        { property: "og:title", content: p.metaTitle || p.title },
        { property: "og:description", content: p.metaDescription || p.excerpt },
        ...(p.ogImage || p.coverImage ? [{ property: "og:image", content: p.ogImage || p.coverImage }] : []),
      ],
    };
  },
  component: BlogPost,
});

function looksLikeHtml(s: string) {
  return /<\/?[a-z][\s\S]*>/i.test(s);
}

function BlogPost() {
  const { post } = Route.useLoaderData();
  const ld = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.excerpt,
    image: post.coverImage || undefined,
    author: { "@type": "Person", name: post.author || "Banglarfish" },
    datePublished: post.publishedAt || undefined,
  };
  return (
    <SiteLayout>
      <article className="container-x py-10 max-w-3xl">
        <Link to="/blog" className="text-sm text-primary hover:underline">← All posts</Link>
        {post.category && <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-[var(--color-brand)]">{post.category}</p>}
        <h1 className="text-3xl md:text-4xl font-bold mt-1 break-words">{post.title}</h1>
        <p className="text-sm text-muted-foreground mt-2">{post.author}{post.publishedAt ? ` · ${new Date(post.publishedAt).toLocaleDateString()}` : ""}</p>
        {post.coverImage && <img src={post.coverImage} alt={post.title} className="w-full rounded-2xl mt-6 object-cover max-h-[420px]" />}
        {looksLikeHtml(post.body) ? (
          <div className="prose-content mt-6" dangerouslySetInnerHTML={{ __html: sanitizeHtml(post.body) }} />
        ) : (
          <div className="prose-content mt-6 whitespace-pre-line">{post.body}</div>
        )}
        {post.tags.length > 0 && (
          <div className="mt-8 flex flex-wrap gap-2">
            {post.tags.map((t) => <span key={t} className="text-xs bg-muted rounded-full px-3 py-1">#{t}</span>)}
          </div>
        )}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      </article>
    </SiteLayout>
  );
}
