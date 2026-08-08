import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { adminListMail, adminGetMail, adminSendMail, adminDeleteMail, adminListRecipients, adminMailUpload, adminSaveDraft, adminDeleteMails, adminEmptyMailFolder } from "@/lib/mail.functions";
import { RichTextEditor } from "@/components/admin/RichTextEditor";
import type { EmailMessage } from "@/lib/config-types";
import { Inbox, Send, FileText, PenSquare, Paperclip, Reply, Forward, Trash2, X, RefreshCw, Mail as MailIcon, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/mail")({ component: MailPage });

type Folder = "inbox" | "sent" | "drafts";
type Draft = { id?: string; to: string; cc: string; bcc: string; subject: string; html: string; inReplyTo: string; attachments: { filename: string; url: string }[]; showCc: boolean };
const emptyDraft: Draft = { to: "", cc: "", bcc: "", subject: "", html: "", inReplyTo: "", attachments: [], showCc: false };

function firstEmail(s: string): string {
  const m = /<([^>]+)>/.exec(s);
  return (m ? m[1] : s).trim();
}

function MailPage() {
  const qc = useQueryClient();
  const [folder, setFolder] = useState<Folder>("sent");
  const [openId, setOpenId] = useState<string | null>(null);
  const [compose, setCompose] = useState<Draft | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const listFn = useServerFn(adminListMail);
  const getFn = useServerFn(adminGetMail);
  const delFn = useServerFn(adminDeleteMail);
  const recipFn = useServerFn(adminListRecipients);
  const delManyFn = useServerFn(adminDeleteMails);
  const emptyFn = useServerFn(adminEmptyMailFolder);

  const { data, isFetching, refetch } = useQuery({
    queryKey: ["admin-mail", folder],
    queryFn: () => listFn({ data: { folder, limit: 50, offset: 0 } }),
  });
  const { data: recipients = [] } = useQuery({ queryKey: ["mail-recipients"], queryFn: () => recipFn(), staleTime: 300_000 });
  const { data: open } = useQuery({ queryKey: ["admin-mail-msg", openId], queryFn: () => getFn({ data: { id: openId! } }), enabled: !!openId });

  const counts = data?.counts ?? { inbox: 0, sent: 0, drafts: 0, inboxUnread: 0 };
  const messages = data?.messages ?? [];

  const del = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => { toast.success("Deleted"); setOpenId(null); qc.invalidateQueries({ queryKey: ["admin-mail"] }); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Delete failed"),
  });

  function toggleSel(id: string) {
    setSelected((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  }
  async function deleteSelected() {
    const ids = [...selected];
    if (!ids.length) return;
    if (!confirm(`Delete ${ids.length} message(s)? This cannot be undone.`)) return;
    try {
      const r = await delManyFn({ data: { ids } });
      toast.success(`Deleted ${r.deleted} message(s)`);
      setSelected(new Set()); setOpenId(null);
      qc.invalidateQueries({ queryKey: ["admin-mail"] });
    } catch (e) { toast.error(e instanceof Error ? e.message : "Delete failed"); }
  }
  async function emptyFolder() {
    if (!confirm(`Delete ALL messages in ${folder}? This cannot be undone.`)) return;
    try {
      const r = await emptyFn({ data: { folder } });
      toast.success(`Deleted ${r.deleted} message(s)`);
      setSelected(new Set()); setOpenId(null);
      qc.invalidateQueries({ queryKey: ["admin-mail"] });
    } catch (e) { toast.error(e instanceof Error ? e.message : "Could not empty folder"); }
  }

  function startCompose(patch: Partial<Draft> = {}) { setCompose({ ...emptyDraft, ...patch }); }
  function reply(m: EmailMessage) {
    const target = m.direction === "inbound" ? m.fromAddr : m.toAddr;
    startCompose({
      to: firstEmail(target), inReplyTo: m.messageId, subject: m.subject.startsWith("Re:") ? m.subject : `Re: ${m.subject}`,
      html: `<br><br><blockquote style="border-left:3px solid #ccc;padding-left:12px;color:#666">${m.html}</blockquote>`,
    });
  }
  function forward(m: EmailMessage) {
    startCompose({ subject: m.subject.startsWith("Fwd:") ? m.subject : `Fwd: ${m.subject}`, html: `<br><br>---------- Forwarded ----------<br>${m.html}`, attachments: m.attachments.map((a) => ({ filename: a.filename, url: a.url })) });
  }

  const FOLDERS: { key: Folder; label: string; icon: typeof Inbox; badge?: number }[] = [
    { key: "inbox", label: "Inbox", icon: Inbox, badge: counts.inboxUnread },
    { key: "sent", label: "Sent", icon: Send },
    { key: "drafts", label: "Drafts", icon: FileText },
  ];

  return (
    <div className="pb-10">
      <div className="flex items-center justify-between gap-3 mb-4">
        <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2"><MailIcon className="h-6 w-6" /> Email</h1>
        <div className="flex items-center gap-2">
          {selected.size > 0 && (
            <button onClick={deleteSelected} className="text-sm inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-destructive/40 text-destructive hover:bg-destructive/10">
              <Trash2 className="h-4 w-4" /> Delete {selected.size} selected
            </button>
          )}
          {messages.length > 0 && !open && (
            <button onClick={emptyFolder} className="text-sm px-3 py-1.5 rounded-md border hover:bg-muted" title={`Delete every message in ${folder}`}>Empty {folder}</button>
          )}
          <button onClick={() => refetch()} className="text-sm inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border hover:bg-muted"><RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} /> Refresh</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-4">
        {/* Sidebar */}
        <div className="space-y-2">
          <button onClick={() => startCompose()} className="w-full inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground rounded-lg px-4 py-2.5 font-semibold hover:bg-primary/90"><PenSquare className="h-4 w-4" /> Compose</button>
          <div className="border rounded-xl overflow-hidden bg-card">
            {FOLDERS.map((f) => {
              const Icon = f.icon;
              const active = folder === f.key;
              return (
                <button key={f.key} onClick={() => { setFolder(f.key); setOpenId(null); setSelected(new Set()); }} className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-sm border-b last:border-b-0 ${active ? "bg-primary/10 text-primary font-semibold" : "hover:bg-muted"}`}>
                  <Icon className="h-4 w-4" /> {f.label}
                  {!!f.badge && f.badge > 0 && <span className="ml-auto bg-primary text-primary-foreground text-[10px] font-bold rounded-full px-1.5 py-0.5">{f.badge}</span>}
                </button>
              );
            })}
          </div>
          {folder === "inbox" && counts.inbox === 0 && (
            <div className="text-xs text-muted-foreground border rounded-xl p-3 bg-amber-50 border-amber-200 flex gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-amber-600" />
              <span>Inbox is empty. Receiving email requires the MX record + inbound setup — see Admin → Help &amp; Docs → Email.</span>
            </div>
          )}
        </div>

        {/* List + reader */}
        <div className="border rounded-xl bg-card min-h-[420px] overflow-hidden">
          {open ? (
            <MessageView m={open} onBack={() => setOpenId(null)} onReply={() => reply(open)} onForward={() => forward(open)} onDelete={() => { if (confirm("Delete this message? This cannot be undone.")) del.mutate(open.id); }} />
          ) : messages.length === 0 ? (
            <div className="p-12 text-center text-sm text-muted-foreground">{isFetching ? "Loading…" : `No messages in ${folder}.`}</div>
          ) : (
            <ul className="divide-y">
              {messages.length > 0 && (
                <li className="flex items-center gap-3 px-4 py-2 bg-muted/40 text-xs">
                  <input type="checkbox" aria-label="Select all"
                    checked={selected.size === messages.length && messages.length > 0}
                    onChange={(e) => setSelected(e.target.checked ? new Set(messages.map((m) => m.id)) : new Set())} />
                  <span className="text-muted-foreground">{selected.size > 0 ? `${selected.size} selected` : "Select all"}</span>
                </li>
              )}
              {messages.map((m) => (
                <li key={m.id} className="flex items-center gap-2 pr-2 hover:bg-muted/60 group">
                  <input type="checkbox" aria-label={`Select ${m.subject || "message"}`} className="ml-4 shrink-0"
                    checked={selected.has(m.id)} onChange={() => toggleSel(m.id)} onClick={(e) => e.stopPropagation()} />
                  <button onClick={() => (folder === "drafts" ? startCompose({ id: m.id, to: m.toAddr, cc: m.cc, bcc: m.bcc, subject: m.subject, html: m.html, inReplyTo: m.inReplyTo, attachments: m.attachments.map((a) => ({ filename: a.filename, url: a.url })), showCc: !!(m.cc || m.bcc) }) : setOpenId(m.id))} className="min-w-0 flex-1 text-left px-2 py-3 flex items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`truncate text-sm ${m.isRead ? "" : "font-bold"}`}>{folder === "inbox" ? firstEmail(m.fromAddr) : firstEmail(m.toAddr)}</span>
                        {m.status === "failed" && <span className="text-[10px] font-bold text-destructive border border-destructive/40 rounded px-1">FAILED</span>}
                        {m.attachments.length > 0 && <Paperclip className="h-3 w-3 text-muted-foreground shrink-0" />}
                      </div>
                      <div className={`truncate text-sm ${m.isRead ? "text-muted-foreground" : "font-semibold"}`}>{m.subject || "(no subject)"}</div>
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0">{new Date(m.createdAt).toLocaleDateString()}</span>
                  </button>
                  <button onClick={() => { if (confirm("Delete this message? This cannot be undone.")) del.mutate(m.id); }} title="Delete" className="p-2 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 focus:opacity-100 transition">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {compose && <ComposeModal draft={compose} setDraft={setCompose} recipients={recipients} onClose={() => setCompose(null)} onSent={() => { setCompose(null); qc.invalidateQueries({ queryKey: ["admin-mail"] }); setFolder("sent"); }} onDraftSaved={() => qc.invalidateQueries({ queryKey: ["admin-mail"] })} />}
    </div>
  );
}

function MessageView({ m, onBack, onReply, onForward, onDelete }: { m: EmailMessage; onBack: () => void; onReply: () => void; onForward: () => void; onDelete: () => void }) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 p-3 border-b flex-wrap">
        <button onClick={onBack} className="text-sm px-2.5 py-1.5 rounded-md border hover:bg-muted">← Back</button>
        <button onClick={onReply} className="text-sm inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border hover:bg-muted"><Reply className="h-4 w-4" /> Reply</button>
        <button onClick={onForward} className="text-sm inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border hover:bg-muted"><Forward className="h-4 w-4" /> Forward</button>
        <button onClick={onDelete} className="ml-auto text-sm inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-destructive/40 text-destructive hover:bg-destructive/10"><Trash2 className="h-4 w-4" /> Delete</button>
      </div>
      <div className="p-4 border-b text-sm space-y-0.5">
        <h2 className="text-lg font-bold mb-1">{m.subject || "(no subject)"}</h2>
        <div><span className="text-muted-foreground">From:</span> {m.fromAddr || "—"}</div>
        <div><span className="text-muted-foreground">To:</span> {m.toAddr}</div>
        {m.cc && <div><span className="text-muted-foreground">Cc:</span> {m.cc}</div>}
        <div className="text-xs text-muted-foreground">{new Date(m.createdAt).toLocaleString()} · {m.status}{m.status === "failed" && m.errorText ? ` — ${m.errorText}` : ""}</div>
        {m.attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-2">
            {m.attachments.map((a, i) => (
              <a key={i} href={a.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-xs border rounded-md px-2.5 py-1.5 hover:bg-muted"><Paperclip className="h-3.5 w-3.5" /> {a.filename}</a>
            ))}
          </div>
        )}
      </div>
      <iframe title="email" sandbox="" srcDoc={m.html || `<pre>${m.textBody}</pre>`} className="w-full flex-1 min-h-[360px] bg-white" />
    </div>
  );
}

function ComposeModal({ draft, setDraft, recipients, onClose, onSent, onDraftSaved }: { draft: Draft; setDraft: (d: Draft) => void; recipients: { email: string; name: string }[]; onClose: () => void; onSent: () => void; onDraftSaved: () => void }) {
  const sendFn = useServerFn(adminSendMail);
  const uploadFn = useServerFn(adminMailUpload);
  const draftFn = useServerFn(adminSaveDraft);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const set = (patch: Partial<Draft>) => setDraft({ ...draft, ...patch });
  const recipOptions = useMemo(() => recipients.slice(0, 500), [recipients]);

  async function onFiles(files: FileList | null) {
    if (!files || !files.length) return;
    setUploading(true);
    try {
      // Accumulate locally: setDraft closes over a stale `draft` inside the loop,
      // so calling it per file would keep only the last attachment.
      const added: { filename: string; url: string }[] = [];
      for (const file of Array.from(files)) {
        const dataUrl: string = await new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result)); r.onerror = rej; r.readAsDataURL(file); });
        const up = await uploadFn({ data: { filename: file.name, dataUrl } });
        added.push({ filename: up.name || file.name, url: up.url });
      }
      if (added.length) setDraft({ ...draft, attachments: [...draft.attachments, ...added] });
    } catch (e) { toast.error(e instanceof Error ? e.message : "Upload failed (images & PDF only)"); }
    finally { setUploading(false); }
  }

  async function saveDraft() {
    setBusy(true);
    try {
      const res = await draftFn({ data: { id: draft.id, to: draft.to.trim(), cc: draft.cc.trim(), bcc: draft.bcc.trim(), subject: draft.subject.trim(), html: draft.html, inReplyTo: draft.inReplyTo, attachments: draft.attachments } });
      setDraft({ ...draft, id: res.id });
      toast.success("Draft saved");
      onDraftSaved();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Could not save draft"); }
    finally { setBusy(false); }
  }

  async function send() {
    if (!draft.to.trim()) return toast.error("Add a recipient.");
    setBusy(true);
    try {
      await sendFn({ data: { to: draft.to.trim(), cc: draft.cc.trim(), bcc: draft.bcc.trim(), subject: draft.subject.trim(), html: draft.html, inReplyTo: draft.inReplyTo, attachments: draft.attachments } });
      toast.success("Email sent");
      onSent();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Send failed"); }
    finally { setBusy(false); }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-start justify-center p-4 overflow-y-auto" onClick={onClose}>
      <div className="bg-background rounded-2xl shadow-xl w-full max-w-2xl my-8" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-bold">New message</h3>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-muted"><X className="h-5 w-5" /></button>
        </div>
        <div className="p-4 space-y-3">
          <div>
            <input value={draft.to} onChange={(e) => set({ to: e.target.value })} list="mail-recips" placeholder="To (email address)" className="w-full border rounded-md px-3 py-2 text-sm" />
            <datalist id="mail-recips">{recipOptions.map((r, i) => <option key={i} value={r.email}>{r.name}</option>)}</datalist>
          </div>
          {!draft.showCc ? (
            <button onClick={() => set({ showCc: true })} className="text-xs text-primary font-semibold">+ Cc / Bcc</button>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <input value={draft.cc} onChange={(e) => set({ cc: e.target.value })} placeholder="Cc" className="border rounded-md px-3 py-2 text-sm" />
              <input value={draft.bcc} onChange={(e) => set({ bcc: e.target.value })} placeholder="Bcc" className="border rounded-md px-3 py-2 text-sm" />
            </div>
          )}
          <input value={draft.subject} onChange={(e) => set({ subject: e.target.value })} placeholder="Subject" className="w-full border rounded-md px-3 py-2 text-sm" />
          <RichTextEditor value={draft.html} onChange={(v) => set({ html: v })} placeholder="Write your message…" />
          {draft.attachments.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {draft.attachments.map((a, i) => (
                <span key={i} className="inline-flex items-center gap-1.5 text-xs border rounded-md px-2.5 py-1.5 bg-muted/50">
                  <Paperclip className="h-3.5 w-3.5" /> {a.filename}
                  <button onClick={() => set({ attachments: draft.attachments.filter((_, j) => j !== i) })} className="text-destructive hover:opacity-70"><X className="h-3.5 w-3.5" /></button>
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 p-4 border-t">
          <button onClick={send} disabled={busy} className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-md font-semibold hover:bg-primary/90 disabled:opacity-60"><Send className="h-4 w-4" /> {busy ? "Sending…" : "Send"}</button>
          <button onClick={saveDraft} disabled={busy} className="text-sm px-3 py-2 rounded-md border hover:bg-muted disabled:opacity-60">Save draft</button>
          <label className="inline-flex items-center gap-1.5 text-sm px-3 py-2 rounded-md border hover:bg-muted cursor-pointer">
            <Paperclip className="h-4 w-4" /> {uploading ? "Uploading…" : "Attach"}
            <input type="file" multiple className="hidden" onChange={(e) => onFiles(e.target.files)} accept="image/*,application/pdf" />
          </label>
          <span className="text-xs text-muted-foreground ml-auto">From your store address</span>
        </div>
      </div>
    </div>
  );
}
