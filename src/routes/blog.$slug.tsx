import { createFileRoute, notFound, Link } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site/SiteLayout";
import { getBlogPost, getSiteSections } from "@/lib/catalog.functions";
import { sanitizeHtml } from "@/lib/sanitize-html";
import { Comments } from "@/components/site/Comments";

export const Route = createFileRoute("/blog/$slug")({
  loader: async ({ params }) => {
    const post = await getBlogPost({ data: { slug: params.slug } });
    if (!post) throw notFound();
    const sections = await getSiteSections();
    const siteUrl = typeof process !== "undefined" ? (process.env.APP_URL || "").replace(/\/+$/, "") : "";
    return { post, commentsEnabled: sections.comments !== false, siteUrl };
  },
  head: ({ loaderData }) => {
    const p = loaderData?.post;
    if (!p) return { meta: [{ title: "Post — Banglarfish" }] };
    const base = (loaderData?.siteUrl || "").replace(/\/+$/, "");
    const canonical = base ? `${base}/blog/${p.slug}` : `/blog/${p.slug}`;
    const img = p.ogImage || p.coverImage;
    const ogImage = img ? (/^https?:\/\//i.test(img) ? img : base + img) : undefined;
    const title = `${p.metaTitle || p.title} — Banglarfish`;
    const desc = p.metaDescription || p.excerpt;
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:type", content: "article" },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:url", content: canonical },
        ...(ogImage ? [{ property: "og:image", content: ogImage }] : []),
        { name: "twitter:card", content: ogImage ? "summary_large_image" : "summary" },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: desc },
        ...(ogImage ? [{ name: "twitter:image", content: ogImage }] : []),
        ...(p.noindex ? [{ name: "robots", content: "noindex, follow" }] : []),
      ],
      links: [{ rel: "canonical", href: canonical }],
    };
  },
  component: BlogPost,
});

function looksLikeHtml(s: string) {
  return /<\/?[a-z][\s\S]*>/i.test(s);
}

function BlogPost() {
  const { post, commentsEnabled } = Route.useLoaderData();
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
        {post.category && (
          <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-[var(--color-brand)]">
            <Link to="/blog" search={{ category: post.category }} className="hover:underline">{post.category}</Link>
          </p>
        )}
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
            {post.tags.map((t) => (
              <Link key={t} to="/blog" search={{ tag: t }} className="text-xs bg-muted hover:bg-primary/10 hover:text-primary rounded-full px-3 py-1 transition">#{t}</Link>
            ))}
          </div>
        )}
        {commentsEnabled && <Comments postId={post.id} />}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      </article>
    </SiteLayout>
  );
}
