import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { adminListRevisions, adminRestoreRevision, type RevisionRow } from "@/lib/admin-content.functions";
import { Modal } from "@/components/admin/Modal";
import { History, RotateCcw } from "lucide-react";
import { toast } from "sonner";

// WordPress-style revision browser. Lists snapshots of a blog post or page and
// restores any of them (the current version is snapshotted first, so it's undoable).
export function RevisionHistory({
  open,
  onClose,
  entityType,
  entityId,
  onRestored,
}: {
  open: boolean;
  onClose: () => void;
  entityType: "blog" | "page";
  entityId: string | undefined;
  onRestored: () => void;
}) {
  const listFn = useServerFn(adminListRevisions);
  const restoreFn = useServerFn(adminRestoreRevision);
  const [rows, setRows] = useState<RevisionRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !entityId) return;
    setLoading(true);
    listFn({ data: { entityType, entityId } })
      .then(setRows)
      .catch((e) => toast.error(e instanceof Error ? e.message : "Failed"))
      .finally(() => setLoading(false));
  }, [open, entityId, entityType, listFn]);

  async function restore(r: RevisionRow) {
    if (!confirm("Restore this version? The current content will be saved as a new revision first.")) return;
    setBusy(r.id);
    try {
      await restoreFn({ data: { id: r.id } });
      toast.success("Revision restored");
      onRestored();
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Revision history" size="lg">
      <p className="text-sm text-muted-foreground mb-4 flex items-center gap-2"><History className="h-4 w-4" /> Every save keeps a snapshot (latest 30). Restore any point in time.</p>
      {loading ? (
        <p className="text-sm text-muted-foreground py-8 text-center">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">No revisions yet — they'll appear here after your next save.</p>
      ) : (
        <ul className="divide-y border rounded-xl overflow-hidden">
          {rows.map((r, i) => (
            <li key={r.id} className="flex items-center gap-3 p-3 hover:bg-muted/40">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{r.title || "(untitled)"} {i === 0 && <span className="text-[10px] uppercase font-bold text-primary ml-1">latest snapshot</span>}</p>
                <p className="text-xs text-muted-foreground">{new Date(r.createdAt).toLocaleString()}{r.authorEmail ? ` · ${r.authorEmail}` : ""}</p>
              </div>
              <button onClick={() => restore(r)} disabled={busy === r.id} className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-md border hover:bg-muted disabled:opacity-60">
                <RotateCcw className="h-3.5 w-3.5" /> {busy === r.id ? "Restoring…" : "Restore"}
              </button>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}
