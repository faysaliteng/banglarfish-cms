import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { adminListContact, adminMarkContactRead, adminDeleteContact, type ContactRow } from "@/lib/community.functions";
import { Mail, MailOpen, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/contact")({ component: ContactInbox });

function ContactInbox() {
  const listFn = useServerFn(adminListContact);
  const readFn = useServerFn(adminMarkContactRead);
  const delFn = useServerFn(adminDeleteContact);

  const [rows, setRows] = useState<ContactRow[]>([]);
  const [open, setOpen] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = () => { setLoading(true); listFn().then(setRows).catch((e) => toast.error(e instanceof Error ? e.message : "Failed")).finally(() => setLoading(false)); };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  async function toggleRead(m: ContactRow) {
    try { await readFn({ data: { id: m.id, isRead: !m.isRead } }); load(); } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
  }
  async function remove(m: ContactRow) {
    if (!confirm(`Delete message from ${m.name}?`)) return;
    try { await delFn({ data: { id: m.id } }); toast.success("Deleted"); load(); } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
  }

  const unread = rows.filter((r) => !r.isRead).length;

  return (
    <div className="pb-16 max-w-4xl">
      <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2 mb-1"><Mail className="h-6 w-6" /> Contact inbox {unread > 0 && <span className="text-sm bg-primary text-primary-foreground rounded-full px-2 py-0.5">{unread} new</span>}</h1>
      <p className="text-sm text-muted-foreground mb-5">Messages sent through your <span className="font-medium">/contact</span> page.</p>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="text-muted-foreground py-12 text-center border rounded-2xl">No messages yet.</p>
      ) : (
        <div className="space-y-2">
          {rows.map((m) => {
            const isOpen = open === m.id;
            return (
              <div key={m.id} className={`border rounded-2xl bg-card overflow-hidden ${!m.isRead ? "border-primary/40" : ""}`}>
                <button onClick={() => { setOpen(isOpen ? null : m.id); if (!m.isRead) toggleRead(m); }} className="w-full text-left p-4 flex items-center gap-3">
                  {m.isRead ? <MailOpen className="h-4 w-4 text-muted-foreground shrink-0" /> : <Mail className="h-4 w-4 text-primary shrink-0" />}
                  <div className="min-w-0 flex-1">
                    <p className={`truncate ${!m.isRead ? "font-bold" : "font-medium"}`}>{m.subject || "(no subject)"}</p>
                    <p className="text-xs text-muted-foreground truncate">{m.name} · {m.email}</p>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">{new Date(m.createdAt).toLocaleDateString()}</span>
                </button>
                {isOpen && (
                  <div className="px-4 pb-4 border-t pt-3">
                    <p className="text-sm whitespace-pre-line">{m.message}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <a href={`mailto:${m.email}?subject=Re: ${encodeURIComponent(m.subject || "Your message")}`} className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-md bg-primary text-primary-foreground hover:bg-primary/90"><Mail className="h-3.5 w-3.5" /> Reply</a>
                      <button onClick={() => toggleRead(m)} className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-md border hover:bg-muted">{m.isRead ? "Mark unread" : "Mark read"}</button>
                      <button onClick={() => remove(m)} className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-md border text-destructive hover:bg-muted ml-auto"><Trash2 className="h-3.5 w-3.5" /> Delete</button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
