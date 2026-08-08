import { useMemo, useState } from "react";
import { Search, X, Languages, ChevronRight } from "lucide-react";
import { TEMPLATE_CATEGORIES, renderTemplate, type EmailTemplate, type TemplateCategory } from "@/lib/email-templates";
import { EMAIL_TEMPLATES, PINNED_TEMPLATE_IDS } from "@/lib/email-templates.data";

/**
 * Template chooser for the mail composer.
 *
 * Shows the body exactly as the template will render it, filled with whatever
 * the composer already knows (recipient name, order number). Picking one
 * replaces the subject and body — never the recipient — so it is safe to
 * change your mind halfway through a reply.
 */
export default function TemplatePicker({
  vars, onPick, onClose,
}: {
  vars: Record<string, string | undefined>;
  onPick: (subject: string, body: string) => void;
  onClose: () => void;
}) {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<TemplateCategory | "all">("all");
  const [lang, setLang] = useState<"en" | "bn">("en");
  const [sel, setSel] = useState<EmailTemplate | null>(null);

  const list = useMemo(() => {
    const term = q.trim().toLowerCase();
    const matched = EMAIL_TEMPLATES.filter((t) => {
      if (cat !== "all" && t.category !== cat) return false;
      if (!term) return true;
      return `${t.name} ${t.description} ${t.subject} ${t.subjectBn}`.toLowerCase().includes(term);
    });
    // Pinned first, but only in the unfiltered view — once someone searches or
    // picks a category they want relevance, not our opinion of what's popular.
    if (term || cat !== "all") return matched;
    const rank = (t: EmailTemplate) => {
      const i = PINNED_TEMPLATE_IDS.indexOf(t.id);
      return i === -1 ? 999 : i;
    };
    return [...matched].sort((a, b) => rank(a) - rank(b));
  }, [q, cat]);

  const preview = sel ? renderTemplate(sel, vars, lang) : null;

  const counts = useMemo(() => {
    const m = new Map<string, number>();
    for (const t of EMAIL_TEMPLATES) m.set(t.category, (m.get(t.category) ?? 0) + 1);
    return m;
  }, []);

  return (
    <div className="fixed inset-0 z-[70] bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-card border rounded-lg shadow-2xl w-full max-w-4xl h-[min(80vh,640px)] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-4 h-14 border-b shrink-0">
          <h3 className="text-sm font-semibold">Choose a template</h3>
          <span className="text-xs text-muted-foreground">{EMAIL_TEMPLATES.length} available</span>
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => setLang((l) => (l === "en" ? "bn" : "en"))}
              className="inline-flex items-center gap-1.5 text-xs font-medium border rounded-md px-2.5 py-1.5 hover:bg-muted"
              title="Switch template language"
            >
              <Languages className="h-3.5 w-3.5" />
              {lang === "en" ? "English" : "বাংলা"}
            </button>
            <button onClick={onClose} className="p-1.5 rounded-md hover:bg-muted"><X className="h-4 w-4" /></button>
          </div>
        </div>

        <div className="flex-1 min-h-0 grid sm:grid-cols-[210px_minmax(0,1fr)_minmax(0,1.15fr)]">
          {/* Categories */}
          <div className="hidden sm:block border-r overflow-y-auto py-2">
            <CatRow label="All templates" count={EMAIL_TEMPLATES.length} active={cat === "all"} onClick={() => setCat("all")} />
            {TEMPLATE_CATEGORIES.map((c) => (
              <CatRow
                key={c.id}
                label={c.label}
                hint={c.hint}
                count={counts.get(c.id) ?? 0}
                active={cat === c.id}
                onClick={() => setCat(c.id)}
              />
            ))}
          </div>

          {/* List */}
          <div className="border-r flex flex-col min-h-0">
            <div className="p-2 border-b shrink-0">
              <div className="relative">
                <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  autoFocus
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search templates…"
                  className="w-full border rounded-md pl-8 pr-2 py-1.5 text-sm"
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {list.length === 0 && (
                <p className="text-xs text-muted-foreground p-4 text-center">No template matches “{q}”.</p>
              )}
              {list.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setSel(t)}
                  onDoubleClick={() => { const r = renderTemplate(t, vars, lang); onPick(r.subject, r.body); }}
                  className={`w-full text-left px-3 py-2.5 border-b last:border-b-0 flex items-start gap-2 ${sel?.id === t.id ? "bg-accent" : "hover:bg-muted/60"}`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{t.name}</p>
                    <p className="text-xs text-muted-foreground line-clamp-2">{t.description}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                </button>
              ))}
            </div>
          </div>

          {/* Preview */}
          <div className="flex flex-col min-h-0">
            {!sel || !preview ? (
              <div className="flex-1 grid place-items-center p-6 text-center">
                <p className="text-xs text-muted-foreground">Select a template to preview it.<br />Double-click to insert straight away.</p>
              </div>
            ) : (
              <>
                <div className="p-3 border-b shrink-0">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Subject</p>
                  <p className="text-sm font-medium mt-0.5 break-words">{preview.subject}</p>
                </div>
                <div
                  className="flex-1 overflow-y-auto p-4 text-sm prose-content"
                  dangerouslySetInnerHTML={{ __html: preview.body }}
                />
                {sel.variables.length > 0 && (
                  <div className="px-3 py-2 border-t shrink-0">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">Fills in</p>
                    <div className="flex flex-wrap gap-1">
                      {sel.variables.map((v) => (
                        <span
                          key={v}
                          className={`text-[10px] rounded px-1.5 py-0.5 border ${vars[v] ? "bg-accent text-accent-foreground border-transparent" : "text-muted-foreground"}`}
                          title={vars[v] ? `Known: ${vars[v]}` : "You'll need to fill this in"}
                        >
                          {v}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                <div className="p-3 border-t shrink-0">
                  <button
                    onClick={() => onPick(preview.subject, preview.body)}
                    className="w-full bg-primary text-primary-foreground text-sm font-semibold py-2 rounded-md hover:bg-primary/90"
                  >
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

function CatRow({ label, hint, count, active, onClick }: { label: string; hint?: string; count: number; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-3 py-2 flex items-center gap-2 ${active ? "bg-accent text-accent-foreground" : "hover:bg-muted/60"}`}
    >
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium truncate">{label}</p>
        {hint && <p className="text-[11px] text-muted-foreground truncate">{hint}</p>}
      </div>
      <span className="text-[10px] text-muted-foreground tabular-nums">{count}</span>
    </button>
  );
}
