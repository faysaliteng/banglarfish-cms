import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { adminListProducts, adminUpsertProduct, adminDeleteProduct, adminListCategories, adminExportProductsCsv, adminImportProductsCsv } from "@/lib/admin-catalog.functions";
import { adminListMedia } from "@/lib/admin-content.functions";
import { getTaxPublic, getShippingClassesPublic } from "@/lib/site.functions";
import { formatBDT } from "@/lib/cart";
import { Search, Plus, Edit, Trash2, Package, X, Download, Upload, Grid3x3 } from "lucide-react";
import { Modal, TextField, TextArea, SelectField } from "@/components/admin/Modal";
import { RichTextEditor } from "@/components/admin/RichTextEditor";
import { AiButton } from "@/components/admin/AiButton";
import { aiGenerateDescription, aiGenerateMeta } from "@/lib/ai.functions";
import { toast } from "sonner";
import type { Product, Variant, ProductOptionGroup, ProductOptionChoice } from "@/lib/types";
import type { TaxClass, ShippingClass } from "@/lib/config-types";

export const Route = createFileRoute("/admin/products")({ component: AdminProducts });

type Row = Product & { active: boolean };
type Cat = { slug: string; name: string };
type Media = { id: string; name: string; url: string };

type FormVariant = { id?: string; label: string; price: number; stock: number; sku?: string; attributes?: FormAttribute[] };
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
  optionGroups: ProductOptionGroup[];
  stock: number;
  isBest: boolean;
  isNew: boolean;
  active: boolean;
  variants: FormVariant[];
  sku: string;
  brand: string;
  taxClass: string;
  shippingClass: string;
  lowStockThreshold: number;
  isDigital: boolean;
  downloadUrl: string;
  noindex: boolean;
  focusKeyword: string;
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
    optionGroups: p.optionGroups ?? [],
    stock: p.stock,
    isBest: !!p.isBest,
    isNew: !!p.isNew,
    active: p.active,
    variants: (p.variants ?? []).map((v: Variant) => ({ id: v.id, label: v.label, price: v.price, stock: v.stock, sku: v.sku ?? "", attributes: v.attributes ?? [] })),
    sku: p.sku ?? "",
    brand: p.brand ?? "",
    taxClass: p.taxClass ?? "standard",
    shippingClass: p.shippingClass ?? "",
    lowStockThreshold: p.lowStockThreshold ?? 0,
    isDigital: !!p.isDigital,
    downloadUrl: p.downloadUrl ?? "",
    noindex: !!p.noindex,
    focusKeyword: p.focusKeyword ?? "",
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
    optionGroups: [],
    stock: 0,
    isBest: false,
    isNew: false,
    active: true,
    variants: [],
    sku: "",
    brand: "",
    taxClass: "standard",
    shippingClass: "",
    lowStockThreshold: 0,
    isDigital: false,
    downloadUrl: "",
    noindex: false,
    focusKeyword: "",
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

  const getTax = useServerFn(getTaxPublic);
  const getShipClasses = useServerFn(getShippingClassesPublic);
  const [taxClasses, setTaxClasses] = useState<TaxClass[]>([{ id: "standard", name: "Standard" }]);
  const [shippingClasses, setShippingClasses] = useState<ShippingClass[]>([]);
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
    getTax()
      .then((t) => { if (t.classes?.length) setTaxClasses(t.classes); })
      .catch(() => {});
    getShipClasses()
      .then((s) => setShippingClasses(s.classes ?? []))
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
          optionGroups: form.optionGroups,
          stock: form.stock,
          isBest: form.isBest,
          isNew: form.isNew,
          active: form.active,
          variants: form.variants.map((v) => ({ id: v.id, label: v.label, price: v.price, stock: v.stock, sku: v.sku || undefined, attributes: (v.attributes ?? []).filter((a) => a.name.trim() || a.value.trim()) })),
          tags: form.tags,
          attributes: form.attributes.filter((a) => a.name.trim() || a.value.trim()).map((a) => ({ name: a.name.trim(), value: a.value.trim() })),
          sku: form.sku || undefined,
          brand: form.brand || undefined,
          taxClass: form.taxClass || "standard",
          shippingClass: form.shippingClass || "",
          lowStockThreshold: form.lowStockThreshold || 0,
          isDigital: form.isDigital,
          downloadUrl: form.downloadUrl || "",
          noindex: form.noindex,
          focusKeyword: form.focusKeyword || undefined,
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
            taxClasses={taxClasses}
            shippingClasses={shippingClasses}
            onCancel={() => setEditing(null)}
            onSave={onSave}
          />
        )}
      </Modal>
    </div>
  );
}

