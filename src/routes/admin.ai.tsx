import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { adminGetAi, adminSaveAi, aiTest } from "@/lib/ai.functions";
import type { AiConfig } from "@/lib/config-types";
import { Sparkles, Save, Wand2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/ai")({ component: AiPage });

const MODELS: Record<string, string[]> = {
  anthropic: ["claude-sonnet-5", "claude-opus-4-8", "claude-haiku-4-5-20251001", "claude-fable-5"],
  openai: ["gpt-4o-mini", "gpt-4o", "gpt-4.1-mini"],
  ollama: ["llama3", "qwen2.5", "mistral"],
};

function AiPage() {
  const getFn = useServerFn(adminGetAi);
  const saveFn = useServerFn(adminSaveAi);
  const testFn = useServerFn(aiTest);
  const [cfg, setCfg] = useState<AiConfig | null>(null);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => { getFn().then(setCfg).catch((e) => toast.error(e instanceof Error ? e.message : "Failed")); }, [getFn]);
  if (!cfg) return <p className="text-sm text-muted-foreground">Loading…</p>;
  const set = (patch: Partial<AiConfig>) => setCfg({ ...cfg, ...patch });

  async function save() {
    if (!cfg) return;
    setSaving(true);
    try { await saveFn({ data: cfg }); toast.success("AI settings saved"); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
    finally { setSaving(false); }
  }
  async function test() {
    setTesting(true);
    try { const r = await testFn(); toast.success(`Connected · reply: "${r.reply}"`); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Test failed"); }
    finally { setTesting(false); }
  }

  return (
    <div className="pb-16 max-w-2xl">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-1">
        <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2"><Sparkles className="h-6 w-6" /> AI Assistant</h1>
        <div className="flex gap-2">
          <button onClick={test} disabled={testing} className="inline-flex items-center gap-1.5 border px-4 py-2 rounded-md text-sm font-medium hover:bg-muted disabled:opacity-60"><Wand2 className="h-4 w-4" /> {testing ? "Testing…" : "Test"}</button>
          <button onClick={save} disabled={saving} className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-md font-semibold hover:bg-primary/90 disabled:opacity-60"><Save className="h-4 w-4" /> {saving ? "Saving…" : "Save"}</button>
        </div>
      </div>
      <p className="text-sm text-muted-foreground mb-6">Powers ✨ one-click generation across the admin: product descriptions, SEO meta, alt text, content drafting, and translation. Bring your own key — Claude (Anthropic) recommended. Keys are stored server-side and never exposed to the storefront.</p>

      <div className="border rounded-2xl p-5 bg-card space-y-4">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={cfg.enabled} onChange={(e) => set({ enabled: e.target.checked })} />
          <span>Enable AI features</span>
        </label>

        <div className="grid sm:grid-cols-2 gap-3">
          <label className="block">
            <span className="text-xs font-semibold text-muted-foreground uppercase">Provider</span>
            <select value={cfg.provider} onChange={(e) => set({ provider: e.target.value as AiConfig["provider"], model: MODELS[e.target.value]?.[0] ?? cfg.model })} className="mt-1 w-full border rounded-md px-3 py-2 text-sm bg-card">
              <option value="anthropic">Anthropic (Claude)</option>
              <option value="openai">OpenAI / compatible</option>
              <option value="ollama">Ollama (local)</option>
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-muted-foreground uppercase">Model</span>
            <input list="ai-models" value={cfg.model} onChange={(e) => set({ model: e.target.value })} className="mt-1 w-full border rounded-md px-3 py-2 text-sm" />
            <datalist id="ai-models">{(MODELS[cfg.provider] ?? []).map((m) => <option key={m} value={m} />)}</datalist>
          </label>
        </div>

        {cfg.provider !== "ollama" && (
          <label className="block">
            <span className="text-xs font-semibold text-muted-foreground uppercase">API key</span>
            <input type="password" value={cfg.apiKey} onChange={(e) => set({ apiKey: e.target.value })} placeholder={cfg.provider === "anthropic" ? "sk-ant-…" : "sk-…"} className="mt-1 w-full border rounded-md px-3 py-2 text-sm font-mono" />
          </label>
        )}
        <label className="block">
          <span className="text-xs font-semibold text-muted-foreground uppercase">Base URL {cfg.provider === "ollama" ? "" : "(optional)"}</span>
          <input value={cfg.baseUrl} onChange={(e) => set({ baseUrl: e.target.value })} placeholder={cfg.provider === "ollama" ? "http://localhost:11434" : "leave blank for default"} className="mt-1 w-full border rounded-md px-3 py-2 text-sm" />
        </label>
        <label className="block">
          <span className="text-xs font-semibold text-muted-foreground uppercase">Brand tone of voice</span>
          <input value={cfg.tone} onChange={(e) => set({ tone: e.target.value })} className="mt-1 w-full border rounded-md px-3 py-2 text-sm" />
        </label>
        <label className="block max-w-[180px]">
          <span className="text-xs font-semibold text-muted-foreground uppercase">Max tokens</span>
          <input type="number" value={cfg.maxTokens} onChange={(e) => set({ maxTokens: Number(e.target.value) || 1024 })} className="mt-1 w-full border rounded-md px-3 py-2 text-sm" />
        </label>
      </div>
      <p className="text-xs text-muted-foreground mt-3">Guardrail: every AI output is a <strong>suggestion</strong> you insert manually into the editor — nothing is auto-published.</p>

      {/* Image generation is its own provider: Claude writes copy but cannot
          draw, so the text model and the image model are configured apart. */}
      <div className="mt-6 rounded-xl border bg-card p-5">
        <h2 className="font-bold mb-1">AI images</h2>
        <p className="text-xs text-muted-foreground mb-4">
          Powers <strong>Generate image</strong> in the media library and the AI background
          replacement / retouching buttons in the image editor.
        </p>
        <div className="grid md:grid-cols-2 gap-4">
          <label className="block">
            <span className="text-xs font-semibold text-muted-foreground uppercase">Image provider</span>
            <select
              value={cfg.imageProvider}
              onChange={(e) => {
                const p = e.target.value as AiConfig["imageProvider"];
                set({ imageProvider: p, imageModel: p === "openai" ? "gpt-image-1" : p === "gemini" ? "gemini-2.5-flash-image" : "" });
              }}
              className="mt-1 w-full border rounded-md px-3 py-2 text-sm bg-card"
            >
              <option value="none">Disabled</option>
              <option value="gemini">Google Gemini</option>
              <option value="openai">OpenAI</option>
            </select>
          </label>
          {cfg.imageProvider !== "none" && (
            <>
              <label className="block">
                <span className="text-xs font-semibold text-muted-foreground uppercase">Image model</span>
                <input list="ai-image-models" value={cfg.imageModel} onChange={(e) => set({ imageModel: e.target.value })} className="mt-1 w-full border rounded-md px-3 py-2 text-sm" />
                <datalist id="ai-image-models">
                  {(cfg.imageProvider === "openai" ? ["gpt-image-1", "dall-e-3"] : ["gemini-2.5-flash-image", "gemini-2.0-flash-preview-image-generation"]).map((m) => <option key={m} value={m} />)}
                </datalist>
              </label>
              <label className="block md:col-span-2">
                <span className="text-xs font-semibold text-muted-foreground uppercase">Image API key</span>
                <input type="password" value={cfg.imageApiKey} onChange={(e) => set({ imageApiKey: e.target.value })} placeholder={cfg.imageProvider === "openai" ? "sk-…" : "AIza…"} className="mt-1 w-full border rounded-md px-3 py-2 text-sm font-mono" />
                <span className="block text-xs text-muted-foreground mt-1">
                  {cfg.imageProvider === "openai"
                    ? "From platform.openai.com → API keys. Supports generation and instruction-based editing."
                    : "From aistudio.google.com → Get API key. Gemini also edits an existing image from a plain-English instruction."}
                </span>
              </label>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
