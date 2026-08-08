import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { adminListReturns, adminUpdateReturn, type ReturnRow } from "@/lib/returns.functions";
import { RotateCcw, Check, X, RefreshCw, Clock } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/returns")({ component: ReturnsPage });

const STATUS_STYLE: Record<string, string> = {
  requested: "bg-amber-100 text-amber-700",
  approved: "bg-sky-100 text-sky-700",
  rejected: "bg-red-100 text-red-700",
  refunded: "bg-emerald-100 text-emerald-700",
};

function ReturnsPage() {
  const listFn = useServerFn(adminListReturns);
  const updFn = useServerFn(adminUpdateReturn);
  const [rows, setRows] = useState<ReturnRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => { setLoading(true); listFn().then(setRows).catch((e) => toast.error(e instanceof Error ? e.message : "Failed")).finally(() => setLoading(false)); };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  async function setStatus(r: ReturnRow, status: "approved" | "rejected" | "refunded" | "requested") {
    try { await updFn({ data: { id: r.id, status } }); toast.success(`Marked ${status}`); load(); } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
  }

  const pending = rows.filter((r) => r.status === "requested").length;

  return (
    <div className="pb-16 max-w-4xl">
      <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2 mb-1"><RotateCcw className="h-6 w-6" /> Returns / RMA {pending > 0 && <span className="text-sm bg-primary text-primary-foreground rounded-full px-2 py-0.5">{pending} new</span>}</h1>
      <p className="text-sm text-muted-foreground mb-5">Return requests submitted by customers from their account.</p>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="text-muted-foreground py-12 text-center border rounded-2xl">No return requests.</p>
      ) : (
        <div className="space-y-3">
          {rows.map((r) => (
            <div key={r.id} className="border rounded-2xl p-4 bg-card">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono font-semibold">{r.orderNumber}</span>
                <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold capitalize ${STATUS_STYLE[r.status] ?? "bg-gray-100 text-gray-600"}`}>{r.status}</span>
                <span className="text-xs text-muted-foreground ml-auto">{new Date(r.createdAt).toLocaleString()}</span>
              </div>
              <p className="mt-2 text-sm"><span className="text-muted-foreground">Reason:</span> {r.reason}</p>
              {r.items.length > 0 && <p className="mt-1 text-xs text-muted-foreground">Items: {r.items.map((it) => `${it.name} ×${it.qty}`).join(", ")}</p>}
              <div className="mt-3 flex flex-wrap gap-2">
                {r.status !== "approved" && <button onClick={() => setStatus(r, "approved")} className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-md bg-sky-600 text-white hover:bg-sky-700"><Check className="h-3.5 w-3.5" /> Approve</button>}
                {r.status !== "refunded" && <button onClick={() => setStatus(r, "refunded")} className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-md bg-emerald-600 text-white hover:bg-emerald-700"><RefreshCw className="h-3.5 w-3.5" /> Mark refunded</button>}
                {r.status !== "rejected" && <button onClick={() => setStatus(r, "rejected")} className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-md border hover:bg-muted"><X className="h-3.5 w-3.5" /> Reject</button>}
                {r.status !== "requested" && <button onClick={() => setStatus(r, "requested")} className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-md border hover:bg-muted"><Clock className="h-3.5 w-3.5" /> Reopen</button>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
