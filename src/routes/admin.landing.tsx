import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { adminListLanding, adminGetLanding, adminSaveLanding, adminDeleteLanding } from "@/lib/landing.functions";
import type { LandingPage } from "@/lib/config-types";
import { LayoutTemplate, Plus, Save, Eye, ArrowLeft, Trash2, ExternalLink } from "lucide-react";
import { toast } from "sonner";
// GrapesJS editor styles (CSS-only import is SSR-safe; the JS is dynamically imported client-side).
import "grapesjs/dist/css/grapes.min.css";

export const Route = createFileRoute("/admin/landing")({ component: LandingAdmin });

function LandingAdmin() {
  const [editing, setEditing] = useState<string | "new" | null>(null);
  if (editing) return <Editor id={editing} onExit={() => setEditing(null)} />;
  return <LandingList onEdit={setEditing} />;
}

function LandingList({ onEdit }: { onEdit: (id: string | "new") => void }) {
  const qc = useQueryClient();
  const listFn = useServerFn(adminListLanding);
  const delFn = useServerFn(adminDeleteLanding);
  const { data: pages = [], isLoading } = useQuery({ queryKey: ["admin-landing"], queryFn: () => listFn() });

  async function remove(p: LandingPage) {
    if (!confirm(`Delete "${p.title}"? This cannot be undone.`)) return;
    try { await delFn({ data: { id: p.id } }); toast.success("Deleted"); qc.invalidateQueries({ queryKey: ["admin-landing"] }); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Delete failed"); }
  }

  return (
    <div className="pb-10 max-w-5xl">
      <div className="flex items-center justify-between gap-3 mb-1">
        <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2"><LayoutTemplate className="h-6 w-6" /> Landing Pages</h1>
        <button onClick={() => onEdit("new")} className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-md font-semibold hover:bg-primary/90"><Plus className="h-4 w-4" /> New landing page</button>
      </div>
      <p className="text-sm text-muted-foreground mb-6">Build fully custom pages with the drag-and-drop visual editor. Published pages are live at <code>/l/&lt;slug&gt;</code>.</p>

      {isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : pages.length === 0 ? (
        <div className="border rounded-2xl p-12 text-center bg-card">
          <LayoutTemplate className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground mb-4">No landing pages yet. Create your first one with the visual builder.</p>
          <button onClick={() => onEdit("new")} className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-md font-semibold"><Plus className="h-4 w-4" /> New landing page</button>
        </div>
      ) : (
        <div className="border rounded-xl bg-card divide-y">
          {pages.map((p) => (
            <div key={p.id} className="flex items-center gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <div className="font-semibold truncate">{p.title}</div>
                <div className="text-xs text-muted-foreground">/l/{p.slug} · updated {new Date(p.updatedAt).toLocaleDateString()}</div>
              </div>
              <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${p.published ? "bg-emerald-100 text-emerald-700" : "bg-muted text-muted-foreground"}`}>{p.published ? "PUBLISHED" : "DRAFT"}</span>
              {p.published && <a href={`/l/${p.slug}`} target="_blank" rel="noreferrer" className="p-2 rounded-md hover:bg-muted" title="View"><ExternalLink className="h-4 w-4" /></a>}
              <button onClick={() => onEdit(p.id)} className="text-sm font-semibold px-3 py-1.5 rounded-md border hover:bg-muted">Edit</button>
              <button onClick={() => remove(p)} className="p-2 rounded-md hover:bg-muted text-destructive" title="Delete"><Trash2 className="h-4 w-4" /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Pre-made, self-contained blocks (inline styles so they render anywhere).
const CUSTOM_BLOCKS: { id: string; label: string; content: string }[] = [
  {
    id: "bf-hero", label: "Hero",
    content: `<section style="padding:100px 24px;text-align:center;background:linear-gradient(135deg,#0ea5b7,#0891a3);color:#fff;font-family:sans-serif"><h1 style="font-size:48px;margin:0 0 16px;font-weight:800">Fresh from the river</h1><p style="font-size:20px;opacity:.9;margin:0 0 28px">Premium fish delivered to your door, same day.</p><a href="/shop" style="display:inline-block;background:#fff;color:#0ea5b7;text-decoration:none;font-weight:700;padding:14px 34px;border-radius:10px">Shop Now</a></section>`,
  },
  {
    id: "bf-features", label: "Feature columns",
    content: `<section style="padding:64px 24px;font-family:sans-serif"><div style="max-width:1100px;margin:0 auto;display:flex;gap:24px;flex-wrap:wrap"><div style="flex:1;min-width:220px;text-align:center"><div style="font-size:36px">🚚</div><h3 style="margin:12px 0 6px">Same-Day Delivery</h3><p style="color:#666;margin:0">Order by 11 AM in Dhaka.</p></div><div style="flex:1;min-width:220px;text-align:center"><div style="font-size:36px">❄️</div><h3 style="margin:12px 0 6px">Iced &amp; Fresh</h3><p style="color:#666;margin:0">Cold-chain to your door.</p></div><div style="flex:1;min-width:220px;text-align:center"><div style="font-size:36px">🛡️</div><h3 style="margin:12px 0 6px">100% Guarantee</h3><p style="color:#666;margin:0">Freshness or refund.</p></div></div></section>`,
  },
  {
    id: "bf-pricing", label: "Pricing table",
    content: `<section style="padding:64px 24px;font-family:sans-serif;background:#f8fafc"><div style="max-width:1000px;margin:0 auto;display:flex;gap:20px;flex-wrap:wrap;justify-content:center">${["Starter|499|Small family pack","Family|999|Weekly essentials|featured","Feast|1899|Party &amp; events"].map((p) => { const [n, pr, d, f] = p.split("|"); return `<div style="flex:1;min-width:240px;max-width:300px;background:#fff;border:${f ? "2px solid #0ea5b7" : "1px solid #e5e7eb"};border-radius:16px;padding:32px 24px;text-align:center"><h3 style="margin:0 0 8px;font-size:22px">${n}</h3><div style="font-size:40px;font-weight:800;color:#0ea5b7">৳${pr}</div><p style="color:#666;margin:12px 0 20px">${d}</p><a href="/shop" style="display:inline-block;background:#0ea5b7;color:#fff;text-decoration:none;font-weight:600;padding:11px 24px;border-radius:9px">Choose</a></div>`; }).join("")}</div></section>`,
  },
  {
    id: "bf-gallery", label: "Image gallery",
    content: `<section style="padding:48px 24px;font-family:sans-serif"><div style="max-width:1100px;margin:0 auto;display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px">${[0, 1, 2, 3].map(() => `<img src="https://via.placeholder.com/400x300?text=Add+image" style="width:100%;height:220px;object-fit:cover;border-radius:12px" />`).join("")}</div></section>`,
  },
  {
    id: "bf-cta", label: "CTA banner",
    content: `<section style="padding:56px 24px;font-family:sans-serif"><div style="max-width:900px;margin:0 auto;background:#0f172a;color:#fff;border-radius:20px;padding:48px 32px;text-align:center"><h2 style="font-size:32px;margin:0 0 10px">Ready to order?</h2><p style="opacity:.85;margin:0 0 24px">Get fresh fish delivered today.</p><a href="/shop" style="display:inline-block;background:#0ea5b7;color:#fff;text-decoration:none;font-weight:700;padding:14px 34px;border-radius:10px">Shop Now</a></div></section>`,
  },
  {
    id: "bf-testimonial", label: "Testimonial",
    content: `<section style="padding:64px 24px;font-family:sans-serif;text-align:center;background:#f8fafc"><div style="max-width:700px;margin:0 auto"><p style="font-size:24px;font-style:italic;color:#334155;margin:0 0 18px">"The freshest fish I've had delivered — perfectly cleaned and iced."</p><div style="font-weight:700">— Ayesha R., Dhaka</div></div></section>`,
  },
];

function Editor({ id, onExit }: { id: string | "new"; onExit: () => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const editorRef = useRef<any>(null);
  const qc = useQueryClient();
  const getFn = useServerFn(adminGetLanding);
  const saveFn = useServerFn(adminSaveLanding);

  const [title, setTitle] = useState("Untitled");
  const [slug, setSlug] = useState("");
  const [published, setPublished] = useState(false);
  const [seoOpen, setSeoOpen] = useState(false);
  const [metaTitle, setMetaTitle] = useState("");
  const [metaDescription, setMetaDescription] = useState("");
  const [ogImage, setOgImage] = useState("");
  const [noindex, setNoindex] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(id === "new" ? null : id);
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let editor: any = null;
    (async () => {
      let initial: LandingPage | null = null;
      if (id !== "new") {
        try { initial = await getFn({ data: { id } }); } catch { /* ignore */ }
        if (initial) {
          setTitle(initial.title); setSlug(initial.slug); setPublished(initial.published);
          setMetaTitle(initial.metaTitle || ""); setMetaDescription(initial.metaDescription || "");
          setOgImage(initial.ogImage || ""); setNoindex(!!initial.noindex);
        }
      }
      const grapesjs = (await import("grapesjs")).default;
      const preset = (await import("grapesjs-preset-webpage")).default;
      const blocksBasic = (await import("grapesjs-blocks-basic")).default;
      if (cancelled || !containerRef.current) return;
      editor = grapesjs.init({
        container: containerRef.current,
        height: "100%",
        width: "auto",
        fromElement: false,
        storageManager: false,
        // protectedCss is applied to the CANVAS only (never exported with the
        // page). The padding keeps a droppable strip above and below the
        // content so blocks can always be dropped before the first section or
        // after the last one — without it a full-height hero fills the frame
        // and there is nowhere to aim.
        protectedCss:
          "* { box-sizing: border-box; } body { margin: 0; min-height: 100vh; padding: 24px 0 160px; }" +
          " body > * { position: relative; }",
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        plugins: [(e: any) => blocksBasic(e, { flexGrid: true }), (e: any) => preset(e, {})],
        pluginsOpts: {},
      });
      // Make the page body a first-class drop target and show where a block will land.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const wrapper: any = editor.DomComponents.getWrapper();
      if (wrapper) wrapper.set({ droppable: true, badgable: false, selectable: false, hoverable: false });
      // Register our pre-made rich blocks (hero, columns, pricing, gallery, CTA…).
      const bm = editor.BlockManager;
      for (const b of CUSTOM_BLOCKS) bm.add(b.id, { label: b.label, category: "Sections", content: b.content });
      editor.setComponents(initial?.html || "<section style=\"padding:96px 24px;text-align:center;font-family:sans-serif\"><h1 style=\"font-size:40px;margin:0 0 12px\">Your headline here</h1><p style=\"font-size:18px;color:#555\">Drag blocks from the right to start building.</p></section>");
      editor.setStyle(initial?.css || "");
      editorRef.current = editor;
      if (!cancelled) setReady(true);
    })();
    return () => { cancelled = true; try { editor?.destroy(); } catch { /* ignore */ } };
  }, [id, getFn]);

  async function save(nextPublished?: boolean) {
    const editor = editorRef.current;
    if (!editor) return;
    const pub = nextPublished ?? published;
    setSaving(true);
    try {
      const res = await saveFn({ data: { id: savedId ?? undefined, slug, title, html: editor.getHtml(), css: editor.getCss(), metaTitle, metaDescription, ogImage, noindex, published: pub } });
      setSavedId(res.id); setSlug(res.slug); setPublished(res.published);
      qc.invalidateQueries({ queryKey: ["admin-landing"] });
      toast.success(pub ? "Saved & published" : "Saved");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Save failed"); }
    finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-40 bg-background flex flex-col">
      <div className="flex items-center gap-2 px-3 py-2 border-b bg-card flex-wrap">
        <button onClick={onExit} className="inline-flex items-center gap-1.5 text-sm px-2.5 py-1.5 rounded-md border hover:bg-muted"><ArrowLeft className="h-4 w-4" /> Back</button>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Page title" className="border rounded-md px-3 py-1.5 text-sm w-48" />
        <div className="flex items-center gap-1 text-sm text-muted-foreground">/l/<input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="slug" className="border rounded-md px-2 py-1.5 text-sm w-36" /></div>
        <button onClick={() => setSeoOpen((o) => !o)} className={`text-sm px-2.5 py-1.5 rounded-md border hover:bg-muted ${seoOpen ? "bg-muted" : ""}`}>SEO</button>
        <div className="ml-auto flex items-center gap-2">
          {savedId && published && <a href={`/l/${slug}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-sm px-2.5 py-1.5 rounded-md border hover:bg-muted"><Eye className="h-4 w-4" /> View</a>}
          <button onClick={() => save(false)} disabled={!ready || saving} className="inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-md border hover:bg-muted disabled:opacity-60"><Save className="h-4 w-4" /> {saving ? "Saving…" : "Save draft"}</button>
          <button onClick={() => save(true)} disabled={!ready || saving} className="inline-flex items-center gap-1.5 bg-primary text-primary-foreground text-sm font-semibold px-4 py-1.5 rounded-md hover:bg-primary/90 disabled:opacity-60">Publish</button>
        </div>
      </div>
      {seoOpen && (
        <div className="border-b bg-muted/30 px-3 py-3 grid gap-2 md:grid-cols-2">
          <label className="text-xs font-medium">Meta title
            <input value={metaTitle} onChange={(e) => setMetaTitle(e.target.value)} placeholder={title} className="mt-1 w-full border rounded-md px-3 py-1.5 text-sm font-normal" />
          </label>
          <label className="text-xs font-medium">Social image URL (og:image)
            <input value={ogImage} onChange={(e) => setOgImage(e.target.value)} placeholder="/uploads/… or https://…" className="mt-1 w-full border rounded-md px-3 py-1.5 text-sm font-normal" />
          </label>
          <label className="text-xs font-medium md:col-span-2">Meta description
            <input value={metaDescription} onChange={(e) => setMetaDescription(e.target.value)} maxLength={300} placeholder="One or two sentences shown in Google results." className="mt-1 w-full border rounded-md px-3 py-1.5 text-sm font-normal" />
          </label>
          <label className="flex items-center gap-2 text-xs font-medium md:col-span-2">
            <input type="checkbox" checked={noindex} onChange={(e) => setNoindex(e.target.checked)} /> Hide from search engines (noindex)
          </label>
        </div>
      )}
      <div className="flex-1 min-h-0"><div ref={containerRef} className="h-full" /></div>
      {!ready && <div className="absolute inset-0 top-12 grid place-items-center text-sm text-muted-foreground pointer-events-none">Loading visual editor…</div>}
    </div>
  );
}
