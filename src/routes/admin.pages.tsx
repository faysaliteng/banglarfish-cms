import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { adminListPages, adminUpsertPage, adminDeletePage } from "@/lib/admin-content.functions";
import type { CmsPage } from "@/lib/types";
import { Plus, Edit, Trash2, FileText, ExternalLink, Search, History } from "lucide-react";
import { Modal, TextField, TextArea, SelectField } from "@/components/admin/Modal";
import { RichTextEditor } from "@/components/admin/RichTextEditor";
import { RevisionHistory } from "@/components/admin/RevisionHistory";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/pages")({ component: PagesPage });

const empty: CmsPage = {
  id: "",
  slug: "",
  title: "",
  body: "",
  status: "draft",
  updatedAt: "",
  metaTitle: "",
  metaDescription: "",
  ogImage: "",
  noindex: false,
  template: "default",
  showInHeader: false,
  showInFooter: false,
  sort: 0,
};

function PagesPage() {
  const listFn = useServerFn(adminListPages);
  const upsertFn = useServerFn(adminUpsertPage);
  const deleteFn = useServerFn(adminDeletePage);

  const [pages, setPages] = useState<CmsPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<CmsPage | null>(null);
  const [saving, setSaving] = useState(false);
  const [revsFor, setRevsFor] = useState<string | undefined>(undefined);

  const load = () => {
    setLoading(true);
    listFn()
      .then((d) => setPages(d))
      .catch((e) => toast.error(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const filtered = useMemo(
    () => pages.filter((p) => !q || `${p.title} ${p.slug}`.toLowerCase().includes(q.toLowerCase())),
    [pages, q],
  );

  async function onSave(p: CmsPage) {
    const slug = p.slug || p.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
    setSaving(true);
    try {
      await upsertFn({
        data: {
          id: p.id || undefined,
          slug,
          title: p.title,
          body: p.body,
          status: p.status,
          metaTitle: p.metaTitle || undefined,
          metaDescription: p.metaDescription || undefined,
          ogImage: p.ogImage || undefined,
          noindex: !!p.noindex,
          template: p.template || "default",
          faq: (p.faq ?? []).filter((f) => f.q.trim() && f.a.trim()),
          showInHeader: !!p.showInHeader,
          showInFooter: !!p.showInFooter,
          sort: Number.isFinite(p.sort) ? p.sort : 0,
        },
      });
      toast.success(p.id ? "Page updated" : "Page created");
      setEditing(null);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(p: CmsPage) {
    if (!confirm(`Delete ${p.title}?`)) return;
    try {
      await deleteFn({ data: { id: p.id } });
      toast.success("Page deleted");
      setPages((prev) => prev.filter((x) => x.id !== p.id));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold">CMS Pages</h1>
          <p className="text-sm text-muted-foreground">{pages.length} total · {pages.filter((p) => p.status === "published").length} published</p>
        </div>
        <button onClick={() => setEditing(empty)} className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-semibold"><Plus className="h-4 w-4" /> Add page</button>
      </div>

      <div className="relative mb-4 max-w-sm">
        <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search pages…" className="w-full border rounded-md pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
      </div>

      <div className="bg-card border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead>
              <tr className="text-left text-muted-foreground border-b bg-muted/30">
                <th className="py-3 px-4">Title</th><th>Slug</th><th>Nav</th><th>Status</th><th>Updated</th><th></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="py-8 text-center text-muted-foreground">Loading…</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="py-8 text-center text-muted-foreground">No pages found.</td></tr>
              ) : filtered.map((p) => (
                <tr key={p.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="py-3 px-4 font-medium flex items-center gap-2"><FileText className="h-4 w-4 text-primary" /> {p.title}</td>
                  <td className="text-xs text-muted-foreground">/pages/{p.slug}</td>
                  <td className="text-xs text-muted-foreground">
                    <div className="flex gap-1">
                      {p.showInHeader && <span className="px-1.5 py-0.5 rounded bg-muted">Header</span>}
                      {p.showInFooter && <span className="px-1.5 py-0.5 rounded bg-muted">Footer</span>}
                      {!p.showInHeader && !p.showInFooter && <span>—</span>}
                    </div>
                  </td>
                  <td><span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${p.status === "published" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>{p.status}</span></td>
                  <td className="text-muted-foreground text-xs">{p.updatedAt}</td>
                  <td>
                    <div className="flex gap-1">
                      <a href={`/pages/${p.slug}`} target="_blank" rel="noreferrer" className="p-1.5 hover:bg-muted rounded"><ExternalLink className="h-4 w-4" /></a>
                      <button onClick={() => setEditing(p)} className="p-1.5 hover:bg-muted rounded"><Edit className="h-4 w-4" /></button>
                      <button onClick={() => onDelete(p)} className="p-1.5 hover:bg-muted rounded text-destructive"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing?.id ? "Edit page" : "New page"} size="xl">
        {editing && <PageForm initial={editing} saving={saving} onCancel={() => setEditing(null)} onSave={onSave} onRevisions={editing.id ? () => setRevsFor(editing.id) : undefined} />}
      </Modal>

      <RevisionHistory
        open={!!revsFor}
        onClose={() => setRevsFor(undefined)}
        entityType="page"
        entityId={revsFor}
        onRestored={() => { setEditing(null); load(); }}
      />
    </div>
  );
}

function PageForm({ initial, saving, onCancel, onSave, onRevisions }: { initial: CmsPage; saving: boolean; onCancel: () => void; onSave: (p: CmsPage) => void; onRevisions?: () => void }) {
  const [form, setForm] = useState<CmsPage>({ ...empty, ...initial });
  const [body, setBody] = useState<string>(initial.body || "");

  const set = <K extends keyof CmsPage>(key: K, value: CmsPage[K]) => setForm((prev) => ({ ...prev, [key]: value }));

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSave({ ...form, body }); }} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <TextField label="Title" required value={form.title} onChange={(e) => set("title", e.target.value)} />
        <TextField label="Slug" value={form.slug} onChange={(e) => set("slug", e.target.value)} placeholder="auto from title" />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1.5">Body</label>
        <RichTextEditor value={body} onChange={setBody} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <SelectField label="Status" value={form.status} onChange={(e) => set("status", e.target.value as CmsPage["status"])}>
          <option value="draft">Draft</option>
          <option value="published">Published</option>
        </SelectField>
        <SelectField label="Template" value={form.template || "default"} onChange={(e) => set("template", e.target.value)}>
          <option value="default">Default</option>
          <option value="full-width">Full width</option>
          <option value="landing">Landing</option>
        </SelectField>
        <TextField label="Sort" type="number" value={String(form.sort ?? 0)} onChange={(e) => set("sort", Number(e.target.value) || 0)} />
      </div>

      <div className="border-t pt-4 space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground">SEO</h3>
        <TextField label="Meta title" value={form.metaTitle || ""} onChange={(e) => set("metaTitle", e.target.value)} placeholder="Defaults to title" />
        <TextArea label="Meta description" rows={2} value={form.metaDescription || ""} onChange={(e) => set("metaDescription", e.target.value)} />
        <TextField label="OG image URL" value={form.ogImage || ""} onChange={(e) => set("ogImage", e.target.value)} placeholder="https://…" />
      </div>

      <div className="border-t pt-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground">FAQ</h3>
            <p className="text-xs text-muted-foreground">Rendered on the page and emitted as FAQPage structured data (rich results in Google).</p>
          </div>
          <button type="button" onClick={() => set("faq", [...(form.faq ?? []), { q: "", a: "" }])} className="text-sm font-semibold border rounded-md px-3 py-1.5 hover:bg-muted">+ Add question</button>
        </div>
        {(form.faq ?? []).map((item, i) => (
          <div key={i} className="rounded-lg border p-3 space-y-2 bg-muted/20">
            <div className="flex items-center gap-2">
              <input value={item.q} onChange={(e) => set("faq", (form.faq ?? []).map((f, j) => j === i ? { ...f, q: e.target.value } : f))} placeholder="Question" className="flex-1 border rounded-md px-3 py-2 text-sm font-medium" />
              <button type="button" onClick={() => set("faq", (form.faq ?? []).filter((_, j) => j !== i))} className="text-destructive text-sm px-2 py-1 rounded hover:bg-destructive/10">Remove</button>
            </div>
            <textarea value={item.a} onChange={(e) => set("faq", (form.faq ?? []).map((f, j) => j === i ? { ...f, a: e.target.value } : f))} placeholder="Answer" rows={2} className="w-full border rounded-md px-3 py-2 text-sm" />
          </div>
        ))}
      </div>

      <div className="border-t pt-4 flex flex-wrap gap-6">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={!!form.showInHeader} onChange={(e) => set("showInHeader", e.target.checked)} className="h-4 w-4 rounded border" />
          Show in header
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={!!form.showInFooter} onChange={(e) => set("showInFooter", e.target.checked)} className="h-4 w-4 rounded border" />
          Show in footer
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={!!form.noindex} onChange={(e) => set("noindex", e.target.checked)} className="h-4 w-4 rounded border" />
          No index (hide from search engines)
        </label>
      </div>

      <div className="flex justify-end gap-2 pt-2 border-t">
        {onRevisions && (
          <button type="button" onClick={onRevisions} className="mr-auto inline-flex items-center gap-1.5 px-4 py-2 rounded-md border text-sm hover:bg-muted"><History className="h-4 w-4" /> Revisions</button>
        )}
        <button type="button" onClick={onCancel} className="px-4 py-2 rounded-md border text-sm">Cancel</button>
        <button type="submit" disabled={saving} className="px-5 py-2 rounded-md bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-60">{saving ? "Saving…" : "Save page"}</button>
      </div>
    </form>
  );
}
