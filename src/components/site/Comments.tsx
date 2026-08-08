import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getComments, submitComment, type PublicComment } from "@/lib/community.functions";
import { MessageSquare, Send } from "lucide-react";

export function Comments({ postId }: { postId: string }) {
  const listFn = useServerFn(getComments);
  const submitFn = useServerFn(submitComment);
  const [items, setItems] = useState<PublicComment[]>([]);
  const [form, setForm] = useState({ authorName: "", authorEmail: "", body: "" });
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    listFn({ data: { postId } }).then(setItems).catch(() => setItems([]));
  }, [listFn, postId]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (form.authorName.trim().length < 2 || form.body.trim().length < 2) return;
    setBusy(true);
    setErr("");
    try {
      await submitFn({ data: { postId, authorName: form.authorName, authorEmail: form.authorEmail || undefined, body: form.body } });
      setSent(true);
      setForm({ authorName: "", authorEmail: "", body: "" });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not post comment");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-12 border-t pt-8">
      <h2 className="text-xl font-bold flex items-center gap-2"><MessageSquare className="h-5 w-5" /> Comments {items.length > 0 && <span className="text-sm font-normal text-muted-foreground">({items.length})</span>}</h2>

      {items.length > 0 ? (
        <ul className="mt-6 space-y-5">
          {items.map((c) => (
            <li key={c.id} className={`rounded-xl border p-4 bg-card ${c.parentId ? "ml-6" : ""}`}>
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-primary/10 text-primary grid place-items-center text-sm font-bold">{c.authorName.charAt(0).toUpperCase()}</div>
                <div>
                  <p className="font-semibold text-sm">{c.authorName}</p>
                  <p className="text-xs text-muted-foreground">{new Date(c.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
              <p className="mt-3 text-sm text-foreground/90 whitespace-pre-line">{c.body}</p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-sm text-muted-foreground">Be the first to comment.</p>
      )}

      {sent ? (
        <div className="mt-8 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800 p-4 text-sm">
          Thanks! Your comment was submitted and will appear once approved by a moderator.
        </div>
      ) : (
        <form onSubmit={onSubmit} className="mt-8 rounded-2xl border p-5 bg-card">
          <h3 className="font-semibold mb-3">Leave a comment</h3>
          <div className="grid sm:grid-cols-2 gap-3">
            <input value={form.authorName} onChange={(e) => setForm({ ...form, authorName: e.target.value })} placeholder="Your name *" className="border rounded-md px-3 py-2 text-sm" required />
            <input value={form.authorEmail} onChange={(e) => setForm({ ...form, authorEmail: e.target.value })} type="email" placeholder="Email (optional, not published)" className="border rounded-md px-3 py-2 text-sm" />
          </div>
          <textarea value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} placeholder="Write your comment…" rows={4} className="mt-3 w-full border rounded-md px-3 py-2 text-sm" required />
          {err && <p className="text-sm text-destructive mt-2">{err}</p>}
          <button disabled={busy} className="mt-3 inline-flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-md font-semibold hover:bg-primary/90 disabled:opacity-60">
            <Send className="h-4 w-4" /> {busy ? "Posting…" : "Post comment"}
          </button>
        </form>
      )}
    </section>
  );
}
