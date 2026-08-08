import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { adminListBlog, adminUpsertBlog, adminDeleteBlog } from "@/lib/admin-content.functions";
import type { BlogPost } from "@/lib/types";
import { Plus, Pencil, Trash2, Search, Newspaper, ExternalLink, History, Clock } from "lucide-react";
import { Modal, TextField, TextArea, SelectField } from "@/components/admin/Modal";
import { RichTextEditor } from "@/components/admin/RichTextEditor";
import { SeoAnalyzer } from "@/components/admin/SeoAnalyzer";
import { RevisionHistory } from "@/components/admin/RevisionHistory";
import { AiButton } from "@/components/admin/AiButton";
import { aiAssist, aiGenerateMeta } from "@/lib/ai.functions";
import { toast } from "sonner";

// Convert a stored ISO timestamp to a value for <input type="datetime-local"> (local time).
function isoToLocalInput(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

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
  publishedAt: string; // datetime-local value; blank = publish now
  metaTitle: string;
  metaDescription: string;
  ogImage: string;
  noindex: boolean;
  focusKeyword: string;
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
  publishedAt: "",
  metaTitle: "",
  metaDescription: "",
  ogImage: "",
  noindex: false,
  focusKeyword: "",
};

function BlogPage() {
  const listFn = useServerFn(adminListBlog);
  const upsertFn = useServerFn(adminUpsertBlog);
  const deleteFn = useServerFn(adminDeleteBlog);
  const assistFn = useServerFn(aiAssist);
  const genMetaFn = useServerFn(aiGenerateMeta);

  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [q, setQ] = useState<string>("");
  const [editing, setEditing] = useState<Draft | null>(null);
  const [saving, setSaving] = useState<boolean>(false);
  const [revsFor, setRevsFor] = useState<string | undefined>(undefined);

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
          publishedAt: editing.publishedAt ? new Date(editing.publishedAt).toISOString() : undefined,
          noindex: editing.noindex,
          focusKeyword: editing.focusKeyword.trim(),
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
      publishedAt: isoToLocalInput(p.publishedAt),
      noindex: !!p.noindex,
      focusKeyword: p.focusKeyword || "",
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
                      {(() => {
                        const scheduled = p.status === "published" && p.publishedAt && new Date(p.publishedAt).getTime() > Date.now();
                        const cls = scheduled ? "bg-sky-100 text-sky-700" : p.status === "published" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700";
                        return <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${cls}`}>{scheduled ? "scheduled" : p.status}</span>;
                      })()}
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
            {editing.status === "published" && (
              <div>
                <label className="block text-sm font-medium mb-1 flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /> Publish date &amp; time</label>
                <input
                  type="datetime-local"
                  value={editing.publishedAt}
                  onChange={(e) => setEditing({ ...editing, publishedAt: e.target.value })}
                  className="w-full border rounded-md px-3 py-2 text-sm"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {editing.publishedAt && new Date(editing.publishedAt).getTime() > Date.now()
                    ? `⏰ Scheduled — this post will go live automatically on ${new Date(editing.publishedAt).toLocaleString()}.`
                    : "Leave blank to publish immediately, or pick a future date/time to schedule."}
                </p>
              </div>
            )}
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
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium">Body</label>
                <div className="flex items-center gap-3">
                  <AiButton label={editing.body.trim() ? "AI improve" : "AI draft"} run={async () => (await assistFn({ data: { text: editing.body.trim() || editing.title, action: editing.body.trim() ? "improve" : "draft" } })).text} onText={(t) => setEditing((e) => (e ? { ...e, body: t } : e))} />
                  <AiButton label="AI translate → বাংলা" run={async () => (await assistFn({ data: { text: editing.body || editing.title, action: "translate", lang: "Bengali" } })).text} onText={(t) => setEditing((e) => (e ? { ...e, body: t } : e))} />
                </div>
              </div>
              <RichTextEditor value={editing.body} onChange={(html) => setEditing({ ...editing, body: html })} />
            </div>

            <div className="pt-2 border-t">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold">SEO</h3>
                <AiButton label="AI meta" run={async () => { const r = await genMetaFn({ data: { title: editing.title, content: editing.body.replace(/<[^>]*>/g, " ").slice(0, 1500), focusKeyword: editing.focusKeyword } }); setEditing((e) => (e ? { ...e, metaTitle: r.metaTitle || e.metaTitle, metaDescription: r.metaDescription || e.metaDescription } : e)); toast.success("AI meta filled"); return ""; }} />
              </div>
              <div className="mb-3">
                <SeoAnalyzer title={editing.title} description={editing.metaDescription || editing.excerpt} slug={editing.slug} content={editing.body} hasImage={!!editing.coverImage} focusKeyword={editing.focusKeyword} />
              </div>
              <div className="space-y-3">
                <TextField
                  label="Focus keyphrase"
                  value={editing.focusKeyword}
                  onChange={(e) => setEditing({ ...editing, focusKeyword: e.target.value })}
                  placeholder="e.g. hilsa fish recipe"
                />
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={editing.noindex} onChange={(e) => setEditing({ ...editing, noindex: e.target.checked })} /> Noindex (hide this post from search engines)
                </label>
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
              {editing.id && (
                <button
                  type="button"
                  onClick={() => setRevsFor(editing.id)}
                  className="mr-auto inline-flex items-center gap-1.5 px-4 py-2 rounded-md border text-sm hover:bg-muted"
                >
                  <History className="h-4 w-4" /> Revisions
                </button>
              )}
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

      <RevisionHistory
        open={!!revsFor}
        onClose={() => setRevsFor(undefined)}
        entityType="blog"
        entityId={revsFor}
        onRestored={() => { setEditing(null); load(); }}
      />
    </div>
  );
}
