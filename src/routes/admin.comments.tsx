import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { useServerFn } from "@tanstack/react-start";
import { adminListComments, adminModerateComment, adminDeleteComment, type AdminComment } from "@/lib/community.functions";
import { MessageSquare, Check, X, Trash2, Clock } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/comments")({ component: CommentsPage });

type Filter = "all" | "pending" | "approved" | "rejected";

function CommentsPage() {
  const listFn = useServerFn(adminListComments);
  const modFn = useServerFn(adminModerateComment);
  const delFn = useServerFn(adminDeleteComment);

  const [rows, setRows] = useState<AdminComment[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [loading, setLoading] = useState(true);

  const load = useCallback((f: Filter) => {
    setLoading(true);
    listFn({ data: { status: f } }).then(setRows).catch((e) => toast.error(e instanceof Error ? e.message : "Failed")).finally(() => setLoading(false));
  }, [listFn]);

  useEffect(() => { load(filter); }, [filter, load]);

  async function moderate(c: AdminComment, status: "approved" | "rejected" | "pending") {
    try { await modFn({ data: { id: c.id, status } }); toast.success(`Marked ${status}`); load(filter); } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
  }
  async function remove(c: AdminComment) {
    if (!confirm("Delete this comment permanently?")) return;
    try { await delFn({ data: { id: c.id } }); toast.success("Deleted"); load(filter); } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
  }

  const pendingCount = rows.filter((r) => r.status === "pending").length;

  return (
    <div className="pb-16">
      <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2 mb-1"><MessageSquare className="h-6 w-6" /> Comments</h1>
      <p className="text-sm text-muted-foreground mb-5">Moderate reader comments. New comments arrive as <strong>pending</strong> and are hidden until you approve them.{filter !== "pending" && pendingCount > 0 ? ` (${pendingCount} pending on this view)` : ""}</p>

      <div className="flex flex-wrap gap-2 mb-5">
        {(["all", "pending", "approved", "rejected"] as Filter[]).map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={`text-sm px-3 py-1.5 rounded-full border capitalize transition ${filter === f ? "bg-primary text-primary-foreground border-primary" : "hover:bg-muted"}`}>{f}</button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="text-muted-foreground py-12 text-center border rounded-2xl">No comments.</p>
      ) : (
        <div className="space-y-3">
          {rows.map((c) => (
            <div key={c.id} className="border rounded-2xl p-4 bg-card">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="font-semibold">{c.authorName}</span>
                {c.authorEmail && <span className="text-muted-foreground text-xs">{c.authorEmail}</span>}
                <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold capitalize ${c.status === "approved" ? "bg-emerald-100 text-emerald-700" : c.status === "rejected" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>{c.status === "pending" && <Clock className="inline h-3 w-3 mr-0.5" />}{c.status}</span>
                <span className="text-xs text-muted-foreground ml-auto">{new Date(c.createdAt).toLocaleString()}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">on <span className="font-medium">{c.postTitle}</span></p>
              <p className="mt-2 text-sm whitespace-pre-line">{c.body}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {c.status !== "approved" && <button onClick={() => moderate(c, "approved")} className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-md bg-emerald-600 text-white hover:bg-emerald-700"><Check className="h-3.5 w-3.5" /> Approve</button>}
                {c.status !== "rejected" && <button onClick={() => moderate(c, "rejected")} className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-md border hover:bg-muted"><X className="h-3.5 w-3.5" /> Reject</button>}
                {c.status !== "pending" && <button onClick={() => moderate(c, "pending")} className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-md border hover:bg-muted"><Clock className="h-3.5 w-3.5" /> Unapprove</button>}
                <button onClick={() => remove(c)} className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-md border text-destructive hover:bg-muted ml-auto"><Trash2 className="h-3.5 w-3.5" /> Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
