import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { adminListBlog, adminUpsertBlog, adminDeleteBlog } from "@/lib/admin-content.functions";
import type { BlogPost } from "@/lib/types";
import { Plus, Pencil, Trash2, Search, Newspaper, ExternalLink } from "lucide-react";
import { Modal, TextField, TextArea, SelectField } from "@/components/admin/Modal";
import { RichTextEditor } from "@/components/admin/RichTextEditor";
import { SeoAnalyzer } from "@/components/admin/SeoAnalyzer";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/blog")({ component: BlogPage });

type Draft = {
  id?: string;
  slug: string;
  title: string;
  excerpt: string;
  body: string;
  coverImage: string;
  author: string;
  category: string;
  tags: string;
  status: "draft" | "published";
  metaTitle: string;
  metaDescription: string;
  ogImage: string;
};

const emptyDraft: Draft = {
  slug: "",
  title: "",
  excerpt: "",
  body: "",
  coverImage: "",
  author: "",
  category: "",
  tags: "",
  status: "draft",
  metaTitle: "",
  metaDescription: "",
  ogImage: "",
};

function BlogPage() {
  const listFn = useServerFn(adminListBlog);
  const upsertFn = useServerFn(adminUpsertBlog);
  const deleteFn = useServerFn(adminDeleteBlog);

  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [q, setQ] = useState<string>("");
  const [editing, setEditing] = useState<Draft | null>(null);
  const [saving, setSaving] = useState<boolean>(false);

  const load = () => {
    setLoading(true);
    listFn()
      .then((rows) => setPosts(rows))
      .catch((err) => toast.error(err instanceof Error ? err.message : "Failed to load"))
      .finally(() => setLoading(false));
  };
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(
    () =>
      posts.filter(
        (p) =>
          !q ||
          `${p.title} ${p.slug} ${p.author} ${p.excerpt} ${p.category}`
            .toLowerCase()
            .includes(q.toLowerCase()),
      ),
    [posts, q],
  );

  async function onSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editing) return;
    const slug =
      editing.slug.trim() ||
      editing.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
    setSaving(true);
    try {
      await upsertFn({
        data: {
          id: editing.id,
          slug,
          title: editing.title.trim(),
          excerpt: editing.excerpt.trim(),
          body: editing.body,
          coverImage: editing.coverImage.trim(),
          author: editing.author.trim(),
          category: editing.category.trim(),
          tags: editing.tags
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
          status: editing.status,
          metaTitle: editing.metaTitle.trim(),
          metaDescription: editing.metaDescription.trim(),
          ogImage: editing.ogImage.trim(),
        },
      });
      toast.success(editing.id ? "Post updated" : "Post created");
      setEditing(null);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(p: BlogPost) {
    if (!confirm(`Delete "${p.title}"?`)) return;
    try {
      await deleteFn({ data: { id: p.id } });
      toast.success("Post deleted");
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    }
  }

  function toDraft(p: BlogPost): Draft {
    return {
      id: p.id,
      slug: p.slug,
      title: p.title,
      excerpt: p.excerpt,
      body: p.body,
      coverImage: p.coverImage,
      author: p.author,
      category: p.category || "",
      tags: (p.tags || []).join(", "),
      status: p.status,
      metaTitle: p.metaTitle || "",
      metaDescription: p.metaDescription || "",
      ogImage: p.ogImage || "",
    };
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Blog</h1>
          <p className="text-sm text-muted-foreground">
            {posts.length} total · {posts.filter((p) => p.status === "published").length} published
          </p>
        </div>
        <button
          onClick={() => setEditing({ ...emptyDraft })}
          className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-semibold"
        >
          <Plus className="h-4 w-4" /> Add post
        </button>
      </div>

      <div className="bg-card border rounded-xl overflow-hidden">
        <div className="p-4 border-b">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search posts..."
              className="w-full border rounded-md pl-9 pr-3 py-2 text-sm"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[760px]">
            <thead>
              <tr className="text-left text-muted-foreground border-b bg-muted/30">
                <th className="py-3 px-4">Title</th>
                <th>Slug</th>
                <th>Author</th>
                <th>Category</th>
                <th>Status</th>
                <th>Published</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-muted-foreground">
                    Loading…
                  </td>
                </tr>
              )}
              {!loading &&
                filtered.map((p) => (
                  <tr key={p.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="py-3 px-4 font-medium">
                      <div className="flex items-center gap-2">
                        <Newspaper className="h-4 w-4 text-primary shrink-0" /> {p.title}
                      </div>
                    </td>
                    <td className="text-xs text-muted-foreground">/blog/{p.slug}</td>
                    <td className="text-muted-foreground">{p.author || "—"}</td>
                    <td className="text-muted-foreground">{p.category || "—"}</td>
                    <td>
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                          p.status === "published" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {p.status}
                      </span>
                    </td>
                    <td className="text-muted-foreground text-xs">
                      {p.publishedAt ? new Date(p.publishedAt).toLocaleDateString() : "—"}
                    </td>
                    <td>
                      <div className="flex gap-1">
                        <a
                          href={`/blog/${p.slug}`}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1.5 hover:bg-muted rounded"
                          title="View"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                        <button
                          onClick={() => setEditing(toDraft(p))}
                          className="p-1.5 hover:bg-muted rounded text-primary"
                          title="Edit"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => onDelete(p)}
                          className="p-1.5 hover:bg-muted rounded text-destructive"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-muted-foreground">
                    <Newspaper className="h-8 w-8 mx-auto mb-2 opacity-40" />
                    No posts
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing?.id ? "Edit post" : "New post"}
        size="xl"
      >
        {editing && (
          <form onSubmit={onSave} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <TextField
                label="Title"
                required
                value={editing.title}
                onChange={(e) => setEditing({ ...editing, title: e.target.value })}
              />
              <TextField
                label="Slug"
                value={editing.slug}
                onChange={(e) => setEditing({ ...editing, slug: e.target.value })}
                placeholder="auto from title"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <TextField
                label="Author"
                value={editing.author}
                onChange={(e) => setEditing({ ...editing, author: e.target.value })}
              />
              <SelectField
                label="Status"
                value={editing.status}
                onChange={(e) => setEditing({ ...editing, status: e.target.value as "draft" | "published" })}
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
              </SelectField>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <TextField
                label="Category"
                value={editing.category}
                onChange={(e) => setEditing({ ...editing, category: e.target.value })}
              />
              <TextField
                label="Tags (comma-separated)"
                value={editing.tags}
                onChange={(e) => setEditing({ ...editing, tags: e.target.value })}
                placeholder="health, tips"
              />
            </div>
            <TextField
              label="Cover image URL"
              value={editing.coverImage}
              onChange={(e) => setEditing({ ...editing, coverImage: e.target.value })}
              placeholder="https://…"
            />
            <TextArea
              label="Excerpt"
              rows={2}
              value={editing.excerpt}
              onChange={(e) => setEditing({ ...editing, excerpt: e.target.value })}
            />
            <div>
              <label className="block text-sm font-medium mb-1">Body</label>
              <RichTextEditor value={editing.body} onChange={(html) => setEditing({ ...editing, body: html })} />
            </div>

            <div className="pt-2 border-t">
              <h3 className="text-sm font-semibold mb-2">SEO</h3>
              <div className="mb-3">
                <SeoAnalyzer title={editing.title} description={editing.metaDescription || editing.excerpt} slug={editing.slug} content={editing.body} hasImage={!!editing.coverImage} />
              </div>
              <div className="space-y-3">
                <TextField
                  label="Meta title"
                  value={editing.metaTitle}
                  onChange={(e) => setEditing({ ...editing, metaTitle: e.target.value })}
                />
                <TextArea
                  label="Meta description"
                  rows={2}
                  value={editing.metaDescription}
                  onChange={(e) => setEditing({ ...editing, metaDescription: e.target.value })}
                />
                <TextField
                  label="OG image URL"
                  value={editing.ogImage}
                  onChange={(e) => setEditing({ ...editing, ogImage: e.target.value })}
                  placeholder="https://…"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="px-4 py-2 rounded-md border text-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2 rounded-md bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-60"
              >
                {saving ? "Saving…" : "Save post"}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
