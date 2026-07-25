import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { adminListProducts, adminUpsertProduct, adminDeleteProduct, adminListCategories, adminExportProductsCsv, adminImportProductsCsv } from "@/lib/admin-catalog.functions";
import { adminListMedia } from "@/lib/admin-content.functions";
import { formatBDT } from "@/lib/cart";
import { Search, Plus, Edit, Trash2, Package, X, Download, Upload } from "lucide-react";
import { Modal, TextField, TextArea, SelectField } from "@/components/admin/Modal";
import { RichTextEditor } from "@/components/admin/RichTextEditor";
import { toast } from "sonner";
import type { Product, Variant } from "@/lib/types";

export const Route = createFileRoute("/admin/products")({ component: AdminProducts });

type Row = Product & { active: boolean };
type Cat = { slug: string; name: string };
type Media = { id: string; name: string; url: string };

type FormVariant = { id?: string; label: string; price: number; stock: number };
type FormAttribute = { name: string; value: string };

type FormState = {
  id?: string;
  slug: string;
  name: string;
  bn: string;
  category: string;
  price: number;
  compareAt: number | null;
  unit: string;
  description: string;
  image: string;
  images: string[];
  weightOptions: string[];
  stock: number;
  isBest: boolean;
  isNew: boolean;
  active: boolean;
  variants: FormVariant[];
  sku: string;
  brand: string;
  tags: string[];
  attributes: FormAttribute[];
  metaTitle: string;
  metaDescription: string;
  ogImage: string;
};

function toForm(p: Row): FormState {
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    bn: p.bn,
    category: p.category,
    price: p.price,
    compareAt: p.compareAt ?? null,
    unit: p.unit || "kg",
    description: p.description,
    image: p.image,
    images: p.images ?? [],
    weightOptions: p.weightOptions ?? [],
    stock: p.stock,
    isBest: !!p.isBest,
    isNew: !!p.isNew,
    active: p.active,
    variants: (p.variants ?? []).map((v: Variant) => ({ id: v.id, label: v.label, price: v.price, stock: v.stock })),
    sku: p.sku ?? "",
    brand: p.brand ?? "",
    tags: p.tags ?? [],
    attributes: (p.attributes ?? []).map((a) => ({ name: a.name, value: a.value })),
    metaTitle: p.metaTitle ?? "",
    metaDescription: p.metaDescription ?? "",
    ogImage: p.ogImage ?? "",
  };
}

function emptyForm(category: string, image: string): FormState {
  return {
    slug: "",
    name: "",
    bn: "",
    category,
    price: 0,
    compareAt: null,
    unit: "kg",
    description: "",
    image,
    images: [],
    weightOptions: ["500g", "1kg"],
    stock: 0,
    isBest: false,
    isNew: false,
    active: true,
    variants: [],
    sku: "",
    brand: "",
    tags: [],
    attributes: [],
    metaTitle: "",
    metaDescription: "",
    ogImage: "",
  };
}

