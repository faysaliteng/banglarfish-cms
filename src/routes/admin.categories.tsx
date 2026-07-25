import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Plus, Edit, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Modal, TextField, SelectField } from "@/components/admin/Modal";
import { adminListCategories, adminUpsertCategory, adminDeleteCategory } from "@/lib/admin-catalog.functions";

export const Route = createFileRoute("/admin/categories")({ component: CategoriesPage });

type AdminCategory = { id: string; slug: string; name: string; bn: string; image: string; sort: number; active: boolean };

function emptyCategory(): AdminCategory {
  return { id: "", slug: "", name: "", bn: "", image: "", sort: 0, active: true };
}

function CategoriesPage() {
  const listFn = useServerFn(adminListCategories);
  const upsertFn = useServerFn(adminUpsertCategory);
  const deleteFn = useServerFn(adminDeleteCategory);

  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<AdminCategory | null>(null);
  const [saving, setSaving] = useState(false);

  async function reload() {
    try {
      const rows = await listFn();
      setCategories(rows as AdminCategory[]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return categories;
    return categories.filter(
      (c) => c.name.toLowerCase().includes(q) || c.slug.toLowerCase().includes(q) || c.bn.toLowerCase().includes(q),
    );
  }, [categories, query]);

  async function handleSave(c: AdminCategory) {
    setSaving(true);
    try {
      const slug = c.slug.trim() || c.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
      await upsertFn({
        data: {
          id: c.id || undefined,
          slug,
          name: c.name.trim(),
          bn: c.bn.trim(),
          image: c.image.trim(),
          sort: Number(c.sort) || 0,
          active: c.active,
        },
      });
      toast.success(c.id ? "Category updated" : "Category created");
      setEditing(null);
      await reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(c: AdminCategory) {
    if (!confirm(`Delete ${c.name}?`)) return;
    try {
      await deleteFn({ data: { id: c.id } });
      toast.success("Category deleted");
      setCategories((prev) => prev.filter((x) => x.id !== c.id));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Categories</h1>
          <p className="text-sm text-muted-foreground">{categories.length} total</p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search categories…"
            className="border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 flex-1 min-w-0 sm:flex-none"
          />
          <button
            onClick={() => setEditing(emptyCategory())}
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-semibold shrink-0"
          >
            <Plus className="h-4 w-4" /> Add category
          </button>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">No categories found.</p>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((c) => (
            <div key={c.id} className="bg-card border rounded-xl overflow-hidden group">
              <div className="relative">
                <img src={c.image} alt="" className="w-full aspect-video object-cover" />
                {!c.active && (
                  <span className="absolute top-2 left-2 bg-black/60 text-white text-xs px-2 py-0.5 rounded">Inactive</span>
                )}
                <span className="absolute top-2 right-2 bg-black/60 text-white text-xs px-2 py-0.5 rounded">#{c.sort}</span>
              </div>
              <div className="p-4 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold truncate">{c.name}</p>
                  <p className="text-xs text-muted-foreground truncate">/{c.slug} · {c.bn}</p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => setEditing(c)} className="p-1.5 hover:bg-muted rounded">
                    <Edit className="h-4 w-4" />
                  </button>
                  <button onClick={() => handleDelete(c)} className="p-1.5 hover:bg-muted rounded text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing?.id ? "Edit category" : "New category"}>
        {editing && (
          <CategoryForm
            initial={editing}
            saving={saving}
            onCancel={() => setEditing(null)}
            onSave={handleSave}
          />
        )}
      </Modal>
    </div>
  );
}

function CategoryForm({
  initial,
  saving,
  onCancel,
  onSave,
}: {
  initial: AdminCategory;
  saving: boolean;
  onCancel: () => void;
  onSave: (c: AdminCategory) => void;
}) {
  const [c, setC] = useState<AdminCategory>(initial);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSave(c);
      }}
      className="space-y-3"
    >
      <TextField label="Name" required value={c.name} onChange={(e) => setC({ ...c, name: e.target.value })} />
      <TextField label="Bangla name" value={c.bn} onChange={(e) => setC({ ...c, bn: e.target.value })} />
      <TextField
        label="Slug"
        value={c.slug}
        onChange={(e) => setC({ ...c, slug: e.target.value })}
        placeholder="auto from name"
      />
      <TextField label="Image URL" value={c.image} onChange={(e) => setC({ ...c, image: e.target.value })} />
      {c.image && (
        <div className="h-24 w-40 rounded-md overflow-hidden border">
          <img src={c.image} alt="" className="h-full w-full object-cover" />
        </div>
      )}
      <TextField
        label="Sort"
        type="number"
        value={String(c.sort)}
        onChange={(e) => setC({ ...c, sort: Number(e.target.value) })}
      />
      <SelectField
        label="Status"
        value={c.active ? "active" : "inactive"}
        onChange={(e) => setC({ ...c, active: e.target.value === "active" })}
      >
        <option value="active">Active</option>
        <option value="inactive">Inactive</option>
      </SelectField>
      <div className="flex justify-end gap-2 pt-2 border-t">
        <button type="button" onClick={onCancel} className="px-4 py-2 rounded-md border text-sm">
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="px-5 py-2 rounded-md bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
    </form>
  );
}
