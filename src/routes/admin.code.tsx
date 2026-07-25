import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { adminGetCustomCode, adminSaveCustomCode } from "@/lib/site.functions";
import type { CustomCodeConfig } from "@/lib/config-types";
import { Code, Save } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/code")({ component: CustomCodePage });

function CustomCodePage() {
  const getFn = useServerFn(adminGetCustomCode);
  const saveFn = useServerFn(adminSaveCustomCode);
  const [cfg, setCfg] = useState<CustomCodeConfig | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getFn().then(setCfg).catch((e) => toast.error(e instanceof Error ? e.message : "Failed"));
  }, [getFn]);

  if (!cfg) return <p className="text-sm text-muted-foreground">Loading…</p>;

  async function save() {
    if (!cfg) return;
    setSaving(true);
    try {
      await saveFn({ data: cfg });
      toast.success("Custom code saved — reloading to apply…");
      setTimeout(() => window.location.reload(), 700);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save");
      setSaving(false);
    }
  }

  return (
    <div className="pb-16 max-w-4xl">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-1">
        <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2 min-w-0"><Code className="h-6 w-6 shrink-0" /> Custom Code</h1>
        <button onClick={save} disabled={saving} className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-md font-semibold hover:bg-primary/90 disabled:opacity-60">
          <Save className="h-4 w-4" /> {saving ? "Saving…" : "Save & Apply"}
        </button>
      </div>
      <p className="text-sm text-muted-foreground mb-4">WordPress-style front-end code control. Add global CSS, custom &lt;head&gt; tags, and footer scripts — applied across the storefront. This affects the front-end only (it never runs server code), and is limited to managers &amp; admins.</p>
      <div className="mb-6 rounded-xl border border-blue-300/60 bg-blue-50 text-blue-800 px-4 py-3 text-sm">
        <strong>Tip:</strong> Use theme variables in CSS — e.g. <code className="font-mono">color: var(--primary)</code>, <code className="font-mono">var(--brand)</code>, <code className="font-mono">var(--card)</code>. For deeper design changes, also see <strong>Appearance → Theme &amp; Layout</strong>. Full guidance is in <strong>Help &amp; Docs → Custom Code</strong>.
      </div>

      <div className="space-y-5">
        <CodePanel
          title="Custom CSS"
          desc="Injected site-wide as a <style> tag (server-rendered — no flash). Override any storefront style."
          value={cfg.css}
          onChange={(v) => setCfg({ ...cfg, css: v })}
          placeholder={"/* Example */\n.container-x { max-width: 1360px; }\n.product-card:hover { transform: translateY(-6px); }"}
        />
        <CodePanel
          title="Header code (<head>)"
          desc="Injected into the page <head> — meta tags, web-font links, verification tags, analytics."
          value={cfg.headHtml}
          onChange={(v) => setCfg({ ...cfg, headHtml: v })}
          placeholder={'<!-- Example: Google Analytics -->\n<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXX"></script>'}
        />
        <CodePanel
          title="Footer code (before </body>)"
          desc="Injected at the end of the page — chat widgets, tracking pixels, custom scripts."
          value={cfg.bodyEnd}
          onChange={(v) => setCfg({ ...cfg, bodyEnd: v })}
          placeholder={'<!-- Example: chat widget -->\n<script>/* your widget code */</script>'}
        />
      </div>
    </div>
  );
}

function CodePanel({ title, desc, value, onChange, placeholder }: { title: string; desc: string; value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div className="border rounded-2xl p-5 bg-card">
      <h3 className="font-semibold">{title}</h3>
      <p className="text-xs text-muted-foreground mb-2">{desc}</p>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={8}
        spellCheck={false}
        placeholder={placeholder}
        className="w-full border rounded-md px-3 py-2 text-xs font-mono bg-[#0d1117] text-[#c9d1d9] resize-y leading-relaxed"
        style={{ tabSize: 2 }}
      />
    </div>
  );
}