function ProductForm({ initial, categories, media, taxClasses, shippingClasses, onCancel, onSave }: {
  initial: FormState;
  categories: Cat[];
  media: Media[];
  taxClasses: TaxClass[];
  shippingClasses: ShippingClass[];
  onCancel: () => void;
  onSave: (p: FormState) => void;
}) {
  const [p, setP] = useState<FormState>(initial);
  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setP((prev) => ({ ...prev, [k]: v }));
  const genDesc = useServerFn(aiGenerateDescription);
  const genMeta = useServerFn(aiGenerateMeta);

  const setVariant = (idx: number, patch: Partial<FormVariant>) =>
    setP((prev) => ({ ...prev, variants: prev.variants.map((v, i) => (i === idx ? { ...v, ...patch } : v)) }));
  const addVariant = () => setP((prev) => ({ ...prev, variants: [...prev.variants, { label: "", price: prev.price, stock: 0, sku: "", attributes: [] }] }));
  const removeVariant = (idx: number) => setP((prev) => ({ ...prev, variants: prev.variants.filter((_, i) => i !== idx) }));

  // Variation matrix builder: attribute lines like {name:"Size", values:["S","M"]}.
  const [axes, setAxes] = useState<{ name: string; values: string }[]>([{ name: "", values: "" }]);
  const setAxis = (i: number, patch: Partial<{ name: string; values: string }>) => setAxes((prev) => prev.map((a, idx) => (idx === i ? { ...a, ...patch } : a)));
  const addAxis = () => setAxes((prev) => [...prev, { name: "", values: "" }]);
  const removeAxis = (i: number) => setAxes((prev) => prev.filter((_, idx) => idx !== i));
  function generateMatrix() {
    const clean = axes
      .map((a) => ({ name: a.name.trim(), values: a.values.split(",").map((v) => v.trim()).filter(Boolean) }))
      .filter((a) => a.name && a.values.length);
    if (clean.length === 0) { toast.error("Add at least one attribute with values (e.g. Size: S, M, L)."); return; }
    // Cartesian product of all axis values.
    let combos: { name: string; value: string }[][] = [[]];
    for (const axis of clean) {
      const next: { name: string; value: string }[][] = [];
      for (const combo of combos) for (const val of axis.values) next.push([...combo, { name: axis.name, value: val }]);
      combos = next;
    }
    const newVariants: FormVariant[] = combos.map((attrs) => ({
      label: attrs.map((a) => a.value).join(" / "),
      price: p.price,
      stock: 0,
      sku: "",
      attributes: attrs,
    }));
    setP((prev) => ({ ...prev, variants: newVariants }));
    toast.success(`Generated ${newVariants.length} variation${newVariants.length === 1 ? "" : "s"}.`);
  }

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
      <SelectField label="Tax class" value={p.taxClass} onChange={(e) => set("taxClass", e.target.value)}>
        {taxClasses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
      </SelectField>
      <SelectField label="Shipping class" value={p.shippingClass} onChange={(e) => set("shippingClass", e.target.value)}>
        <option value="">None</option>
        {shippingClasses.map((c) => <option key={c.id} value={c.id}>{c.name} (+{formatBDT(c.fee)})</option>)}
      </SelectField>
      <TextField label="Low-stock threshold" type="number" value={p.lowStockThreshold || ""} onChange={(e) => set("lowStockThreshold", Number(e.target.value) || 0)} placeholder="0 = use global" />

      <div className="md:col-span-2 rounded-lg border bg-muted/30 p-3">
        <label className="flex items-center gap-2 text-sm font-medium"><input type="checkbox" checked={p.isDigital} onChange={(e) => set("isDigital", e.target.checked)} /> Digital product (no shipping)</label>
        {p.isDigital && (
          <div className="mt-3 grid gap-3">
            <p className="text-xs text-muted-foreground">Digital products skip shipping. On paid orders, available license keys (managed in <strong>Digital Delivery</strong>) are auto-assigned to the buyer. An optional download link is shown to buyers who purchased it.</p>
            <TextField label="Download URL (optional)" value={p.downloadUrl} onChange={(e) => set("downloadUrl", e.target.value)} placeholder="https://… or /media/…" />
          </div>
        )}
      </div>

      <TextField label="Price (৳)" type="number" required value={p.price || ""} onChange={(e) => set("price", Number(e.target.value))} />
      <TextField label="Compare-at (optional)" type="number" value={p.compareAt ?? ""} onChange={(e) => set("compareAt", e.target.value ? Number(e.target.value) : null)} />
      <TextField label="Stock" type="number" value={p.stock} onChange={(e) => set("stock", Number(e.target.value))} />
      <TextField label="Unit" value={p.unit} onChange={(e) => set("unit", e.target.value)} placeholder="kg" />
      <TextField label="Weight options (comma sep)" value={p.weightOptions.join(", ")} onChange={(e) => set("weightOptions", e.target.value.split(",").map((s) => s.trim()).filter(Boolean))} />
      <TextField label="Tags (comma sep)" value={p.tags.join(", ")} onChange={(e) => set("tags", e.target.value.split(",").map((s) => s.trim()).filter(Boolean))} placeholder="organic, imported" />

      <div className="md:col-span-2">
        <OptionGroupEditor groups={p.optionGroups ?? []} onChange={(g) => set("optionGroups", g)} />
      </div>

      <div className="md:col-span-2">
        <div className="flex items-center justify-between mb-1.5">
          <label className="block text-sm font-medium">Description</label>
          <AiButton label="Generate with AI" run={async () => (await genDesc({ data: { name: p.name, category: p.category, attributes: p.attributes.map((a) => `${a.name}: ${a.value}`).join(", ") } })).text} onText={(t) => set("description", t)} />
        </div>
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

        {/* Variation matrix builder */}
        <div className="border rounded-lg p-3 bg-muted/30 mb-3">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1"><Grid3x3 className="h-3.5 w-3.5" /> Variation matrix — generate all combinations</p>
          <div className="space-y-2">
            {axes.map((a, i) => (
              <div key={i} className="flex flex-wrap items-end gap-2">
                <label className="w-40">
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase">Attribute</span>
                  <input value={a.name} onChange={(e) => setAxis(i, { name: e.target.value })} className="mt-1 w-full border rounded-md px-2 py-1.5 text-sm" placeholder="Size" />
                </label>
                <label className="flex-1 min-w-[160px]">
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase">Values (comma-separated)</span>
                  <input value={a.values} onChange={(e) => setAxis(i, { values: e.target.value })} className="mt-1 w-full border rounded-md px-2 py-1.5 text-sm" placeholder="S, M, L, XL" />
                </label>
                {axes.length > 1 && <button type="button" onClick={() => removeAxis(i)} className="p-1.5 hover:bg-background rounded text-destructive"><X className="h-4 w-4" /></button>}
              </div>
            ))}
          </div>
          <div className="flex items-center gap-3 mt-2">
            <button type="button" onClick={addAxis} className="text-xs font-semibold text-primary inline-flex items-center gap-1"><Plus className="h-3.5 w-3.5" /> Add attribute</button>
            <button type="button" onClick={generateMatrix} className="text-xs font-semibold bg-primary text-primary-foreground px-3 py-1.5 rounded-md">Generate variations</button>
            <span className="text-[11px] text-muted-foreground">Overwrites the variant list below.</span>
          </div>
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
              <label className="w-20">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase">Stock</span>
                <input type="number" value={v.stock} onChange={(e) => setVariant(i, { stock: Number(e.target.value) })} className="mt-1 w-full border rounded-md px-2 py-1.5 text-sm" />
              </label>
              <label className="w-28">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase">SKU</span>
                <input value={v.sku ?? ""} onChange={(e) => setVariant(i, { sku: e.target.value })} className="mt-1 w-full border rounded-md px-2 py-1.5 text-sm" placeholder="opt." />
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
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">SEO</p>
          <AiButton label="AI meta" run={async () => { const r = await genMeta({ data: { title: p.name, content: p.description.replace(/<[^>]*>/g, " ").slice(0, 1500), focusKeyword: p.focusKeyword } }); setP((prev) => ({ ...prev, metaTitle: r.metaTitle || prev.metaTitle, metaDescription: r.metaDescription || prev.metaDescription })); toast.success("AI meta filled"); return ""; }} />
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          <TextField label="Focus keyphrase" value={p.focusKeyword} onChange={(e) => set("focusKeyword", e.target.value)} placeholder="e.g. fresh hilsa fish" />
          <TextField label="Meta title" value={p.metaTitle} onChange={(e) => set("metaTitle", e.target.value)} />
          <TextField label="OG image URL" value={p.ogImage} onChange={(e) => set("ogImage", e.target.value)} placeholder="/uploads/..." />
          <label className="flex items-center gap-2 text-sm mt-6"><input type="checkbox" checked={p.noindex} onChange={(e) => set("noindex", e.target.checked)} /> Noindex (hide from search engines)</label>
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


/* ------------------------------------------------------------------ *
 * Product option groups
 *
 * Preparation choices — "Processing: whole / family cut", "Head: on / off".
 * Deliberately separate from variants: a variant is its own priced, stocked SKU,
 * whereas these adjust the price a little and, more importantly, have to reach
 * the person holding the knife. Selling the same fish whole and family-cut does
 * not need two SKUs; it needs one SKU and an instruction.
 * ------------------------------------------------------------------ */

/** Ready-made groups so nobody has to retype Bengali labels for every product. */
const OPTION_PRESETS: { id: string; label: string; group: ProductOptionGroup }[] = [
  {
    id: "processing",
    label: "Processing (whole / family cut)",
    group: {
      name: "Processing", nameBn: "প্রসেসিং", required: true,
      choices: [
        { label: "আস্ত", priceDelta: 0 },
        { label: "ফ্যামিলি কাটিং", priceDelta: 0 },
      ],
    },
  },
  {
    id: "cut-full",
    label: "Cut style (5 options)",
    group: {
      name: "Cut", nameBn: "কাটিং", required: true,
      choices: [
        { label: "আস্ত (whole)", priceDelta: 0 },
        { label: "ফ্যামিলি কাটিং", priceDelta: 0 },
        { label: "কারি কাট", priceDelta: 0 },
        { label: "বিরিয়ানি কাট", priceDelta: 0 },
        { label: "স্টেক", priceDelta: 0 },
      ],
    },
  },
  {
    id: "head",
    label: "Head on / off",
    group: {
      name: "Head", nameBn: "মাথা", required: false,
      choices: [
        { label: "মাথাসহ", priceDelta: 0 },
        { label: "মাথা ছাড়া", priceDelta: 0 },
      ],
    },
  },
  {
    id: "clean",
    label: "Cleaning",
    group: {
      name: "Cleaning", nameBn: "পরিষ্কার", required: false,
      choices: [
        { label: "আঁশ ও নাড়িভুঁড়ি ছাড়ানো", priceDelta: 0 },
        { label: "যেমন আছে", priceDelta: 0 },
      ],
    },
  },
];

function OptionGroupEditor({ groups, onChange }: { groups: ProductOptionGroup[]; onChange: (g: ProductOptionGroup[]) => void }) {
  const patch = (i: number, next: Partial<ProductOptionGroup>) =>
    onChange(groups.map((g, n) => (n === i ? { ...g, ...next } : g)));
  const patchChoice = (gi: number, ci: number, next: Partial<ProductOptionChoice>) =>
    patch(gi, { choices: groups[gi].choices.map((c, n) => (n === ci ? { ...c, ...next } : c)) });

  return (
    <div className="border rounded-lg p-4 bg-muted/20">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
        <label className="block text-sm font-medium">Product options</label>
        <div className="flex flex-wrap gap-1.5">
          {OPTION_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => onChange([...groups, JSON.parse(JSON.stringify(preset.group))])}
              disabled={groups.some((g) => g.name === preset.group.name)}
              className="text-xs border rounded px-2 py-1 bg-card hover:bg-muted disabled:opacity-40"
            >
              + {preset.label}
            </button>
          ))}
        </div>
      </div>
      <p className="text-xs text-muted-foreground mb-3">
        Choices the customer picks before ordering — how the fish should be cut, head on or off.
        The selection is carried into the cart, the order and the invoice, so whoever packs it sees it.
      </p>

      {groups.length === 0 && (
        <p className="text-xs text-muted-foreground border border-dashed rounded p-3 text-center">
          No options. Add one of the presets above, or a blank group.
        </p>
      )}

      {groups.map((g, gi) => (
        <div key={gi} className="border rounded-md bg-card p-3 mb-2">
          <div className="grid sm:grid-cols-[1fr_1fr_auto_auto] gap-2 items-end">
            <label className="block">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase">Name (English)</span>
              <input value={g.name} onChange={(e) => patch(gi, { name: e.target.value })} placeholder="Processing" className="mt-1 w-full border rounded px-2 py-1.5 text-sm" />
            </label>
            <label className="block">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase">Name (Bengali)</span>
              <input value={g.nameBn} onChange={(e) => patch(gi, { nameBn: e.target.value })} placeholder="প্রসেসিং" className="mt-1 w-full border rounded px-2 py-1.5 text-sm" />
            </label>
            <label className="inline-flex items-center gap-1.5 text-xs pb-2 whitespace-nowrap">
              <input type="checkbox" checked={g.required} onChange={(e) => patch(gi, { required: e.target.checked })} /> Required
            </label>
            <button type="button" onClick={() => onChange(groups.filter((_, n) => n !== gi))} className="p-2 rounded hover:bg-muted text-destructive mb-0.5" title="Remove this group">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-2 space-y-1.5">
            {g.choices.map((c, ci) => (
              <div key={ci} className="flex items-center gap-2">
                <input
                  value={c.label}
                  onChange={(e) => patchChoice(gi, ci, { label: e.target.value })}
                  placeholder="Choice shown to the customer"
                  className="flex-1 min-w-0 border rounded px-2 py-1.5 text-sm"
                />
                <div className="flex items-center gap-1 shrink-0">
                  <span className="text-xs text-muted-foreground">price</span>
                  <input
                    type="number"
                    value={c.priceDelta}
                    onChange={(e) => patchChoice(gi, ci, { priceDelta: Number(e.target.value) || 0 })}
                    className="w-20 border rounded px-2 py-1.5 text-sm"
                    title="Added to the unit price. 0 = no change, negative = cheaper."
                  />
                </div>
                <button type="button" onClick={() => patch(gi, { choices: g.choices.filter((_, n) => n !== ci) })} className="p-1.5 rounded hover:bg-muted text-destructive shrink-0">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => patch(gi, { choices: [...g.choices, { label: "", priceDelta: 0 }] })}
              className="text-xs text-primary font-semibold"
            >
              + Add choice
            </button>
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={() => onChange([...groups, { name: "", nameBn: "", required: false, choices: [{ label: "", priceDelta: 0 }] }])}
        className="text-xs border rounded px-2.5 py-1.5 bg-card hover:bg-muted"
      >
        + Blank group
      </button>
    </div>
  );
}