function AdminProducts() {
  const listProducts = useServerFn(adminListProducts);
  const listCategories = useServerFn(adminListCategories);
  const listMedia = useServerFn(adminListMedia);
  const upsert = useServerFn(adminUpsertProduct);
  const del = useServerFn(adminDeleteProduct);
  const exportCsv = useServerFn(adminExportProductsCsv);
  const importCsv = useServerFn(adminImportProductsCsv);
  const [importing, setImporting] = useState(false);

  async function onExportCsv() {
    try {
      const csv = await exportCsv();
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `products-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Export failed");
    }
  }
  async function onImportCsv(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setImporting(true);
    try {
      const csv = await file.text();
      const res = await importCsv({ data: { csv } });
      toast.success(`Imported: ${res.created} created, ${res.updated} updated${res.errors ? `, ${res.errors} skipped` : ""}.`);
      loadProducts();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Import failed");
    } finally {
      setImporting(false);
    }
  }

  const [products, setProducts] = useState<Row[]>([]);
  const [categories, setCategories] = useState<Cat[]>([]);
  const [media, setMedia] = useState<Media[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");
  const [editing, setEditing] = useState<FormState | null>(null);

  const loadProducts = () => {
    setLoading(true);
    listProducts()
      .then((d) => setProducts(d as Row[]))
      .catch((e) => toast.error(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadProducts();
    listCategories()
      .then((d) => setCategories((d as { slug: string; name: string }[]).map((c) => ({ slug: c.slug, name: c.name }))))
      .catch(() => {});
    listMedia()
      .then((d) => setMedia((d as Media[]).map((m) => ({ id: m.id, name: m.name, url: m.url }))))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    return products.filter((p) => {
      if (cat && p.category !== cat) return false;
      if (q && !`${p.name} ${p.bn} ${p.slug}`.toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    });
  }, [products, q, cat]);

  const openNew = () => setEditing(emptyForm(categories[0]?.slug ?? "", media[0]?.url ?? ""));

  async function onSave(form: FormState) {
    try {
      await upsert({
        data: {
          id: form.id,
          slug: form.slug,
          name: form.name,
          bn: form.bn,
          category: form.category,
          price: form.price,
          compareAt: form.compareAt,
          unit: form.unit,
          description: form.description,
          image: form.image,
          images: form.images.length ? form.images : (form.image ? [form.image] : []),
          weightOptions: form.weightOptions,
          stock: form.stock,
          isBest: form.isBest,
          isNew: form.isNew,
          active: form.active,
          variants: form.variants.map((v) => ({ id: v.id, label: v.label, price: v.price, stock: v.stock })),
          tags: form.tags,
          attributes: form.attributes.filter((a) => a.name.trim() || a.value.trim()).map((a) => ({ name: a.name.trim(), value: a.value.trim() })),
          sku: form.sku || undefined,
          brand: form.brand || undefined,
          metaTitle: form.metaTitle || undefined,
          metaDescription: form.metaDescription || undefined,
          ogImage: form.ogImage || undefined,
        },
      });
      toast.success(form.id ? "Product updated" : "Product created");
      setEditing(null);
      loadProducts();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    }
  }

  async function onDelete(p: Row) {
    if (!confirm(`Delete ${p.name}?`)) return;
    try {
      await del({ data: { id: p.id } });
      toast.success("Product deleted");
      loadProducts();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Products</h1>
          <p className="text-sm text-muted-foreground">{products.length} total · {products.filter((p) => p.stock < 30).length} low stock</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={onExportCsv} className="inline-flex items-center gap-2 border px-3 py-2 rounded-md text-sm font-medium hover:bg-muted"><Download className="h-4 w-4" /> Export CSV</button>
          <label className="inline-flex items-center gap-2 border px-3 py-2 rounded-md text-sm font-medium hover:bg-muted cursor-pointer">
            <Upload className="h-4 w-4" /> {importing ? "Importing…" : "Import CSV"}
            <input type="file" accept=".csv,text/csv" className="hidden" onChange={onImportCsv} disabled={importing} />
          </label>
          <button onClick={openNew} className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-semibold shrink-0">
            <Plus className="h-4 w-4" /> Add product
          </button>
        </div>
      </div>
      <div className="bg-card border rounded-xl">
        <div className="p-4 border-b flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search products..." className="w-full border rounded-md pl-9 pr-3 py-2 text-sm" />
          </div>
          <select value={cat} onChange={(e) => setCat(e.target.value)} className="border rounded-md px-3 py-2 text-sm bg-card">
            <option value="">All categories</option>
            {categories.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[720px]">
            <thead>
              <tr className="text-left text-muted-foreground border-b">
                <th className="py-3 px-4">Product</th><th>Category</th><th>Price</th><th>Stock</th><th>Rating</th><th>Status</th><th></th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={7} className="text-center py-12 text-muted-foreground">Loading…</td></tr>}
              {!loading && filtered.map((p) => (
                <tr key={p.id} className="border-b last:border-0 hover:bg-muted/40">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <img src={p.image} alt="" className="h-10 w-10 rounded object-cover" />
                      <div>
                        <p className="font-medium">{p.name}</p>
                        <p className="text-xs text-muted-foreground">/{p.slug}</p>
                      </div>
                    </div>
                  </td>
                  <td className="capitalize">{p.category.replace("-", " ")}</td>
                  <td className="font-semibold">{formatBDT(p.price)}</td>
                  <td className={p.stock < 30 ? "text-amber-600 font-semibold" : ""}>{p.stock}</td>
                  <td className="text-xs">★ {p.rating} ({p.reviews})</td>
                  <td>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${p.active ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                      {p.active ? "Active" : "Hidden"}
                    </span>
                  </td>
                  <td>
                    <div className="flex gap-1">
                      <button onClick={() => setEditing(toForm(p))} className="p-1.5 hover:bg-muted rounded"><Edit className="h-4 w-4" /></button>
                      <button onClick={() => onDelete(p)} className="p-1.5 hover:bg-muted rounded text-destructive"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && filtered.length === 0 && (
                <tr><td colSpan={7} className="text-center py-12 text-muted-foreground"><Package className="h-8 w-8 mx-auto mb-2 opacity-40" />No products found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing?.id ? "Edit product" : "New product"} size="xl">
        {editing && (
          <ProductForm
            initial={editing}
            categories={categories}
            media={media}
            onCancel={() => setEditing(null)}
            onSave={onSave}
          />
        )}
      </Modal>
    </div>
  );
}

function ProductForm({ initial, categories, media, onCancel, onSave }: {
  initial: FormState;
  categories: Cat[];
  media: Media[];
  onCancel: () => void;
  onSave: (p: FormState) => void;
}) {
  const [p, setP] = useState<FormState>(initial);
  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setP((prev) => ({ ...prev, [k]: v }));

  const setVariant = (idx: number, patch: Partial<FormVariant>) =>
    setP((prev) => ({ ...prev, variants: prev.variants.map((v, i) => (i === idx ? { ...v, ...patch } : v)) }));
  const addVariant = () => setP((prev) => ({ ...prev, variants: [...prev.variants, { label: "", price: prev.price, stock: 0 }] }));
  const removeVariant = (idx: number) => setP((prev) => ({ ...prev, variants: prev.variants.filter((_, i) => i !== idx) }));

  const setAttribute = (idx: number, patch: Partial<FormAttribute>) =>
    setP((prev) => ({ ...prev, attributes: prev.attributes.map((a, i) => (i === idx ? { ...a, ...patch } : a)) }));
  const addAttribute = () => setP((prev) => ({ ...prev, attributes: [...prev.attributes, { name: "", value: "" }] }));
  const removeAttribute = (idx: number) => setP((prev) => ({ ...prev, attributes: prev.attributes.filter((_, i) => i !== idx) }));

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const next: FormState = { ...p };
        if (!next.slug) next.slug = next.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
        if (!next.image && media[0]) next.image = media[0].url;
        // Derive weight options from variant labels when variants exist.
        const variantLabels = next.variants.map((v) => v.label.trim()).filter(Boolean);
        if (variantLabels.length) next.weightOptions = variantLabels;
        onSave(next);
      }}
      className="grid md:grid-cols-2 gap-4"
    >
      <TextField label="Name" required value={p.name} onChange={(e) => set("name", e.target.value)} />
      <TextField label="Bangla name" value={p.bn} onChange={(e) => set("bn", e.target.value)} />
      <TextField label="Slug" value={p.slug} onChange={(e) => set("slug", e.target.value)} placeholder="auto from name" />
      <SelectField label="Category" value={p.category} onChange={(e) => set("category", e.target.value)}>
        {categories.length === 0 && <option value="">No categories</option>}
        {categories.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
      </SelectField>
      <TextField label="SKU" value={p.sku} onChange={(e) => set("sku", e.target.value)} placeholder="e.g. RXP-001" />
      <TextField label="Brand" value={p.brand} onChange={(e) => set("brand", e.target.value)} placeholder="e.g. Acme" />
      <TextField label="Price (৳)" type="number" required value={p.price || ""} onChange={(e) => set("price", Number(e.target.value))} />
      <TextField label="Compare-at (optional)" type="number" value={p.compareAt ?? ""} onChange={(e) => set("compareAt", e.target.value ? Number(e.target.value) : null)} />
      <TextField label="Stock" type="number" value={p.stock} onChange={(e) => set("stock", Number(e.target.value))} />
      <TextField label="Unit" value={p.unit} onChange={(e) => set("unit", e.target.value)} placeholder="kg" />
      <TextField label="Weight options (comma sep)" value={p.weightOptions.join(", ")} onChange={(e) => set("weightOptions", e.target.value.split(",").map((s) => s.trim()).filter(Boolean))} />
      <TextField label="Tags (comma sep)" value={p.tags.join(", ")} onChange={(e) => set("tags", e.target.value.split(",").map((s) => s.trim()).filter(Boolean))} placeholder="organic, imported" />

      <div className="md:col-span-2">
        <label className="block text-sm font-medium mb-1.5">Description</label>
        <RichTextEditor value={p.description} onChange={(html) => set("description", html)} />
      </div>

      <div className="md:col-span-2">
        <TextField label="Image URL (/uploads or /img path)" value={p.image} onChange={(e) => set("image", e.target.value)} placeholder="/uploads/..." />
        {media.length > 0 && (
          <div className="flex gap-3 flex-wrap mt-3">
            {media.map((m) => (
              <button type="button" key={m.id} onClick={() => set("image", m.url)} className={`h-16 w-16 rounded-md overflow-hidden border-2 ${p.image === m.url ? "border-primary" : "border-transparent"}`}>
                <img src={m.url} alt={m.name} className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="md:col-span-2">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Variants</p>
          <button type="button" onClick={addVariant} className="inline-flex items-center gap-1 text-xs font-semibold text-primary">
            <Plus className="h-3.5 w-3.5" /> Add variant
          </button>
        </div>
        {p.variants.length === 0 && <p className="text-xs text-muted-foreground">No variants. Base price/stock will be used.</p>}
        <div className="space-y-2">
          {p.variants.map((v, i) => (
            <div key={i} className="flex flex-wrap items-end gap-2 border rounded-md p-2">
              <label className="flex-1 min-w-[120px]">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase">Label</span>
                <input value={v.label} onChange={(e) => setVariant(i, { label: e.target.value })} className="mt-1 w-full border rounded-md px-2 py-1.5 text-sm" placeholder="500g" />
              </label>
              <label className="w-24">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase">Price</span>
                <input type="number" value={v.price || ""} onChange={(e) => setVariant(i, { price: Number(e.target.value) })} className="mt-1 w-full border rounded-md px-2 py-1.5 text-sm" />
              </label>
              <label className="w-24">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase">Stock</span>
                <input type="number" value={v.stock} onChange={(e) => setVariant(i, { stock: Number(e.target.value) })} className="mt-1 w-full border rounded-md px-2 py-1.5 text-sm" />
              </label>
              <button type="button" onClick={() => removeVariant(i)} className="p-1.5 hover:bg-muted rounded text-destructive"><X className="h-4 w-4" /></button>
            </div>
          ))}
        </div>
      </div>

      <div className="md:col-span-2">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Attributes / specs</p>
          <button type="button" onClick={addAttribute} className="inline-flex items-center gap-1 text-xs font-semibold text-primary">
            <Plus className="h-3.5 w-3.5" /> Add attribute
          </button>
        </div>
        {p.attributes.length === 0 && <p className="text-xs text-muted-foreground">No attributes. Add generic specs like Origin, Material, Color, Weight.</p>}
        <div className="space-y-2">
          {p.attributes.map((a, i) => (
            <div key={i} className="flex flex-wrap items-end gap-2 border rounded-md p-2">
              <label className="flex-1 min-w-[120px]">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase">Name</span>
                <input value={a.name} onChange={(e) => setAttribute(i, { name: e.target.value })} className="mt-1 w-full border rounded-md px-2 py-1.5 text-sm" placeholder="Origin" />
              </label>
              <label className="flex-1 min-w-[120px]">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase">Value</span>
                <input value={a.value} onChange={(e) => setAttribute(i, { value: e.target.value })} className="mt-1 w-full border rounded-md px-2 py-1.5 text-sm" placeholder="Bangladesh" />
              </label>
              <button type="button" onClick={() => removeAttribute(i)} className="p-1.5 hover:bg-muted rounded text-destructive"><X className="h-4 w-4" /></button>
            </div>
          ))}
        </div>
      </div>

      <div className="md:col-span-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">SEO</p>
        <div className="grid md:grid-cols-2 gap-4">
          <TextField label="Meta title" value={p.metaTitle} onChange={(e) => set("metaTitle", e.target.value)} />
          <TextField label="OG image URL" value={p.ogImage} onChange={(e) => set("ogImage", e.target.value)} placeholder="/uploads/..." />
          <div className="md:col-span-2">
            <TextArea label="Meta description" rows={2} value={p.metaDescription} onChange={(e) => set("metaDescription", e.target.value)} />
          </div>
        </div>
      </div>

      <div className="md:col-span-2 flex items-center gap-4 pt-2 flex-wrap">
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={p.isBest} onChange={(e) => set("isBest", e.target.checked)} /> Best seller</label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={p.isNew} onChange={(e) => set("isNew", e.target.checked)} /> New arrival</label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={p.active} onChange={(e) => set("active", e.target.checked)} /> Active</label>
      </div>
      <div className="md:col-span-2 flex justify-end gap-2 pt-2 border-t mt-2">
        <button type="button" onClick={onCancel} className="px-4 py-2 rounded-md border text-sm">Cancel</button>
        <button type="submit" className="px-5 py-2 rounded-md bg-primary text-primary-foreground text-sm font-semibold">Save product</button>
      </div>
    </form>
  );
}
