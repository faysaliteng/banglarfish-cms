import { useEffect, useMemo, useRef, useState } from "react";
import { Search, CornerDownLeft } from "lucide-react";

export type Command = {
  label: string;
  group?: string;
  icon?: React.ComponentType<{ className?: string }>;
  hint?: string;
  run: () => void;
};

/**
 * ⌘K / Ctrl+K command palette — fuzzy-search across every admin page and quick
 * action, keyboard navigable. Rendered by the admin shell.
 */
export function CommandPalette({ open, onClose, commands }: { open: boolean; onClose: () => void; commands: Command[] }) {
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return commands;
    return commands.filter((c) => `${c.label} ${c.group ?? ""} ${c.hint ?? ""}`.toLowerCase().includes(t));
  }, [q, commands]);

  useEffect(() => {
    if (open) {
      setQ("");
      setActive(0);
      const id = setTimeout(() => inputRef.current?.focus(), 30);
      return () => clearTimeout(id);
    }
  }, [open]);
  useEffect(() => setActive(0), [q]);

  if (!open) return null;

  const run = (c?: Command) => {
    if (c) {
      c.run();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[12vh] px-4" onMouseDown={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-xl bg-card text-card-foreground border rounded-2xl shadow-2xl overflow-hidden"
        onMouseDown={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive((a) => Math.min(a + 1, filtered.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((a) => Math.max(a - 1, 0));
          } else if (e.key === "Enter") {
            e.preventDefault();
            run(filtered[active]);
          } else if (e.key === "Escape") {
            onClose();
          }
        }}
      >
        <div className="flex items-center gap-3 px-4 border-b">
          <Search className="h-5 w-5 text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search pages & actions…"
            className="flex-1 py-4 bg-transparent outline-none text-sm"
          />
          <kbd className="text-[10px] text-muted-foreground border rounded px-1.5 py-0.5">ESC</kbd>
        </div>
        <div className="max-h-[52vh] overflow-y-auto p-2">
          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No matches for “{q}”.</p>
          ) : (
            filtered.map((c, i) => {
              const Icon = c.icon;
              return (
                <button
                  key={c.label}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => run(c)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition ${i === active ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
                >
                  {Icon && <Icon className="h-4 w-4 shrink-0" />}
                  <span className="flex-1 text-sm font-medium truncate">{c.label}</span>
                  {c.group && <span className={`text-[10px] ${i === active ? "text-primary-foreground/70" : "text-muted-foreground"}`}>{c.group}</span>}
                  {i === active && <CornerDownLeft className="h-3.5 w-3.5" />}
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
