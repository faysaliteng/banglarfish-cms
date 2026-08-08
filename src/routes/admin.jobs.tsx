import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { useServerFn } from "@tanstack/react-start";
import { adminListJobs, adminRetryJob, adminClearJobs, type JobRow } from "@/lib/jobs.functions";
import { Cog, RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/jobs")({ component: JobsPage });

const STYLE: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  running: "bg-sky-100 text-sky-700",
  done: "bg-emerald-100 text-emerald-700",
  failed: "bg-red-100 text-red-700",
};

function JobsPage() {
  const listFn = useServerFn(adminListJobs);
  const retryFn = useServerFn(adminRetryJob);
  const clearFn = useServerFn(adminClearJobs);
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});

  const load = useCallback(() => { listFn().then((r) => { setJobs(r.jobs); setCounts(r.counts); }).catch((e) => toast.error(e instanceof Error ? e.message : "Failed")); }, [listFn]);
  useEffect(() => { load(); const t = setInterval(load, 8000); return () => clearInterval(t); }, [load]);

  return (
    <div className="pb-16">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-1">
        <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2"><Cog className="h-6 w-6" /> Background Jobs</h1>
        <div className="flex gap-2">
          <button onClick={async () => { await clearFn({ data: { status: "done" } }); load(); }} className="text-sm px-3 py-1.5 rounded-md border hover:bg-muted">Clear done</button>
          <button onClick={async () => { await clearFn({ data: { status: "failed" } }); load(); }} className="text-sm px-3 py-1.5 rounded-md border hover:bg-muted">Clear failed</button>
        </div>
      </div>
      <p className="text-sm text-muted-foreground mb-4">Durable queue (retry + backoff) for SMS, IndexNow, webhooks and more. Auto-refreshes.</p>
      <div className="flex flex-wrap gap-2 mb-5">
        {["pending", "running", "done", "failed"].map((s) => (
          <span key={s} className={`text-xs px-3 py-1 rounded-full font-semibold capitalize ${STYLE[s]}`}>{s}: {counts[s] ?? 0}</span>
        ))}
      </div>

      <div className="bg-card border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[720px]">
            <thead>
              <tr className="text-left text-muted-foreground border-b bg-muted/30"><th className="py-3 px-4">Type</th><th>Status</th><th>Tries</th><th>Run at</th><th>Error</th><th></th></tr>
            </thead>
            <tbody>
              {jobs.map((j) => (
                <tr key={j.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="py-2.5 px-4 font-mono text-xs">{j.type}</td>
                  <td><span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold capitalize ${STYLE[j.status] ?? ""}`}>{j.status}</span></td>
                  <td className="text-muted-foreground text-xs">{j.attempts}/{j.maxAttempts}</td>
                  <td className="text-muted-foreground text-xs">{new Date(j.runAt).toLocaleString()}</td>
                  <td className="text-xs text-red-600 max-w-[240px] truncate" title={j.lastError ?? ""}>{j.lastError ?? ""}</td>
                  <td>{j.status === "failed" && <button onClick={async () => { await retryFn({ data: { id: j.id } }); load(); }} className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md border hover:bg-muted"><RotateCcw className="h-3.5 w-3.5" /> Retry</button>}</td>
                </tr>
              ))}
              {jobs.length === 0 && <tr><td colSpan={6} className="text-center py-10 text-muted-foreground"><Trash2 className="h-6 w-6 mx-auto mb-2 opacity-40" />No jobs.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
