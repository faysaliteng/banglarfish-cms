import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { adminListReviews, adminSetReviewStatus, adminDeleteReview } from "@/lib/admin-content.functions";
import type { Review } from "@/lib/types";
import { Check, X, Trash2, Star, MessageSquare } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/reviews")({ component: ReviewsPage });

type ReviewStatus = "pending" | "approved" | "rejected";
type Tab = "all" | ReviewStatus;

const TABS: { key: Tab; label: string }[] = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "approved", label: "Approved" },
  { key: "rejected", label: "Rejected" },
];

function ReviewsPage() {
  const listFn = useServerFn(adminListReviews);
  const setStatusFn = useServerFn(adminSetReviewStatus);
  const deleteFn = useServerFn(adminDeleteReview);

  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [tab, setTab] = useState<Tab>("all");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await listFn();
      setReviews(rows);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoading(false);
    }
  }, [listFn]);

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setStatus = async (id: string, status: ReviewStatus) => {
    try {
      await setStatusFn({ data: { id, status } });
      setReviews((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
      toast.success(`Review ${status}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete review?")) return;
    try {
      await deleteFn({ data: { id } });
      setReviews((prev) => prev.filter((r) => r.id !== id));
      toast.success("Review deleted");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    }
  };

  const filtered = reviews.filter((r) => tab === "all" || r.status === tab);
  const pendingCount = reviews.filter((r) => r.status === "pending").length;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Reviews</h1>
          <p className="text-sm text-muted-foreground">{reviews.length} total · {pendingCount} pending moderation</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2 mb-4">
        {TABS.map((t) => {
          const n = t.key === "all" ? reviews.length : reviews.filter((r) => r.status === t.key).length;
          return (
            <button key={t.key} onClick={() => setTab(t.key)} className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${tab === t.key ? "bg-primary text-primary-foreground border-primary" : "hover:bg-muted"}`}>{t.label} ({n})</button>
          );
        })}
      </div>
      <div className="space-y-3">
        {filtered.map((r) => (
          <div key={r.id} className="bg-card border rounded-xl p-4 flex gap-4">
            <div className="hidden sm:block h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold shrink-0">{r.customer[0]}</div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-semibold text-sm">{r.customer}</p>
                <span className="text-xs text-muted-foreground">on <b>{r.productName}</b></span>
                <span className={`ml-auto px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${r.status === "approved" ? "bg-emerald-100 text-emerald-700" : r.status === "rejected" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>{r.status}</span>
              </div>
              <div className="flex items-center gap-1 mt-1">
                {Array.from({ length: 5 }).map((_, i) => <Star key={i} className={`h-3 w-3 ${i < r.rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/40"}`} />)}
                <span className="text-xs text-muted-foreground ml-2">{r.createdAt}</span>
              </div>
              <p className="font-medium text-sm mt-2 break-words">{r.title}</p>
              <p className="text-sm text-muted-foreground break-words">{r.body}</p>
            </div>
            <div className="flex flex-col gap-1 shrink-0">
              {r.status !== "approved" && <button onClick={() => setStatus(r.id, "approved")} className="p-1.5 rounded border text-emerald-600 hover:bg-emerald-50" title="Approve"><Check className="h-4 w-4" /></button>}
              {r.status !== "rejected" && <button onClick={() => setStatus(r.id, "rejected")} className="p-1.5 rounded border text-amber-600 hover:bg-amber-50" title="Reject"><X className="h-4 w-4" /></button>}
              <button onClick={() => remove(r.id)} className="p-1.5 rounded border text-destructive hover:bg-red-50"><Trash2 className="h-4 w-4" /></button>
            </div>
          </div>
        ))}
        {loading && <div className="text-center py-16 text-muted-foreground">Loading…</div>}
        {!loading && filtered.length === 0 && <div className="text-center py-16 text-muted-foreground"><MessageSquare className="h-10 w-10 mx-auto mb-2 opacity-40" />No reviews in this tab</div>}
      </div>
    </div>
  );
}
