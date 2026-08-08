import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { aiStatus } from "@/lib/ai.functions";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";

// Cached across mounts so the ✨ buttons don't each re-query.
let _aiEnabled: boolean | null = null;

export function useAiEnabled(): boolean {
  const statusFn = useServerFn(aiStatus);
  const [enabled, setEnabled] = useState(_aiEnabled ?? false);
  useEffect(() => {
    if (_aiEnabled !== null) { setEnabled(_aiEnabled); return; }
    statusFn().then((s) => { _aiEnabled = s.enabled; setEnabled(s.enabled); }).catch(() => {});
  }, [statusFn]);
  return enabled;
}

// A ✨ action button that runs an async producer and hands the text back.
// Renders nothing when AI is disabled, so editors stay clean.
export function AiButton({ label, run, onText, onDone, className }: { label: string; run: () => Promise<string>; onText?: (t: string) => void; onDone?: () => void; className?: string }) {
  const enabled = useAiEnabled();
  const [busy, setBusy] = useState(false);
  if (!enabled) return null;
  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          const t = await run();
          if (onText && t) onText(t);
          onDone?.();
        } catch (e) {
          toast.error(e instanceof Error ? e.message : "AI request failed");
        } finally {
          setBusy(false);
        }
      }}
      className={className ?? "inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline disabled:opacity-60"}
    >
      <Sparkles className="h-3.5 w-3.5" /> {busy ? "Generating…" : label}
    </button>
  );
}
