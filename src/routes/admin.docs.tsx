import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { DOCS, DOC_CATEGORIES, type DocSection } from "@/lib/docs-content";
import { sanitizeHtml } from "@/lib/sanitize-html";
import {
  BookOpen, Search, Rocket, Boxes, Package, Tag, Image as ImageIcon, ShoppingCart, Ticket, Truck, MapPin,
  Home, FileText, Newspaper, ChefHat, GalleryHorizontal, ListTree, MessageSquare, Palette, Sparkles, Code,
  CreditCard, Smartphone, KeyRound, Users, Settings, Blocks, BarChart3, Layers, ShieldCheck,
} from "lucide-react";

export const Route = createFileRoute("/admin/docs")({ component: DocsPage });

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Rocket, Boxes, Package, Tag, Image: ImageIcon, ShoppingCart, Ticket, Truck, MapPin, Home, FileText, Newspaper,
  ChefHat, GalleryHorizontal, ListTree, MessageSquare, Palette, Sparkles, Code, CreditCard, Smartphone, KeyRound,
  Search, Users, Settings, Blocks, BarChart3, Layers, ShieldCheck,
};

function DocsPage() {
  const [q, setQ] = useState("");
  const [slug, setSlug] = useState<string>(DOCS[0]?.slug ?? "");

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return DOCS;
    return DOCS.filter((d) => `${d.title} ${d.summary} ${d.category}`.toLowerCase().includes(t));
  }, [q]);

  const active: DocSection | undefined = DOCS.find((d) => d.slug === slug) ?? filtered[0];

  return (
    <div className="pb-16">
      <div className="mb-5">
        <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2"><BookOpen className="h-6 w-6" /> Help &amp; Developer Docs</h1>
        <p className="text-sm text-muted-foreground mt-1">Everything about running and extending your store — {DOCS.length} guides. Search or browse by category.</p>
      </div>

      <div className="grid lg:grid-cols-[280px_1fr] gap-6">
        {/* Sidebar */}
        <aside className="lg:sticky lg:top-20 h-fit">
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search docs…" className="w-full border rounded-md pl-9 pr-3 py-2 text-sm bg-card" />
          </div>
          <nav className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
            {DOC_CATEGORIES.map((cat) => {
              const items = filtered.filter((d) => d.category === cat);
              if (items.length === 0) return null;
              return (
                <div key={cat}>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-2 mb-1">{cat}</p>
                  <div className="space-y-0.5">
                    {items.map((d) => {
                      const Icon = ICONS[d.icon] ?? FileText;
                      const on = d.slug === active?.slug;
                      return (
                        <button key={d.slug} onClick={() => setSlug(d.slug)} className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-left text-sm transition ${on ? "bg-primary text-primary-foreground font-semibold" : "hover:bg-muted"}`}>
                          <Icon className="h-4 w-4 shrink-0" /> <span className="truncate">{d.title}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
            {filtered.length === 0 && <p className="text-sm text-muted-foreground px-2">No docs match “{q}”.</p>}
          </nav>
        </aside>

        {/* Content */}
        <div className="min-w-0">
          {active ? (
            <article className="bg-card border rounded-2xl p-6 md:p-8 max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-brand)]">{active.category}</p>
              <h2 className="text-2xl font-bold mt-1 mb-1">{active.title}</h2>
              <p className="text-sm text-muted-foreground mb-6">{active.summary}</p>
              <div className="prose-content text-[15px] leading-relaxed" dangerouslySetInnerHTML={{ __html: sanitizeHtml(active.html) }} />
            </article>
          ) : (
            <p className="text-muted-foreground">Select a topic.</p>
          )}
        </div>
      </div>
    </div>
  );
}
