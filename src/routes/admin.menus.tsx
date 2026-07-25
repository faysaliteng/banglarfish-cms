import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useState } from "react";
import { Plus, Trash2, Save, GripVertical, Menu as MenuIcon } from "lucide-react";
import { toast } from "sonner";
import { adminGetMenus, adminSaveMenu } from "@/lib/admin-content.functions";
import type { MenuItem } from "@/lib/types";
import { TextField } from "@/components/admin/Modal";

export const Route = createFileRoute("/admin/menus")({ component: MenusPage });

type Location = "header" | "footer";

function MenusPage() {
  const getMenus = useServerFn(adminGetMenus);
  const saveMenu = useServerFn(adminSaveMenu);

  const [header, setHeader] = useState<MenuItem[]>([]);
  const [footer, setFooter] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingHeader, setSavingHeader] = useState(false);
  const [savingFooter, setSavingFooter] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const menus = await getMenus();
      setHeader(menus.header ?? []);
      setFooter(menus.footer ?? []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoading(false);
    }
  }, [getMenus]);

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const save = async (location: Location, items: MenuItem[]) => {
    const clean = items
      .map((i) => ({ label: i.label.trim(), href: i.href.trim() }))
      .filter((i) => i.label || i.href);
    const setSaving = location === "header" ? setSavingHeader : setSavingFooter;
    setSaving(true);
    try {
      await saveMenu({ data: { location, items: clean } });
      if (location === "header") setHeader(clean);
      else setFooter(clean);
      toast.success(`${location === "header" ? "Header" : "Footer"} menu saved`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Menu Builder</h1>
          <p className="text-sm text-muted-foreground">
            {header.length} header links · {footer.length} footer links · drag the handle to reorder
          </p>
        </div>
      </div>

      {loading ? (
        <div className="bg-card border rounded-xl p-10 text-center text-sm text-muted-foreground">Loading menus…</div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <MenuPanel
            title="Header navigation"
            items={header}
            onChange={setHeader}
            onSave={() => save("header", header)}
            saving={savingHeader}
          />
          <MenuPanel
            title="Footer navigation"
            items={footer}
            onChange={setFooter}
            onSave={() => save("footer", footer)}
            saving={savingFooter}
          />
        </div>
      )}
    </div>
  );
}

function MenuPanel({
  title,
  items,
  onChange,
  onSave,
  saving,
}: {
  title: string;
  items: MenuItem[];
  onChange: (items: MenuItem[]) => void;
  onSave: () => void;
  saving: boolean;
}) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  const update = (idx: number, patch: Partial<MenuItem>) => {
    onChange(items.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  };
  const remove = (idx: number) => {
    onChange(items.filter((_, i) => i !== idx));
  };
  const add = () => {
    onChange([...items, { label: "", href: "" }]);
  };

  const handleDragStart = (e: React.DragEvent<HTMLTableRowElement>, idx: number) => {
    setDragIndex(idx);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(idx));
  };
  const handleDragOver = (e: React.DragEvent<HTMLTableRowElement>, idx: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (overIndex !== idx) setOverIndex(idx);
  };
  const handleDrop = (e: React.DragEvent<HTMLTableRowElement>, idx: number) => {
    e.preventDefault();
    const from = dragIndex;
    setDragIndex(null);
    setOverIndex(null);
    if (from === null || from === idx) return;
    const next = [...items];
    const [moved] = next.splice(from, 1);
    next.splice(idx, 0, moved);
    onChange(next);
  };
  const handleDragEnd = () => {
    setDragIndex(null);
    setOverIndex(null);
  };

  return (
    <div className="bg-card border rounded-xl overflow-hidden flex flex-col">
      <div className="flex items-center justify-between p-4 border-b bg-muted/30">
        <h2 className="font-bold flex items-center gap-2">
          <MenuIcon className="h-4 w-4 text-primary" /> {title}
        </h2>
        <button
          onClick={onSave}
          disabled={saving}
          className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-3 py-1.5 rounded-md text-sm font-semibold disabled:opacity-60"
        >
          <Save className="h-4 w-4" /> {saving ? "Saving…" : "Save"}
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[360px]">
          <thead>
            <tr className="text-left text-muted-foreground border-b bg-muted/30">
              <th className="py-2 px-3 w-8"></th>
              <th className="py-2 px-3">Label</th>
              <th className="py-2 px-3">URL</th>
              <th className="py-2 px-3 w-10"></th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-8 text-center text-sm text-muted-foreground">
                  No links yet. Add one below.
                </td>
              </tr>
            ) : (
              items.map((it, idx) => (
                <tr
                  key={idx}
                  draggable
                  onDragStart={(e) => handleDragStart(e, idx)}
                  onDragOver={(e) => handleDragOver(e, idx)}
                  onDrop={(e) => handleDrop(e, idx)}
                  onDragEnd={handleDragEnd}
                  className={`border-b last:border-0 hover:bg-muted/30 align-middle ${
                    dragIndex === idx ? "opacity-50" : ""
                  } ${overIndex === idx && dragIndex !== null && dragIndex !== idx ? "bg-primary/10" : ""}`}
                >
                  <td className="py-2 px-3 text-muted-foreground cursor-grab active:cursor-grabbing" title="Drag to reorder">
                    <GripVertical className="h-4 w-4" />
                  </td>
                  <td className="py-2 px-3">
                    <TextField
                      label=""
                      value={it.label}
                      placeholder="Home"
                      onChange={(e) => update(idx, { label: e.target.value })}
                    />
                  </td>
                  <td className="py-2 px-3">
                    <TextField
                      label=""
                      value={it.href}
                      placeholder="/"
                      onChange={(e) => update(idx, { href: e.target.value })}
                    />
                  </td>
                  <td className="py-2 px-3">
                    <button
                      onClick={() => remove(idx)}
                      className="p-1.5 hover:bg-muted rounded text-destructive"
                      title="Remove link"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="p-4 border-t mt-auto">
        <button
          onClick={add}
          className="inline-flex items-center gap-2 border px-3 py-1.5 rounded-md text-sm font-semibold hover:bg-muted"
        >
          <Plus className="h-4 w-4" /> Add link
        </button>
      </div>
    </div>
  );
}
