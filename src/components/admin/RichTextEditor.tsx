import { useEffect, useRef, useState } from "react";
import { Bold, Italic, Underline, List, ListOrdered, Link2, Image as ImageIcon, Code, Heading1, Heading2, Heading3, Quote, Eraser, Pilcrow } from "lucide-react";

// Self-contained WordPress-style rich text editor: a visual (contenteditable)
// mode with a formatting toolbar, plus a raw HTML source toggle. No external deps.
export function RichTextEditor({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<"visual" | "html">("visual");

  useEffect(() => {
    const el = ref.current;
    if (mode === "visual" && el && document.activeElement !== el && el.innerHTML !== (value || "")) {
      el.innerHTML = value || "";
    }
  }, [value, mode]);

  function exec(cmd: string, arg?: string) {
    ref.current?.focus();
    document.execCommand(cmd, false, arg);
    if (ref.current) onChange(ref.current.innerHTML);
  }
  function block(tag: string) {
    exec("formatBlock", tag);
  }
  function onInput() {
    if (ref.current) onChange(ref.current.innerHTML);
  }
  function addLink() {
    const url = window.prompt("Link URL:", "https://");
    if (url) exec("createLink", url);
  }
  function addImage() {
    const url = window.prompt("Image URL (e.g. /uploads/… or /img/…):", "/uploads/");
    if (url) exec("insertImage", url);
  }

  const Btn = ({ onClick, title, children }: { onClick: () => void; title: string; children: React.ReactNode }) => (
    <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={onClick} title={title} className="h-8 w-8 grid place-items-center rounded hover:bg-muted text-foreground">
      {children}
    </button>
  );

  return (
    <div className="border rounded-lg overflow-hidden bg-card">
      <div className="flex flex-wrap items-center gap-0.5 p-1.5 border-b bg-muted/40">
        <Btn onClick={() => block("<h1>")} title="Heading 1"><Heading1 className="h-4 w-4" /></Btn>
        <Btn onClick={() => block("<h2>")} title="Heading 2"><Heading2 className="h-4 w-4" /></Btn>
        <Btn onClick={() => block("<h3>")} title="Heading 3"><Heading3 className="h-4 w-4" /></Btn>
        <Btn onClick={() => block("<p>")} title="Paragraph"><Pilcrow className="h-4 w-4" /></Btn>
        <span className="w-px h-5 bg-border mx-1" />
        <Btn onClick={() => exec("bold")} title="Bold"><Bold className="h-4 w-4" /></Btn>
        <Btn onClick={() => exec("italic")} title="Italic"><Italic className="h-4 w-4" /></Btn>
        <Btn onClick={() => exec("underline")} title="Underline"><Underline className="h-4 w-4" /></Btn>
        <span className="w-px h-5 bg-border mx-1" />
        <Btn onClick={() => exec("insertUnorderedList")} title="Bullet list"><List className="h-4 w-4" /></Btn>
        <Btn onClick={() => exec("insertOrderedList")} title="Numbered list"><ListOrdered className="h-4 w-4" /></Btn>
        <Btn onClick={() => block("<blockquote>")} title="Quote"><Quote className="h-4 w-4" /></Btn>
        <span className="w-px h-5 bg-border mx-1" />
        <Btn onClick={addLink} title="Insert link"><Link2 className="h-4 w-4" /></Btn>
        <Btn onClick={addImage} title="Insert image"><ImageIcon className="h-4 w-4" /></Btn>
        <Btn onClick={() => exec("removeFormat")} title="Clear formatting"><Eraser className="h-4 w-4" /></Btn>
        <div className="ml-auto">
          <button
            type="button"
            onClick={() => setMode(mode === "visual" ? "html" : "visual")}
            className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded ${mode === "html" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
          >
            <Code className="h-3.5 w-3.5" /> {mode === "html" ? "Visual" : "HTML"}
          </button>
        </div>
      </div>

      {mode === "visual" ? (
        <div
          ref={ref}
          contentEditable
          suppressContentEditableWarning
          onInput={onInput}
          data-placeholder={placeholder || "Write content…"}
          className="prose-editor min-h-[220px] max-h-[520px] overflow-y-auto p-4 text-sm focus:outline-none"
        />
      ) : (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          spellCheck={false}
          className="w-full min-h-[220px] max-h-[520px] p-4 text-sm font-mono focus:outline-none bg-card resize-y"
          placeholder="<p>HTML source…</p>"
        />
      )}
    </div>
  );
}
