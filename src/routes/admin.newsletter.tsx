import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  Megaphone, Send, Eye, Pencil, Zap, Users, Clock, CheckCircle2, AlertCircle,
  LayoutTemplate, Languages, RefreshCw, Play, Download, Trash2, Plus, X,
} from "lucide-react";
import { RichTextEditor } from "@/components/admin/RichTextEditor";
import {
  adminNewsletterOverview, adminSendNewsletter, adminTestNewsletter, adminPreviewDigest,
  adminSendDigestNow, adminSaveAutomation, adminRunAnnouncements,
  adminSubscribers, adminSetSubscriberStatus, adminAddSubscribers, adminDeleteSubscriber,
} from "@/lib/newsletter.functions";
import { NEWSLETTER_TEMPLATES, NEWSLETTER_GROUPS, type NewsletterTemplate } from "@/lib/newsletter-templates.data";
import { fillTemplate, unfilledVariables, KNOWN_VARIABLES } from "@/lib/email-templates";

export const Route = createFileRoute("/admin/newsletter")({ component: NewsletterPage });

type Tab = "compose" | "campaigns" | "automation" | "subscribers";
type Topic = "all" | "products" | "blog" | "recipes" | "offers" | "digest";

const TOPICS: { id: Topic; label: string }[] = [
  { id: "all", label: "Everyone" },
  { id: "digest", label: "Weekly list" },
  { id: "products", label: "New items" },
  { id: "offers", label: "Offers" },
  { id: "recipes", label: "Recipes" },
  { id: "blog", label: "Blog" },
];

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

// Filled per recipient at send time, so they are not the sender's job.
const PER_RECIPIENT = new Set(["customer_name", "unsubscribe_url", "preferences_url"]);

