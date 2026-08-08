import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { adminListContentTypes, adminListEntries, adminUpsertEntry, adminDeleteEntry, type ContentTypeDef, type ContentEntry, type ContentField } from "@/lib/content-types.functions";
import { Modal, TextField, TextArea, SelectField } from "@/components/admin/Modal";
import { RichTextEditor } from "@/components/admin/RichTextEditor";
import { ArrowLeft, Plus, Pencil, Trash2, ExternalLink } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/content/$type")({ component: EntriesPage });

type FVal = string | number | boolean | null;
type Draft = { id?: string; title: string; slug: string; status: "draft" | "published"; data: Record<string, FVal> };

function EntriesPage() {
  const { type: typeSlug } = Route.useParams();
  const typesFn = useServerFn(adminListContentTypes);
  const listFn = useServerFn(adminListEntries);
  const upFn = useServerFn(adminUpsertEntry);
  const delFn = useServerFn(adminDeleteEntry);
  const [type, setType] = useState<ContentTypeDef | null>(null);
  const [entries, setEntries] = useState<ContentEntry[]>([]);
  const [editing, setEditing] = useState<Draft | null>(null);

  const load = () => {
    typesFn().then((ts) => setType(ts.find((t) => t.slug === typeSlug) ?? null)).catch(() => {});
    listFn({ data: { typeSlug } }).then(setEntries).catch((e) => toast.error(e instanceof Error ? e.message : "Failed"));
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [typeSlug]);

  const blankData = () => Object.fromEntries((type?.fields ?? []).map((f) => [f.key, f.type === "boolean" ? false : ""]));
  async function save() {
    if (!editing || !type) return;
    try { await upFn({ data: { id: editing.id, typeSlug, slug: editing.slug || undefined, title: editing.title, status: editing.status, data: editing.data } }); toast.success("Saved"); setEditing(null); load(); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
  }
  async function remove(en: ContentEntry) { if (!confirm(`Delete "${en.title}"?`)) return; try { await delFn({ data: { id: en.id } }); toast.success("Deleted"); load(); } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); } }
  const setVal = (key: string, v: FVal) => setEditing((d) => d ? { ...d, data: { ...d.data, [key]: v } } : d);

  return (
    <div className="pb-16 max-w-3xl">
      <Link to="/admin/content-types" className="text-sm text-primary hover:underline inline-flex items-center gap-1 mb-2"><ArrowLeft className="h-4 w-4" /> Content types</Link>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <h1 className="text-xl sm:text-2xl font-bold">{type?.namePlural ?? typeSlug}</h1>
        <button onClick={() => setEditing({ title: "", slug: "", status: "draft", data: blankData() })} disabled={!type} className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-semibold disabled:opacity-60"><Plus className="h-4 w-4" /> New {type?.name ?? "entry"}</button>
      </div>

      <div className="space-y-2">
        {entries.map((en) => (
          <div key={en.id} className="border rounded-xl p-3 bg-card flex items-center gap-3">
            <div className="min-w-0 flex-1"><p className="font-medium truncate">{en.title}</p><p className="text-xs text-muted-foreground">/{en.slug} · <span className={en.status === "published" ? "text-emerald-600" : "text-amber-600"}>{en.status}</span></p></div>
            {type?.hasPublicPage && en.status === "published" && <a href={`/c/${typeSlug}/${en.slug}`} target="_blank" rel="noreferrer" className="p-1.5 hover:bg-muted rounded"><ExternalLink className="h-4 w-4" /></a>}
            <button onClick={() => setEditing({ id: en.id, title: en.title, slug: en.slug, status: en.status, data: { ...en.data } })} className="p-1.5 hover:bg-muted rounded text-primary"><Pencil className="h-4 w-4" /></button>
            <button onClick={() => remove(en)} className="p-1.5 hover:bg-muted rounded text-destructive"><Trash2 className="h-4 w-4" /></button>
          </div>
        ))}
        {entries.length === 0 && <p className="text-muted-foreground py-10 text-center border rounded-2xl">No entries yet.</p>}
      </div>

      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing?.id ? "Edit entry" : "New entry"} size="xl">
        {editing && type && (
          <div className="space-y-3">
            <div className="grid sm:grid-cols-2 gap-3">
              <TextField label="Title" required value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} />
              <TextField label="Slug" value={editing.slug} onChange={(e) => setEditing({ ...editing, slug: e.target.value })} placeholder="auto from title" />
            </div>
            <SelectField label="Status" value={editing.status} onChange={(e) => setEditing({ ...editing, status: e.target.value as "draft" | "published" })}><option value="draft">Draft</option><option value="published">Published</option></SelectField>
            {type.fields.map((f) => <FieldInput key={f.key} field={f} value={editing.data[f.key]} onChange={(v) => setVal(f.key, v)} />)}
            <div className="flex justify-end gap-2 pt-2 border-t"><button onClick={() => setEditing(null)} className="px-4 py-2 rounded-md border text-sm">Cancel</button><button onClick={save} className="px-5 py-2 rounded-md bg-primary text-primary-foreground text-sm font-semibold">Save</button></div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function FieldInput({ field, value, onChange }: { field: ContentField; value: unknown; onChange: (v: FVal) => void }) {
  const v = value ?? "";
  if (field.type === "richtext") return <div><label className="block text-sm font-medium mb-1">{field.label}</label><RichTextEditor value={String(v)} onChange={onChange} /></div>;
  if (field.type === "textarea") return <TextArea label={field.label} rows={3} value={String(v)} onChange={(e) => onChange(e.target.value)} />;
  if (field.type === "boolean") return <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!value} onChange={(e) => onChange(e.target.checked)} /> {field.label}</label>;
  if (field.type === "select") return <SelectField label={field.label} value={String(v)} onChange={(e) => onChange(e.target.value)}><option value="">—</option>{(field.options || []).map((o) => <option key={o} value={o}>{o}</option>)}</SelectField>;
  if (field.type === "number") return <TextField label={field.label} type="number" value={String(v)} onChange={(e) => onChange(Number(e.target.value))} />;
  if (field.type === "date") return <TextField label={field.label} type="date" value={String(v)} onChange={(e) => onChange(e.target.value)} />;
  return <TextField label={field.label} value={String(v)} onChange={(e) => onChange(e.target.value)} placeholder={field.type === "media" ? "/uploads/… or https://…" : field.type === "url" ? "https://…" : ""} />;
}
