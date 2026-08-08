import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { adminListContentTypes, adminUpsertContentType, adminDeleteContentType, FIELD_TYPES, type ContentTypeDef, type ContentField } from "@/lib/content-types.functions";
import { Modal, TextField } from "@/components/admin/Modal";
import { Boxes, Plus, Pencil, Trash2, X, List } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/content-types")({ component: ContentTypesPage });

type Draft = { id?: string; name: string; namePlural: string; icon: string; hasPublicPage: boolean; fields: ContentField[] };
const empty: Draft = { name: "", namePlural: "", icon: "FileText", hasPublicPage: true, fields: [{ key: "body", label: "Body", type: "richtext" }] };

function ContentTypesPage() {
  const listFn = useServerFn(adminListContentTypes);
  const upFn = useServerFn(adminUpsertContentType);
  const delFn = useServerFn(adminDeleteContentType);
  const [types, setTypes] = useState<ContentTypeDef[]>([]);
  const [editing, setEditing] = useState<Draft | null>(null);

  const load = () => listFn().then(setTypes).catch((e) => toast.error(e instanceof Error ? e.message : "Failed"));
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  async function save() {
    if (!editing) return;
    try { await upFn({ data: { id: editing.id, name: editing.name, namePlural: editing.namePlural, icon: editing.icon, hasPublicPage: editing.hasPublicPage, fields: editing.fields.filter((f) => f.key && f.label) } }); toast.success("Content type saved"); setEditing(null); load(); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
  }
  async function remove(t: ContentTypeDef) {
    if (!confirm(`Delete type "${t.name}" and ALL its entries?`)) return;
    try { await delFn({ data: { id: t.id } }); toast.success("Deleted"); load(); } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
  }
  const setField = (i: number, patch: Partial<ContentField>) => setEditing((d) => d ? { ...d, fields: d.fields.map((f, idx) => idx === i ? { ...f, ...patch } : f) } : d);
  const addField = () => setEditing((d) => d ? { ...d, fields: [...d.fields, { key: "", label: "", type: "text" }] } : d);
  const rmField = (i: number) => setEditing((d) => d ? { ...d, fields: d.fields.filter((_, idx) => idx !== i) } : d);

  return (
    <div className="pb-16 max-w-4xl">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-1">
        <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2"><Boxes className="h-6 w-6" /> Content Types</h1>
        <button onClick={() => setEditing({ ...empty, fields: [...empty.fields] })} className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-semibold"><Plus className="h-4 w-4" /> New type</button>
      </div>
      <p className="text-sm text-muted-foreground mb-6">Define your own content models (Recipe, Property, Course, Event…) with typed fields — each gets an admin editor and an optional public page at <code>/c/&#123;type&#125;/&#123;slug&#125;</code>. This is the "everything is not a post" engine.</p>

      <div className="space-y-3">
        {types.map((t) => (
          <div key={t.id} className="border rounded-2xl p-4 bg-card flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{t.name} <span className="text-xs text-muted-foreground font-mono">/{t.slug}</span></p>
              <p className="text-xs text-muted-foreground">{t.fields.length} field(s): {t.fields.map((f) => f.label).join(", ") || "—"} {t.hasPublicPage ? "· public" : "· internal"}</p>
            </div>
            <Link to="/admin/content/$type" params={{ type: t.slug }} className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-md border hover:bg-muted"><List className="h-3.5 w-3.5" /> Entries</Link>
            <button onClick={() => setEditing({ id: t.id, name: t.name, namePlural: t.namePlural, icon: t.icon, hasPublicPage: t.hasPublicPage, fields: t.fields })} className="p-1.5 hover:bg-muted rounded"><Pencil className="h-4 w-4" /></button>
            <button onClick={() => remove(t)} className="p-1.5 hover:bg-muted rounded text-destructive"><Trash2 className="h-4 w-4" /></button>
          </div>
        ))}
        {types.length === 0 && <p className="text-muted-foreground py-10 text-center border rounded-2xl">No custom content types yet. Create one to model any kind of content.</p>}
      </div>

      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing?.id ? "Edit content type" : "New content type"} size="lg">
        {editing && (
          <div className="space-y-3">
            <div className="grid sm:grid-cols-2 gap-3">
              <TextField label="Name (singular)" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
              <TextField label="Name (plural)" value={editing.namePlural} onChange={(e) => setEditing({ ...editing, namePlural: e.target.value })} placeholder="auto" />
            </div>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={editing.hasPublicPage} onChange={(e) => setEditing({ ...editing, hasPublicPage: e.target.checked })} /> Has a public page (/c/…)</label>
            <div>
              <div className="flex items-center justify-between mb-2"><span className="text-xs font-semibold text-muted-foreground uppercase">Fields</span><button onClick={addField} className="text-xs font-semibold text-primary inline-flex items-center gap-1"><Plus className="h-3.5 w-3.5" /> Add field</button></div>
              <div className="space-y-2">
                {editing.fields.map((f, i) => (
                  <div key={i} className="flex flex-wrap items-end gap-2 border rounded-md p-2">
                    <label className="flex-1 min-w-[100px]"><span className="text-[10px] uppercase text-muted-foreground font-semibold">Label</span><input value={f.label} onChange={(e) => setField(i, { label: e.target.value, key: f.key || e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "_") })} className="mt-1 w-full border rounded px-2 py-1.5 text-sm" /></label>
                    <label className="w-28"><span className="text-[10px] uppercase text-muted-foreground font-semibold">Key</span><input value={f.key} onChange={(e) => setField(i, { key: e.target.value })} className="mt-1 w-full border rounded px-2 py-1.5 text-sm font-mono" /></label>
                    <label className="w-28"><span className="text-[10px] uppercase text-muted-foreground font-semibold">Type</span><select value={f.type} onChange={(e) => setField(i, { type: e.target.value as ContentField["type"] })} className="mt-1 w-full border rounded px-2 py-1.5 text-sm bg-card">{FIELD_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}</select></label>
                    {f.type === "select" && <input value={(f.options || []).join(", ")} onChange={(e) => setField(i, { options: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })} placeholder="opt1, opt2" className="w-32 border rounded px-2 py-1.5 text-sm" />}
                    <label className="flex items-center gap-1 text-xs pb-2"><input type="checkbox" checked={!!f.required} onChange={(e) => setField(i, { required: e.target.checked })} /> req</label>
                    <button onClick={() => rmField(i)} className="p-1.5 hover:bg-muted rounded text-destructive"><X className="h-4 w-4" /></button>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t"><button onClick={() => setEditing(null)} className="px-4 py-2 rounded-md border text-sm">Cancel</button><button onClick={save} className="px-5 py-2 rounded-md bg-primary text-primary-foreground text-sm font-semibold">Save type</button></div>
          </div>
        )}
      </Modal>
    </div>
  );
}