function NewsletterPage() {
  const [tab, setTab] = useState<Tab>("compose");
  const overviewFn = useServerFn(adminNewsletterOverview);
  const [overview, setOverview] = useState<Awaited<ReturnType<typeof adminNewsletterOverview>> | null>(null);

  const reload = useCallback(() => {
    overviewFn().then(setOverview).catch((e) => toast.error(e instanceof Error ? e.message : "Failed to load"));
  }, [overviewFn]);
  useEffect(() => { reload(); }, [reload]);

  const stats = overview?.stats;

  return (
    <div className="pb-16">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
            <Megaphone className="h-6 w-6" /> Newsletter
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {stats ? `${stats.active} subscribed · ${stats.unsubscribed} opted out` : "Loading…"}
          </p>
        </div>
        <button onClick={reload} className="inline-flex items-center gap-2 text-sm border rounded-md px-3 py-2 hover:bg-muted">
          <RefreshCw className="h-4 w-4" /> Refresh
        </button>
      </div>

      <div className="flex gap-1 border-b mb-5 overflow-x-auto">
        {([["compose", "Compose"], ["campaigns", "History"], ["automation", "Automation"], ["subscribers", "Subscribers"]] as const).map(([k, l]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px whitespace-nowrap ${tab === k ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
          >
            {l}
          </button>
        ))}
      </div>

      {tab === "compose" && <Compose stats={stats} onSent={reload} />}
      {tab === "campaigns" && <Campaigns campaigns={overview?.campaigns ?? []} />}
      {tab === "automation" && <Automation current={overview?.automation} onSaved={reload} />}
      {tab === "subscribers" && <Subscribers />}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Compose
 * ------------------------------------------------------------------ */

function Compose({ stats, onSent }: { stats?: { active: number; byTopic: Record<string, number> }; onSent: () => void }) {
  const sendFn = useServerFn(adminSendNewsletter);
  const testFn = useServerFn(adminTestNewsletter);

  const [topic, setTopic] = useState<Topic>("all");
  const [subject, setSubject] = useState("");
  const [html, setHtml] = useState("");
  const [lang, setLang] = useState<"en" | "bn">("en");
  const [picker, setPicker] = useState(false);
  const [preview, setPreview] = useState(false);
  const [busy, setBusy] = useState(false);
  const [vars, setVars] = useState<Record<string, string>>({});
  const [raw, setRaw] = useState<{ subject: string; body: string } | null>(null);

  // Anything the sender still has to supply. The per-recipient variables are
  // resolved at send time, so they are not the sender's problem.
  const missing = useMemo(
    () => unfilledVariables(subject, html).filter((v) => !PER_RECIPIENT.has(v)),
    [subject, html],
  );

  const reach = topic === "all" ? (stats?.active ?? 0) : (stats?.byTopic?.[topic] ?? 0);

  function applyTemplate(t: NewsletterTemplate) {
    const s = lang === "bn" && t.subjectBn ? t.subjectBn : t.subject;
    const b = lang === "bn" && t.bodyBn ? t.bodyBn : t.body;
    setRaw({ subject: s, body: b });
    setSubject(s);
    setHtml(b);
    setVars({});
    setPicker(false);
  }

  // Re-substitute from the pristine template each time, so a typo can be fixed.
  function setVar(name: string, value: string) {
    const next = { ...vars, [name]: value };
    setVars(next);
    if (!raw) return;
    setSubject(fillTemplate(raw.subject, next));
    setHtml(fillTemplate(raw.body, next));
  }

  async function send() {
    if (!subject.trim() || !html.trim()) return toast.error("Add a subject and a message.");
    if (missing.length) return toast.error(`Fill in ${missing.map((m) => `{{${m}}}`).join(", ")} first.`);
    if (!reach) return toast.error("Nobody is subscribed to that topic yet.");
    if (!confirm(`Send "${subject}" to ${reach} subscriber${reach === 1 ? "" : "s"}?\n\nThis cannot be undone.`)) return;
    setBusy(true);
    try {
      const r = await sendFn({ data: { subject: subject.trim(), html, topic } });
      toast.success(`Queued for ${r.audience} subscriber${r.audience === 1 ? "" : "s"}`);
      setSubject(""); setHtml(""); setRaw(null); setVars({});
      onSent();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not send");
    } finally { setBusy(false); }
  }

  async function test() {
    const to = prompt("Send a test copy to which address?");
    if (!to) return;
    setBusy(true);
    try {
      await testFn({ data: { to, subject: subject.trim() || "(no subject)", html: html || "<p>(empty)</p>" } });
      toast.success(`Test sent to ${to}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Test failed");
    } finally { setBusy(false); }
  }

  return (
    <div className="grid lg:grid-cols-[1fr_260px] gap-5">
      <div className="border rounded-xl bg-card overflow-hidden">
        <div className="flex items-center gap-1.5 px-3 py-2 border-b bg-muted/30">
          <button onClick={() => setPicker(true)} className="inline-flex items-center gap-1.5 text-xs font-medium border rounded-md px-2.5 py-1.5 bg-card hover:bg-muted">
            <LayoutTemplate className="h-3.5 w-3.5" /> Templates
          </button>
          <button onClick={() => setPreview((v) => !v)} className={`inline-flex items-center gap-1.5 text-xs font-medium border rounded-md px-2.5 py-1.5 ${preview ? "bg-primary text-primary-foreground border-primary" : "bg-card hover:bg-muted"}`}>
            {preview ? <Pencil className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />} {preview ? "Edit" : "Preview"}
          </button>
          <button onClick={() => setLang((l) => (l === "en" ? "bn" : "en"))} className="inline-flex items-center gap-1.5 text-xs font-medium border rounded-md px-2.5 py-1.5 bg-card hover:bg-muted" title="Language used when inserting a template">
            <Languages className="h-3.5 w-3.5" /> {lang === "en" ? "English" : "বাংলা"}
          </button>
        </div>

        <div className="flex items-center gap-2 px-3 border-b">
          <span className="text-xs text-muted-foreground w-16 shrink-0">Subject</span>
          <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="What is this email about?" className="w-full bg-transparent border-0 outline-none text-sm py-2.5 font-medium" />
        </div>

        {missing.length > 0 && (
          <div className="px-3 py-2.5 border-b bg-amber-50 dark:bg-amber-950/30">
            <p className="text-[11px] font-semibold text-amber-900 dark:text-amber-200 mb-1.5">Fill in before sending</p>
            <div className="grid sm:grid-cols-2 gap-1.5">
              {missing.map((v) => (
                <label key={v} className="flex items-center gap-1.5">
                  <span className="text-[11px] text-amber-900/80 dark:text-amber-200/80 w-28 shrink-0 truncate" title={v}>
                    {KNOWN_VARIABLES[v] ?? v}
                  </span>
                  <input value={vars[v] ?? ""} onChange={(e) => setVar(v, e.target.value)} placeholder={`{{${v}}}`} className="flex-1 min-w-0 border rounded px-2 py-1 text-xs bg-card" />
                </label>
              ))}
            </div>
          </div>
        )}

        <div className="min-h-[300px]">
          {preview ? (
            <div className="p-4 prose-content text-sm max-h-[55vh] overflow-y-auto" dangerouslySetInnerHTML={{ __html: html || "<p>Nothing to preview yet.</p>" }} />
          ) : (
            <RichTextEditor value={html} onChange={setHtml} placeholder="Write your newsletter, or start from a template…" />
          )}
        </div>
      </div>

      <div className="space-y-4">
        <div className="border rounded-xl bg-card p-4">
          <p className="text-xs font-semibold mb-2">Send to</p>
          <div className="space-y-1">
            {TOPICS.map((t) => {
              const n = t.id === "all" ? (stats?.active ?? 0) : (stats?.byTopic?.[t.id] ?? 0);
              return (
                <label key={t.id} className="flex items-center gap-2 text-sm cursor-pointer py-1">
                  <input type="radio" checked={topic === t.id} onChange={() => setTopic(t.id)} className="accent-[var(--primary)]" />
                  <span className="flex-1">{t.label}</span>
                  <span className="text-xs text-muted-foreground tabular-nums">{n}</span>
                </label>
              );
            })}
          </div>
          <p className="text-[11px] text-muted-foreground mt-2 pt-2 border-t">
            Only people who opted into that topic and have not unsubscribed.
          </p>
        </div>

        <div className="border rounded-xl bg-card p-4 space-y-2">
          <button onClick={send} disabled={busy || !reach} className="w-full inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground text-sm font-semibold py-2.5 rounded-md hover:bg-primary/90 disabled:opacity-60">
            <Send className="h-4 w-4" /> {busy ? "Working…" : `Send to ${reach}`}
          </button>
          <button onClick={test} disabled={busy} className="w-full text-sm border rounded-md py-2 hover:bg-muted disabled:opacity-60">
            Send a test copy
          </button>
          <p className="text-[11px] text-muted-foreground">
            Every copy is wrapped in your branded layout and carries its own unsubscribe link.
          </p>
        </div>
      </div>

      {picker && <TemplatePick lang={lang} onPick={applyTemplate} onClose={() => setPicker(false)} />}
    </div>
  );
}

function TemplatePick({ lang, onPick, onClose }: { lang: "en" | "bn"; onPick: (t: NewsletterTemplate) => void; onClose: () => void }) {
  const [sel, setSel] = useState<NewsletterTemplate | null>(null);
  const body = sel ? (lang === "bn" && sel.bodyBn ? sel.bodyBn : sel.body) : "";

  return (
    <div className="fixed inset-0 z-[70] bg-black/50 grid place-items-center p-4" onClick={onClose}>
      <div className="bg-card border rounded-lg shadow-2xl w-full max-w-4xl h-[min(80vh,620px)] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 px-4 h-14 border-b shrink-0">
          <h3 className="text-sm font-semibold">Newsletter templates</h3>
          <span className="text-xs text-muted-foreground">{NEWSLETTER_TEMPLATES.length} available</span>
          <button onClick={onClose} className="ml-auto p-1.5 rounded-md hover:bg-muted"><X className="h-4 w-4" /></button>
        </div>
        <div className="flex-1 min-h-0 grid sm:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
          <div className="border-r overflow-y-auto">
            {NEWSLETTER_GROUPS.map((g) => {
              const items = NEWSLETTER_TEMPLATES.filter((t) => t.group === g.id);
              if (!items.length) return null;
              return (
                <div key={g.id}>
                  <div className="px-3 py-2 bg-muted/50 sticky top-0">
                    <p className="text-[11px] font-bold uppercase tracking-wide">{g.label}</p>
                    <p className="text-[10px] text-muted-foreground">{g.hint}</p>
                  </div>
                  {items.map((t) => (
                    <button key={t.id} onClick={() => setSel(t)} className={`w-full text-left px-3 py-2.5 border-b ${sel?.id === t.id ? "bg-accent" : "hover:bg-muted/60"}`}>
                      <p className="text-sm font-medium">{t.name}</p>
                      <p className="text-xs text-muted-foreground line-clamp-2">{t.description}</p>
                    </button>
                  ))}
                </div>
              );
            })}
          </div>
          <div className="flex flex-col min-h-0">
            {!sel ? (
              <div className="flex-1 grid place-items-center p-6">
                <p className="text-xs text-muted-foreground text-center">Pick a template to preview it.</p>
              </div>
            ) : (
              <>
                <div className="p-3 border-b shrink-0">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Subject</p>
                  <p className="text-sm font-medium mt-0.5 break-words">{lang === "bn" && sel.subjectBn ? sel.subjectBn : sel.subject}</p>
                </div>
                <div className="flex-1 overflow-y-auto p-4 text-sm prose-content" dangerouslySetInnerHTML={{ __html: body }} />
                <div className="p-3 border-t shrink-0">
                  <button onClick={() => onPick(sel)} className="w-full bg-primary text-primary-foreground text-sm font-semibold py-2 rounded-md hover:bg-primary/90">
                    Use this template
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * History
 * ------------------------------------------------------------------ */

type Campaign = { id: string; subject: string; topic: string; kind: string; status: string; audience: number; sent: number; failed: number; lastError: string; createdAt: string; sentAt: string };

function Campaigns({ campaigns }: { campaigns: Campaign[] }) {
  if (!campaigns.length) {
    return <div className="border-2 border-dashed rounded-xl p-12 text-center text-sm text-muted-foreground">No newsletters sent yet.</div>;
  }
  const badge = (s: string) =>
    s === "sent" ? "bg-emerald-100 text-emerald-700" :
    s === "sending" ? "bg-blue-100 text-blue-700" :
    s === "failed" ? "bg-red-100 text-red-700" : "bg-muted text-muted-foreground";

  return (
    <div className="border rounded-xl bg-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs">
            <tr>
              <th className="text-left font-semibold px-4 py-2.5">Subject</th>
              <th className="text-left font-semibold px-4 py-2.5">Audience</th>
              <th className="text-left font-semibold px-4 py-2.5">Result</th>
              <th className="text-left font-semibold px-4 py-2.5">When</th>
            </tr>
          </thead>
          <tbody>
            {campaigns.map((c) => (
              <tr key={c.id} className="border-t">
                <td className="px-4 py-2.5">
                  <p className="font-medium">{c.subject || "(no subject)"}</p>
                  <p className="text-xs text-muted-foreground">
                    {c.kind === "manual" ? "Written by hand" : c.kind === "digest" ? "Weekly digest" : "Automatic"} · {c.topic}
                  </p>
                  {c.lastError && <p className="text-xs text-destructive mt-0.5">{c.lastError}</p>}
                </td>
                <td className="px-4 py-2.5 tabular-nums">{c.audience}</td>
                <td className="px-4 py-2.5">
                  <span className={`text-[11px] font-semibold rounded px-1.5 py-0.5 ${badge(c.status)}`}>{c.status}</span>
                  <span className="text-xs text-muted-foreground ml-2 tabular-nums">
                    {c.sent} sent{c.failed > 0 ? `, ${c.failed} failed` : ""}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-xs text-muted-foreground whitespace-nowrap">
                  {(c.sentAt || c.createdAt || "").slice(0, 16).replace("T", " ")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Automation
 * ------------------------------------------------------------------ */

type Auto = { products: boolean; blog: boolean; recipes: boolean; priceDrops: boolean; weeklyDigest: boolean; digestDay: number; minPriceDropPercent: number };

function Automation({ current, onSaved }: { current?: Auto; onSaved: () => void }) {
  const saveFn = useServerFn(adminSaveAutomation);
  const runFn = useServerFn(adminRunAnnouncements);
  const previewFn = useServerFn(adminPreviewDigest);
  const digestNowFn = useServerFn(adminSendDigestNow);

  const [cfg, setCfg] = useState<Auto>(current ?? { products: false, blog: false, recipes: false, priceDrops: false, weeklyDigest: false, digestDay: 5, minPriceDropPercent: 5 });
  const [busy, setBusy] = useState(false);
  const [digest, setDigest] = useState<{ subject: string; html: string; productCount: number } | null>(null);

  useEffect(() => { if (current) setCfg(current); }, [current]);

  const ROWS: { key: keyof Auto; label: string; hint: string }[] = [
    { key: "products", label: "New products", hint: "When a new item goes live, tell everyone who opted into new items." },
    { key: "recipes", label: "New recipes", hint: "When a recipe is published." },
    { key: "blog", label: "New blog posts", hint: "When a post is published." },
    { key: "priceDrops", label: "Price drops", hint: "When a price comes down by more than the threshold below." },
    { key: "weeklyDigest", label: "Weekly product list", hint: "Every week, the full list of what's available with prices." },
  ];

  async function save() {
    setBusy(true);
    try {
      await saveFn({ data: cfg });
      toast.success("Automation saved");
      onSaved();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
    finally { setBusy(false); }
  }

  return (
    <div className="grid lg:grid-cols-[1fr_280px] gap-5">
      <div className="space-y-4">
        <div className="border rounded-xl bg-card p-5">
          <h2 className="font-bold mb-1 flex items-center gap-2"><Zap className="h-4 w-4 text-primary" /> Send automatically</h2>
          <p className="text-xs text-muted-foreground mb-4">
            The system checks every 15 minutes and emails subscribers when something changes.
            Each of these only reaches people who opted into that topic.
          </p>
          <div className="divide-y">
            {ROWS.map((r) => (
              <label key={r.key} className="flex items-start gap-3 py-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={Boolean(cfg[r.key])}
                  onChange={(e) => setCfg({ ...cfg, [r.key]: e.target.checked })}
                  className="mt-0.5 h-4 w-4 accent-[var(--primary)]"
                />
                <span className="min-w-0">
                  <span className="block text-sm font-semibold">{r.label}</span>
                  <span className="block text-xs text-muted-foreground">{r.hint}</span>
                </span>
              </label>
            ))}
          </div>

          <div className="grid sm:grid-cols-2 gap-4 mt-4 pt-4 border-t">
            <label className="block">
              <span className="text-xs font-semibold text-muted-foreground uppercase">Weekly list goes out on</span>
              <select value={cfg.digestDay} onChange={(e) => setCfg({ ...cfg, digestDay: Number(e.target.value) })} className="mt-1 w-full border rounded-md px-3 py-2 text-sm bg-card">
                {DAYS.map((d, i) => <option key={d} value={i}>{d}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-muted-foreground uppercase">Announce price drops over</span>
              <div className="flex items-center gap-2 mt-1">
                <input type="number" min={1} max={90} value={cfg.minPriceDropPercent} onChange={(e) => setCfg({ ...cfg, minPriceDropPercent: Number(e.target.value) || 5 })} className="w-full border rounded-md px-3 py-2 text-sm" />
                <span className="text-sm text-muted-foreground">%</span>
              </div>
            </label>
          </div>

          <div className="mt-4 rounded-lg bg-muted/50 p-3">
            <p className="text-xs text-muted-foreground">
              <strong>Nothing old gets mailed.</strong> When you save, the system marks everything that
              exists right now as already-seen, so switching on “new products” will not blast your whole
              catalogue. Only what appears after this point is announced.
            </p>
          </div>

          <button onClick={save} disabled={busy} className="mt-4 inline-flex items-center gap-2 bg-primary text-primary-foreground text-sm font-semibold px-5 py-2.5 rounded-md hover:bg-primary/90 disabled:opacity-60">
            {busy ? "Saving…" : "Save automation"}
          </button>
        </div>
      </div>

      <div className="space-y-4">
        <div className="border rounded-xl bg-card p-4 space-y-2">
          <p className="text-xs font-semibold mb-1">Weekly list</p>
          <button
            onClick={async () => {
              try { const d = await previewFn(); setDigest(d); }
              catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
            }}
            className="w-full text-sm border rounded-md py-2 hover:bg-muted inline-flex items-center justify-center gap-2"
          >
            <Eye className="h-4 w-4" /> Preview it
          </button>
          <button
            onClick={async () => {
              if (!confirm("Send this week's product list to everyone subscribed to it?")) return;
              try {
                const r = await digestNowFn();
                toast.success(r.id ? `Queued for ${r.audience} subscribers` : "Nothing in stock — not sent");
              } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
            }}
            className="w-full text-sm border rounded-md py-2 hover:bg-muted inline-flex items-center justify-center gap-2"
          >
            <Send className="h-4 w-4" /> Send it now
          </button>
        </div>

        <div className="border rounded-xl bg-card p-4">
          <p className="text-xs font-semibold mb-2">Announcements</p>
          <button
            onClick={async () => {
              try {
                const r = await runFn();
                toast.success(r.ran.length ? `Sent: ${r.ran.join(", ")}` : "Nothing new to announce");
              } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
            }}
            className="w-full text-sm border rounded-md py-2 hover:bg-muted inline-flex items-center justify-center gap-2"
          >
            <Play className="h-4 w-4" /> Check now
          </button>
          <p className="text-[11px] text-muted-foreground mt-2">
            Runs the same check the scheduler does, immediately.
          </p>
        </div>
      </div>

      {digest && (
        <div className="fixed inset-0 z-[70] bg-black/50 grid place-items-center p-4" onClick={() => setDigest(null)}>
          <div className="bg-card border rounded-lg shadow-2xl w-full max-w-2xl h-[min(85vh,760px)] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 px-4 h-14 border-b shrink-0">
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate">{digest.subject}</p>
                <p className="text-xs text-muted-foreground">{digest.productCount} products</p>
              </div>
              <button onClick={() => setDigest(null)} className="ml-auto p-1.5 rounded-md hover:bg-muted"><X className="h-4 w-4" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 bg-[#eef2f5]">
              <div className="bg-white rounded-lg p-6 max-w-[600px] mx-auto text-sm" dangerouslySetInnerHTML={{ __html: digest.html }} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Subscribers
 * ------------------------------------------------------------------ */

type Sub = { id: string; email: string; name: string; status: string; topics: Record<string, boolean>; source: string; createdAt: string; lastSentAt: string };

function Subscribers() {
  const listFn = useServerFn(adminSubscribers);
  const statusFn = useServerFn(adminSetSubscriberStatus);
  const addFn = useServerFn(adminAddSubscribers);
  const delFn = useServerFn(adminDeleteSubscriber);

  const [rows, setRows] = useState<Sub[]>([]);
  const [q, setQ] = useState("");
  const [adding, setAdding] = useState(false);
  const [bulk, setBulk] = useState("");

  const load = useCallback(() => {
    listFn().then(setRows).catch((e) => toast.error(e instanceof Error ? e.message : "Failed"));
  }, [listFn]);
  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    return t ? rows.filter((r) => `${r.email} ${r.name}`.toLowerCase().includes(t)) : rows;
  }, [rows, q]);

  function exportCsv() {
    const head = "email,name,status,source,subscribed,last_sent\n";
    const body = rows.map((r) => [r.email, r.name, r.status, r.source, r.createdAt.slice(0, 10), r.lastSentAt.slice(0, 10)].join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([head + body], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url; a.download = "subscribers.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search subscribers…" className="border rounded-md px-3 py-2 text-sm w-64" />
        <span className="text-xs text-muted-foreground">{filtered.length} shown</span>
        <div className="ml-auto flex gap-2">
          <button onClick={() => setAdding(true)} className="inline-flex items-center gap-2 text-sm border rounded-md px-3 py-2 hover:bg-muted"><Plus className="h-4 w-4" /> Add</button>
          <button onClick={exportCsv} disabled={!rows.length} className="inline-flex items-center gap-2 text-sm border rounded-md px-3 py-2 hover:bg-muted disabled:opacity-50"><Download className="h-4 w-4" /> Export CSV</button>
        </div>
      </div>

      <div className="border rounded-xl bg-card overflow-hidden">
        <div className="overflow-x-auto max-h-[65vh]">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs sticky top-0">
              <tr>
                <th className="text-left font-semibold px-4 py-2.5">Email</th>
                <th className="text-left font-semibold px-4 py-2.5">Topics</th>
                <th className="text-left font-semibold px-4 py-2.5">Joined</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => {
                const on = Object.entries(r.topics ?? {}).filter(([, v]) => v !== false).map(([k]) => k);
                return (
                  <tr key={r.id} className="border-t">
                    <td className="px-4 py-2.5">
                      <p className="font-medium">{r.email}</p>
                      <p className="text-xs text-muted-foreground">
                        {r.status === "active" ? <span className="text-emerald-600">Subscribed</span> : <span className="text-muted-foreground">Unsubscribed</span>}
                        {r.source !== "site" && ` · ${r.source}`}
                      </p>
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex flex-wrap gap-1">
                        {r.status === "active" && on.map((t) => (
                          <span key={t} className="text-[10px] rounded px-1.5 py-0.5 bg-muted">{t}</span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground whitespace-nowrap">{r.createdAt.slice(0, 10)}</td>
                    <td className="px-4 py-2.5 text-right whitespace-nowrap">
                      <button
                        onClick={async () => {
                          const next = r.status === "active" ? "unsubscribed" : "active";
                          await statusFn({ data: { id: r.id, status: next } });
                          setRows((p) => p.map((x) => (x.id === r.id ? { ...x, status: next } : x)));
                        }}
                        className="text-xs border rounded px-2 py-1 hover:bg-muted"
                      >
                        {r.status === "active" ? "Unsubscribe" : "Resubscribe"}
                      </button>
                      <button
                        onClick={async () => {
                          if (!confirm(`Permanently delete ${r.email}? Unsubscribing is usually the right choice — a deleted address can be re-added by the signup form.`)) return;
                          await delFn({ data: { id: r.id } });
                          setRows((p) => p.filter((x) => x.id !== r.id));
                        }}
                        className="ml-1 p-1.5 rounded hover:bg-muted text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {adding && (
        <div className="fixed inset-0 z-[70] bg-black/50 grid place-items-center p-4" onClick={() => setAdding(false)}>
          <div className="bg-card border rounded-lg shadow-2xl w-full max-w-md p-5" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold mb-1">Add subscribers</h3>
            <p className="text-xs text-muted-foreground mb-3">
              Paste addresses separated by commas, spaces or new lines. Only add people who asked to hear
              from you — mailing a bought list is the fastest way to get your domain blocked.
            </p>
            <textarea value={bulk} onChange={(e) => setBulk(e.target.value)} rows={6} className="w-full border rounded-md px-3 py-2 text-sm font-mono" placeholder="one@example.com&#10;two@example.com" />
            <div className="flex justify-end gap-2 mt-3">
              <button onClick={() => setAdding(false)} className="text-sm px-4 py-2 rounded-md border hover:bg-muted">Cancel</button>
              <button
                onClick={async () => {
                  try {
                    const r = await addFn({ data: { emails: bulk } });
                    toast.success(`${r.added} added${r.skipped ? `, ${r.skipped} already on the list` : ""}`);
                    setAdding(false); setBulk(""); load();
                  } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
                }}
                className="bg-primary text-primary-foreground text-sm font-semibold px-5 py-2 rounded-md"
              >
                Add
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
