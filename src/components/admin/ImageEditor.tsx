import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Crop as CropIcon, RotateCcw, RotateCw, FlipHorizontal, FlipVertical, Sliders,
  Maximize2, Download, X, Check, RefreshCw, Wand2, Scissors, PenLine, Sparkles, Trash2, Undo2,
} from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { aiImageStatus, aiEditImage } from "@/lib/ai.functions";
import { removeBackground, fillTransparent, drawMarkups, dataUrlBytes, prettyBytes, type Markup, type MarkupKind } from "./image-tools";
import { toast } from "sonner";

/**
 * Self-contained image editor (canvas + 2D context — no external libraries).
 *
 * Crop with draggable handles and aspect presets, rotate/flip, resize, colour
 * adjustments, filter presets and output format/quality. `onSave` receives a
 * data URL so the caller can push it through the normal upload path.
 */

type Aspect = { label: string; value: number | null };
const ASPECTS: Aspect[] = [
  { label: "Free", value: null },
  { label: "1:1", value: 1 },
  { label: "4:3", value: 4 / 3 },
  { label: "3:4", value: 3 / 4 },
  { label: "16:9", value: 16 / 9 },
  { label: "3:2", value: 3 / 2 },
];

const PRESETS = [
  { id: "none", label: "Original", css: "" },
  { id: "vivid", label: "Vivid", css: "saturate(1.45) contrast(1.1)" },
  { id: "warm", label: "Warm", css: "sepia(.35) saturate(1.3) hue-rotate(-10deg)" },
  { id: "cool", label: "Cool", css: "saturate(1.1) hue-rotate(12deg) brightness(1.03)" },
  { id: "mono", label: "B&W", css: "grayscale(1) contrast(1.08)" },
  { id: "fade", label: "Fade", css: "saturate(.75) brightness(1.08) contrast(.92)" },
];

type Adjust = { brightness: number; contrast: number; saturate: number; blur: number; sharpen: number };
const NEUTRAL: Adjust = { brightness: 100, contrast: 100, saturate: 100, blur: 0, sharpen: 0 };

type CropRect = { x: number; y: number; w: number; h: number }; // 0..1 of the source
const FULL: CropRect = { x: 0, y: 0, w: 1, h: 1 };

type Handle = "nw" | "ne" | "sw" | "se" | "n" | "s" | "e" | "w" | "move";

export function ImageEditor({
  src, filename = "image", onSave, onClose,
}: {
  src: string;
  filename?: string;
  onSave: (dataUrl: string, filename: string) => void | Promise<void>;
  onClose: () => void;
}) {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [tab, setTab] = useState<"crop" | "adjust" | "bg" | "markup" | "resize">("crop");
  // The working source. Background removal and AI edits replace it, so every
  // later operation (crop, markup, export) builds on the new pixels.
  const [workSrc, setWorkSrc] = useState(src);
  const [bgTolerance, setBgTolerance] = useState(28);
  const [bgFeather, setBgFeather] = useState(2);
  const [bgFill, setBgFill] = useState("");
  const [markups, setMarkups] = useState<Markup[]>([]);
  const [tool, setTool] = useState<MarkupKind>("arrow");
  const [mColor, setMColor] = useState("#ef4444");
  const [mSize, setMSize] = useState(40);
  const [mText, setMText] = useState("SALE");
  const [drawing, setDrawing] = useState<Markup | null>(null);
  const [aiOn, setAiOn] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [estimate, setEstimate] = useState("");
  const history = useRef<string[]>([]);
  const [crop, setCrop] = useState<CropRect>(FULL);
  const [aspect, setAspect] = useState<number | null>(null);
  const [rotation, setRotation] = useState(0);          // degrees, any value
  const [flipH, setFlipH] = useState(false);
  const [flipV, setFlipV] = useState(false);
  const [adj, setAdj] = useState<Adjust>(NEUTRAL);
  const [preset, setPreset] = useState("none");
  const [outW, setOutW] = useState(0);
  const [outH, setOutH] = useState(0);
  const [lockRatio, setLockRatio] = useState(true);
  const [format, setFormat] = useState<"image/webp" | "image/jpeg" | "image/png">("image/webp");
  const [quality, setQuality] = useState(0.9);
  const [busy, setBusy] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ h: Handle; sx: number; sy: number; start: CropRect } | null>(null);

  /* ---------- load ---------- */
  useEffect(() => {
    const i = new Image();
    i.crossOrigin = "anonymous";
    i.onload = () => { setImg(i); setOutW(i.naturalWidth); setOutH(i.naturalHeight); };
    i.onerror = () => setImg(null);
    i.src = workSrc;
  }, [workSrc]);

  const aiStatusFn = useServerFn(aiImageStatus);
  const aiEditFn = useServerFn(aiEditImage);
  useEffect(() => { aiStatusFn().then((r) => setAiOn(r.enabled)).catch(() => setAiOn(false)); }, [aiStatusFn]);

  const filterCss = useMemo(() => {
    const p = PRESETS.find((x) => x.id === preset)?.css ?? "";
    const parts = [
      `brightness(${adj.brightness}%)`,
      `contrast(${adj.contrast}%)`,
      `saturate(${adj.saturate}%)`,
      adj.blur > 0 ? `blur(${adj.blur}px)` : "",
      p,
    ].filter(Boolean);
    return parts.join(" ");
  }, [adj, preset]);

  /* ---------- crop interaction ---------- */
  const onPointerDown = (h: Handle) => (e: React.PointerEvent) => {
    e.preventDefault(); e.stopPropagation();
    (e.target as Element).setPointerCapture?.(e.pointerId);
    drag.current = { h, sx: e.clientX, sy: e.clientY, start: { ...crop } };
  };

  const onPointerMove = useCallback((e: PointerEvent) => {
    const d = drag.current;
    const box = stageRef.current?.getBoundingClientRect();
    if (!d || !box) return;
    const dx = (e.clientX - d.sx) / box.width;
    const dy = (e.clientY - d.sy) / box.height;
    let { x, y, w, h } = d.start;

    if (d.h === "move") {
      x = Math.min(Math.max(0, x + dx), 1 - w);
      y = Math.min(Math.max(0, y + dy), 1 - h);
    } else {
      if (d.h.includes("w")) { const nx = Math.min(Math.max(0, x + dx), x + w - 0.05); w += x - nx; x = nx; }
      if (d.h.includes("e")) { w = Math.min(Math.max(0.05, w + dx), 1 - x); }
      if (d.h.includes("n")) { const ny = Math.min(Math.max(0, y + dy), y + h - 0.05); h += y - ny; y = ny; }
      if (d.h.includes("s")) { h = Math.min(Math.max(0.05, h + dy), 1 - y); }
      // Keep the requested aspect ratio (in pixel space, not normalised space).
      if (aspect && img) {
        const pxW = w * img.naturalWidth;
        const targetPxH = pxW / aspect;
        h = Math.min(targetPxH / img.naturalHeight, 1 - y);
      }
    }
    setCrop({ x, y, w, h });
  }, [aspect, img]);

  useEffect(() => {
    const up = () => { drag.current = null; };
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", up);
    return () => { window.removeEventListener("pointermove", onPointerMove); window.removeEventListener("pointerup", up); };
  }, [onPointerMove]);

  // Re-apply the aspect ratio when the preset changes.
  useEffect(() => {
    if (!aspect || !img) return;
    setCrop((c) => {
      const pxW = c.w * img.naturalWidth;
      const h = Math.min(pxW / aspect / img.naturalHeight, 1 - c.y);
      return { ...c, h };
    });
  }, [aspect, img]);

  /* ---------- render to canvas ---------- */
  const render = useCallback((): HTMLCanvasElement | null => {
    if (!img) return null;
    const sx = crop.x * img.naturalWidth;
    const sy = crop.y * img.naturalHeight;
    const sw = Math.max(1, crop.w * img.naturalWidth);
    const sh = Math.max(1, crop.h * img.naturalHeight);

    // Stage 0 — full-size plate: colour-graded image, then markups on top.
    // Markups live in full-image coordinates so what you drew is what gets
    // cropped, and they are drawn unfiltered (a red arrow shouldn't go B&W).
    const c0 = document.createElement("canvas");
    c0.width = img.naturalWidth; c0.height = img.naturalHeight;
    const x0 = c0.getContext("2d", { willReadFrequently: true });
    if (!x0) return null;
    x0.filter = filterCss || "none";
    x0.drawImage(img, 0, 0);
    x0.filter = "none";
    if (markups.length) drawMarkups(x0, c0.width, c0.height, markups);

    // Stage 1 — crop, at source resolution.
    const c1 = document.createElement("canvas");
    c1.width = Math.round(sw); c1.height = Math.round(sh);
    const x1 = c1.getContext("2d");
    if (!x1) return null;
    x1.drawImage(c0, sx, sy, sw, sh, 0, 0, c1.width, c1.height);

    // Stage 2 — rotate + flip on a canvas big enough for the rotated bounds.
    const rad = (rotation * Math.PI) / 180;
    const cos = Math.abs(Math.cos(rad)), sin = Math.abs(Math.sin(rad));
    const rw = Math.round(c1.width * cos + c1.height * sin);
    const rh = Math.round(c1.width * sin + c1.height * cos);
    const c2 = document.createElement("canvas");
    c2.width = rw; c2.height = rh;
    const x2 = c2.getContext("2d");
    if (!x2) return null;
    x2.translate(rw / 2, rh / 2);
    x2.rotate(rad);
    x2.scale(flipH ? -1 : 1, flipV ? -1 : 1);
    x2.drawImage(c1, -c1.width / 2, -c1.height / 2);

    // Stage 3 — resize to the requested output size.
    const tw = Math.max(1, Math.round(outW || rw));
    const th = Math.max(1, Math.round(outH || rh));
    const c3 = document.createElement("canvas");
    c3.width = tw; c3.height = th;
    const x3 = c3.getContext("2d");
    if (!x3) return null;
    x3.imageSmoothingQuality = "high";
    x3.drawImage(c2, 0, 0, tw, th);

    // Stage 4 — optional unsharp mask (convolution; CSS filters can't sharpen).
    if (adj.sharpen > 0) applySharpen(x3, tw, th, adj.sharpen / 100);
    return c3;
  }, [img, crop, filterCss, rotation, flipH, flipV, outW, outH, adj.sharpen, markups]);

  /* ---------- destructive edits: replace the working pixels ---------- */
  const pushWork = useCallback((next: string) => {
    history.current.push(workSrc);
    setWorkSrc(next);
    setCrop(FULL);
  }, [workSrc]);

  const baseCanvas = useCallback(() => {
    if (!img) return null;
    const c = document.createElement("canvas");
    c.width = img.naturalWidth; c.height = img.naturalHeight;
    const x = c.getContext("2d", { willReadFrequently: true });
    if (!x) return null;
    x.drawImage(img, 0, 0);
    return { c, x };
  }, [img]);

  async function cutOutBackground(fill?: string) {
    const b = baseCanvas();
    if (!b) return;
    setBusy(true);
    // Yield a frame so the button's busy state actually paints before the
    // flood fill blocks the main thread on a large image.
    await new Promise((r) => setTimeout(r, 30));
    try {
      removeBackground(b.x, b.c.width, b.c.height, { tolerance: bgTolerance, feather: bgFeather });
      if (fill) fillTransparent(b.x, b.c.width, b.c.height, fill);
      pushWork(b.c.toDataURL("image/png"));
      if (!fill) setFormat("image/png");   // only PNG/WebP keep the alpha channel
      toast.success(fill ? "Background replaced" : "Background removed");
    } catch {
      toast.error("Could not process this image");
    } finally { setBusy(false); }
  }

  async function runAiEdit(instruction: string) {
    if (!img || !instruction.trim()) return;
    setAiBusy(true);
    try {
      // Send at most 1536px on the long edge: the providers work at ~1024 anyway
      // and a full-resolution PNG blows past the request size limit.
      const scale = Math.min(1, 1536 / Math.max(img.naturalWidth, img.naturalHeight));
      const c = document.createElement("canvas");
      c.width = Math.round(img.naturalWidth * scale);
      c.height = Math.round(img.naturalHeight * scale);
      const x = c.getContext("2d");
      if (!x) return;
      x.imageSmoothingQuality = "high";
      x.drawImage(img, 0, 0, c.width, c.height);
      const r = await aiEditFn({ data: { dataUrl: c.toDataURL("image/png"), instruction } });
      pushWork(r.dataUrl);
      toast.success("AI edit applied");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "AI edit failed");
    } finally { setAiBusy(false); }
  }

  function undoWork() {
    const prev = history.current.pop();
    if (!prev) return;
    setWorkSrc(prev);
    setCrop(FULL);
  }

  // Compression preview. Encoding is not free, so it is debounced and only runs
  // while the Export tab is open.
  useEffect(() => {
    if (tab !== "resize" || !img) { setEstimate(""); return; }
    const t = setTimeout(() => {
      const c = render();
      if (!c) return;
      try { setEstimate(prettyBytes(dataUrlBytes(c.toDataURL(format, quality)))); } catch { setEstimate(""); }
    }, 300);
    return () => clearTimeout(t);
  }, [tab, img, render, format, quality]);

  async function save() {
    const canvas = render();
    if (!canvas) return;
    setBusy(true);
    try {
      const ext = format === "image/png" ? "png" : format === "image/jpeg" ? "jpg" : "webp";
      const base = filename.replace(/\.[^.]+$/, "") || "image";
      await onSave(canvas.toDataURL(format, quality), `${base}-edited.${ext}`);
    } finally { setBusy(false); }
  }

  function download() {
    const canvas = render();
    if (!canvas) return;
    const a = document.createElement("a");
    a.href = canvas.toDataURL(format, quality);
    a.download = `${filename.replace(/\.[^.]+$/, "")}-edited.${format === "image/png" ? "png" : format === "image/jpeg" ? "jpg" : "webp"}`;
    a.click();
  }

  function resetAll() {
    setCrop(FULL); setAspect(null); setRotation(0); setFlipH(false); setFlipV(false);
    setAdj(NEUTRAL); setPreset("none"); setMarkups([]);
    if (img) { setOutW(img.naturalWidth); setOutH(img.naturalHeight); }
  }

  const setW = (v: number) => {
    setOutW(v);
    if (lockRatio && img) {
      const ratio = (crop.w * img.naturalWidth) / (crop.h * img.naturalHeight);
      setOutH(Math.round(v / ratio));
    }
  };
  const setH = (v: number) => {
    setOutH(v);
    if (lockRatio && img) {
      const ratio = (crop.w * img.naturalWidth) / (crop.h * img.naturalHeight);
      setOutW(Math.round(v * ratio));
    }
  };

  /* ---------- markup: place on the stage, store normalised ---------- */
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const [stageSize, setStageSize] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect();
      setStageSize({ w: Math.round(r.width), h: Math.round(r.height) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [img]);

  // Undo the display transform so a click lands where the user sees it, not
  // where the untransformed layout box happens to be.
  const stagePoint = (e: React.PointerEvent) => {
    const box = stageRef.current?.getBoundingClientRect();
    if (!box) return { x: 0, y: 0 };
    const px = e.clientX - box.left - box.width / 2;
    const py = e.clientY - box.top - box.height / 2;
    const rad = (-rotation * Math.PI) / 180;
    let rx = px * Math.cos(rad) - py * Math.sin(rad);
    let ry = px * Math.sin(rad) + py * Math.cos(rad);
    if (flipH) rx = -rx;
    if (flipV) ry = -ry;
    return {
      x: Math.min(1, Math.max(0, rx / box.width + 0.5)),
      y: Math.min(1, Math.max(0, ry / box.height + 0.5)),
    };
  };

  const markupDown = (e: React.PointerEvent) => {
    if (tab !== "markup") return;
    e.preventDefault();
    (e.target as Element).setPointerCapture?.(e.pointerId);
    const p = stagePoint(e);
    setDrawing({
      id: `m${markups.length}-${Math.round(p.x * 1e4)}`,
      kind: tool, x: p.x, y: p.y, x2: p.x, y2: p.y,
      color: mColor, size: mSize,
      text: tool === "text" || tool === "badge" ? mText : undefined,
    });
  };
  const markupMove = (e: React.PointerEvent) => {
    if (!drawing) return;
    const p = stagePoint(e);
    setDrawing({ ...drawing, x2: p.x, y2: p.y });
  };
  const markupUp = () => {
    if (!drawing) return;
    const tiny = Math.abs(drawing.x2 - drawing.x) < 0.005 && Math.abs(drawing.y2 - drawing.y) < 0.005;
    // Text and badges are anchored by a single click; shapes need a drag.
    if (!tiny || drawing.kind === "text" || drawing.kind === "badge") {
      setMarkups((m) => [...m, drawing]);
    }
    setDrawing(null);
  };

  // Live preview of the annotations, drawn at display resolution over the image.
  useEffect(() => {
    const cv = overlayRef.current;
    if (!cv || !img || !stageSize.w) return;
    cv.width = stageSize.w; cv.height = stageSize.h;
    const x = cv.getContext("2d", { willReadFrequently: true });
    if (!x) return;
    x.clearRect(0, 0, cv.width, cv.height);
    const all = drawing ? [...markups, drawing] : markups;
    // Pixelate markups sample from the canvas, so seed those regions with the
    // real image first — otherwise they'd blur transparent pixels.
    for (const m of all) {
      if (m.kind !== "blur") continue;
      const rx = Math.min(m.x, m.x2), ry = Math.min(m.y, m.y2);
      const rw = Math.abs(m.x2 - m.x), rh = Math.abs(m.y2 - m.y);
      if (rw <= 0 || rh <= 0) continue;
      x.drawImage(img,
        rx * img.naturalWidth, ry * img.naturalHeight, rw * img.naturalWidth, rh * img.naturalHeight,
        rx * cv.width, ry * cv.height, rw * cv.width, rh * cv.height);
    }
    drawMarkups(x, cv.width, cv.height, all);
  }, [markups, drawing, img, stageSize]);

  const cropPx = img ? { w: Math.round(crop.w * img.naturalWidth), h: Math.round(crop.h * img.naturalHeight) } : { w: 0, h: 0 };

  return (
    <div className="fixed inset-0 z-[60] bg-black/70 flex items-center justify-center p-3" onClick={onClose}>
      <div className="bg-background rounded-2xl shadow-2xl w-full max-w-5xl max-h-[95vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
        {/* header */}
        <div className="flex items-center gap-2 px-4 py-3 border-b">
          <Wand2 className="h-5 w-5 text-primary" />
          <h3 className="font-bold">Image editor</h3>
          <span className="text-xs text-muted-foreground truncate hidden sm:block">{filename}</span>
          <div className="ml-auto flex items-center gap-2">
            <button onClick={resetAll} className="text-sm inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border hover:bg-muted"><RefreshCw className="h-4 w-4" /> Reset</button>
            <button onClick={download} className="text-sm inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border hover:bg-muted" title="Download without saving"><Download className="h-4 w-4" /></button>
            <button onClick={onClose} className="p-1.5 rounded-md hover:bg-muted"><X className="h-5 w-5" /></button>
          </div>
        </div>

        <div className="flex-1 min-h-0 grid md:grid-cols-[1fr_290px]">
          {/* stage */}
          <div className="bg-[repeating-conic-gradient(#e8ecf1_0%_25%,#f7f9fb_0%_50%)] bg-[length:18px_18px] grid place-items-center p-4 overflow-auto min-h-[320px]">
            {!img ? (
              <p className="text-sm text-muted-foreground">Loading image…</p>
            ) : (
              <div ref={stageRef} className="relative select-none touch-none" style={{ maxWidth: "100%" }}>
                <img
                  src={workSrc} alt=""
                  className="block max-h-[60vh] max-w-full"
                  style={{ filter: filterCss || undefined, transform: `rotate(${rotation}deg) scale(${flipH ? -1 : 1}, ${flipV ? -1 : 1})` }}
                  draggable={false}
                />
                <canvas
                  ref={overlayRef}
                  className="absolute inset-0 h-full w-full"
                  style={{ transform: `rotate(${rotation}deg) scale(${flipH ? -1 : 1}, ${flipV ? -1 : 1})`, pointerEvents: "none" }}
                />
                {tab === "markup" && (
                  <div
                    className="absolute inset-0 cursor-crosshair"
                    onPointerDown={markupDown}
                    onPointerMove={markupMove}
                    onPointerUp={markupUp}
                    onPointerCancel={markupUp}
                  />
                )}
                {tab === "crop" && (
                  <>
                    {/* dimmed outside area */}
                    <div className="absolute inset-0 pointer-events-none" style={{
                      background: "rgba(0,0,0,.45)",
                      clipPath: `polygon(0% 0%,0% 100%,${crop.x * 100}% 100%,${crop.x * 100}% ${crop.y * 100}%,${(crop.x + crop.w) * 100}% ${crop.y * 100}%,${(crop.x + crop.w) * 100}% ${(crop.y + crop.h) * 100}%,${crop.x * 100}% ${(crop.y + crop.h) * 100}%,${crop.x * 100}% 100%,100% 100%,100% 0%)`,
                    }} />
                    <div
                      className="absolute border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,.4)] cursor-move"
                      style={{ left: `${crop.x * 100}%`, top: `${crop.y * 100}%`, width: `${crop.w * 100}%`, height: `${crop.h * 100}%` }}
                      onPointerDown={onPointerDown("move")}
                    >
                      {/* rule-of-thirds guides */}
                      <div className="absolute inset-0 pointer-events-none opacity-45">
                        <div className="absolute left-1/3 top-0 bottom-0 w-px bg-white" />
                        <div className="absolute left-2/3 top-0 bottom-0 w-px bg-white" />
                        <div className="absolute top-1/3 left-0 right-0 h-px bg-white" />
                        <div className="absolute top-2/3 left-0 right-0 h-px bg-white" />
                      </div>
                      {(["nw", "ne", "sw", "se", "n", "s", "e", "w"] as Handle[]).map((h) => (
                        <span
                          key={h}
                          onPointerDown={onPointerDown(h)}
                          className="absolute bg-white border border-black/30 rounded-sm"
                          style={{
                            width: 12, height: 12,
                            cursor: `${h}-resize`,
                            left: h.includes("w") ? -6 : h === "n" || h === "s" ? "calc(50% - 6px)" : undefined,
                            right: h.includes("e") ? -6 : undefined,
                            top: h.includes("n") ? -6 : h === "e" || h === "w" ? "calc(50% - 6px)" : undefined,
                            bottom: h.includes("s") ? -6 : undefined,
                          }}
                        />
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* controls */}
          <div className="border-l bg-card overflow-y-auto">
            <div className="flex border-b sticky top-0 bg-card z-10">
              {([["crop", CropIcon, "Crop"], ["adjust", Sliders, "Adjust"], ["bg", Scissors, "Cut-out"], ["markup", PenLine, "Markup"], ["resize", Maximize2, "Export"]] as const).map(([k, Icon, label]) => (
                <button key={k} onClick={() => setTab(k)} className={`flex-1 py-2.5 text-[11px] font-semibold inline-flex flex-col items-center justify-center gap-1 ${tab === k ? "text-primary border-b-2 border-primary" : "text-muted-foreground hover:bg-muted"}`}>
                  <Icon className="h-4 w-4" /> {label}
                </button>
              ))}
            </div>

            <div className="p-4 space-y-4">
              {tab === "crop" && (
                <>
                  <Field label="Aspect ratio">
                    <div className="grid grid-cols-3 gap-1.5">
                      {ASPECTS.map((a) => (
                        <button key={a.label} onClick={() => setAspect(a.value)} className={`text-xs py-1.5 rounded-md border ${aspect === a.value ? "bg-primary text-primary-foreground border-primary" : "hover:bg-muted"}`}>{a.label}</button>
                      ))}
                    </div>
                  </Field>
                  <Field label="Rotate & flip">
                    <div className="flex gap-1.5">
                      <IconBtn onClick={() => setRotation((r) => r - 90)} title="Rotate left"><RotateCcw className="h-4 w-4" /></IconBtn>
                      <IconBtn onClick={() => setRotation((r) => r + 90)} title="Rotate right"><RotateCw className="h-4 w-4" /></IconBtn>
                      <IconBtn onClick={() => setFlipH((v) => !v)} active={flipH} title="Flip horizontal"><FlipHorizontal className="h-4 w-4" /></IconBtn>
                      <IconBtn onClick={() => setFlipV((v) => !v)} active={flipV} title="Flip vertical"><FlipVertical className="h-4 w-4" /></IconBtn>
                    </div>
                  </Field>
                  <Slider label="Fine angle" value={rotation} min={-180} max={180} step={1} unit="°" onChange={setRotation} />
                  <button onClick={() => setCrop(FULL)} className="w-full text-xs py-2 rounded-md border hover:bg-muted">Reset crop</button>
                  <p className="text-[11px] text-muted-foreground">Selection: {cropPx.w} × {cropPx.h} px</p>
                </>
              )}

              {tab === "adjust" && (
                <>
                  <Field label="Presets">
                    <div className="grid grid-cols-3 gap-1.5">
                      {PRESETS.map((p) => (
                        <button key={p.id} onClick={() => setPreset(p.id)} className={`text-xs py-1.5 rounded-md border ${preset === p.id ? "bg-primary text-primary-foreground border-primary" : "hover:bg-muted"}`}>{p.label}</button>
                      ))}
                    </div>
                  </Field>
                  <Slider label="Brightness" value={adj.brightness} min={20} max={200} onChange={(v) => setAdj({ ...adj, brightness: v })} unit="%" />
                  <Slider label="Contrast" value={adj.contrast} min={20} max={200} onChange={(v) => setAdj({ ...adj, contrast: v })} unit="%" />
                  <Slider label="Saturation" value={adj.saturate} min={0} max={250} onChange={(v) => setAdj({ ...adj, saturate: v })} unit="%" />
                  <Slider label="Sharpen" value={adj.sharpen} min={0} max={100} onChange={(v) => setAdj({ ...adj, sharpen: v })} unit="%" />
                  <Slider label="Blur" value={adj.blur} min={0} max={12} step={0.5} onChange={(v) => setAdj({ ...adj, blur: v })} unit="px" />
                  <button onClick={() => { setAdj(NEUTRAL); setPreset("none"); }} className="w-full text-xs py-2 rounded-md border hover:bg-muted">Reset adjustments</button>
                </>
              )}

              {tab === "bg" && (
                <>
                  <p className="text-[11px] text-muted-foreground">
                    Removes the backdrop behind the subject. It fills inward from the edges, so a
                    white plate <em>inside</em> the product is kept &mdash; only the surrounding
                    background goes.
                  </p>
                  <Slider label="Tolerance" value={bgTolerance} min={2} max={70} onChange={setBgTolerance} unit="%" />
                  <Slider label="Edge softness" value={bgFeather} min={0} max={8} onChange={setBgFeather} unit="px" />
                  <button onClick={() => cutOutBackground()} disabled={busy || !img} className="w-full inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground text-sm font-semibold py-2 rounded-md disabled:opacity-60">
                    <Scissors className="h-4 w-4" /> {busy ? "Working\u2026" : "Remove background"}
                  </button>
                  <Field label="Or replace it with a colour">
                    <div className="grid grid-cols-4 gap-1.5">
                      {["#ffffff", "#f1f5f9", "#0f172a", "#0ea5b7"].map((c) => (
                        <button key={c} onClick={() => cutOutBackground(c)} disabled={busy} className="h-8 rounded-md border disabled:opacity-60" style={{ background: c }} title="Replace background with this colour" />
                      ))}
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <input type="color" value={bgFill || "#ffffff"} onChange={(e) => setBgFill(e.target.value)} className="h-8 w-10 border rounded" />
                      <button onClick={() => cutOutBackground(bgFill || "#ffffff")} disabled={busy} className="flex-1 text-xs py-1.5 rounded-md border hover:bg-muted disabled:opacity-60">Apply custom colour</button>
                    </div>
                  </Field>
                  <div className="border-t pt-3">
                    <p className="text-xs font-semibold mb-1.5 inline-flex items-center gap-1.5"><Sparkles className="h-3.5 w-3.5 text-primary" /> AI edit</p>
                    {aiOn ? (
                      <>
                        <p className="text-[11px] text-muted-foreground mb-2">Describe the change in plain English &mdash; background, lighting, cleanup, anything.</p>
                        <div className="grid grid-cols-1 gap-1.5">
                          {[
                            ["Remove the background completely and leave the subject on a transparent background", "Cut out subject (AI)"],
                            ["Replace the background with a clean seamless white studio backdrop", "White studio backdrop"],
                            ["Improve the lighting and colour so this looks like a professional product photo", "Pro product lighting"],
                          ].map(([instr, label]) => (
                            <button key={label} onClick={() => runAiEdit(instr)} disabled={aiBusy} className="text-xs py-1.5 rounded-md border hover:bg-muted disabled:opacity-60">{aiBusy ? "Generating\u2026" : label}</button>
                          ))}
                        </div>
                        <input
                          placeholder="Custom instruction, then press Enter\u2026"
                          disabled={aiBusy}
                          onKeyDown={(e) => { if (e.key === "Enter") { const el = e.target as HTMLInputElement; runAiEdit(el.value); el.value = ""; } }}
                          className="w-full border rounded-md px-2 py-1.5 text-xs mt-2"
                        />
                      </>
                    ) : (
                      <p className="text-[11px] text-muted-foreground">Add a Gemini or OpenAI image key in <strong>Settings &rarr; AI</strong> to enable AI background replacement and retouching.</p>
                    )}
                  </div>
                  {history.current.length > 0 && (
                    <button onClick={undoWork} className="w-full text-xs py-2 rounded-md border hover:bg-muted inline-flex items-center justify-center gap-1.5"><Undo2 className="h-3.5 w-3.5" /> Undo last cut-out / AI edit</button>
                  )}
                </>
              )}

              {tab === "markup" && (
                <>
                  <Field label="Tool">
                    <div className="grid grid-cols-3 gap-1.5">
                      {([["arrow", "Arrow"], ["line", "Line"], ["rect", "Box"], ["ellipse", "Circle"], ["text", "Text"], ["badge", "Badge"], ["blur", "Pixelate"]] as const).map(([k, l]) => (
                        <button key={k} onClick={() => setTool(k)} className={`text-xs py-1.5 rounded-md border ${tool === k ? "bg-primary text-primary-foreground border-primary" : "hover:bg-muted"}`}>{l}</button>
                      ))}
                    </div>
                  </Field>
                  <p className="text-[11px] text-muted-foreground">
                    {tool === "text" || tool === "badge" ? "Click on the image to place it." : "Drag on the image to draw."}
                  </p>
                  {(tool === "text" || tool === "badge") && (
                    <Field label="Label">
                      <input value={mText} onChange={(e) => setMText(e.target.value)} className="w-full border rounded-md px-2 py-1.5 text-sm" />
                      <div className="grid grid-cols-4 gap-1.5 mt-1.5">
                        {["SALE", "NEW", "-20%", "FREE"].map((t) => (
                          <button key={t} onClick={() => setMText(t)} className="text-xs py-1.5 rounded-md border hover:bg-muted">{t}</button>
                        ))}
                      </div>
                    </Field>
                  )}
                  <Field label="Colour">
                    <div className="flex items-center gap-1.5">
                      {["#ef4444", "#0ea5b7", "#f59e0b", "#22c55e", "#0f172a", "#ffffff"].map((c) => (
                        <button key={c} onClick={() => setMColor(c)} className={`h-7 flex-1 rounded-md border-2 ${mColor === c ? "border-primary" : "border-transparent ring-1 ring-border"}`} style={{ background: c }} />
                      ))}
                      <input type="color" value={mColor} onChange={(e) => setMColor(e.target.value)} className="h-7 w-8 border rounded shrink-0" />
                    </div>
                  </Field>
                  <Slider label={tool === "blur" ? "Pixel size" : "Size"} value={mSize} min={5} max={100} onChange={setMSize} />
                  <div className="flex gap-1.5">
                    <button onClick={() => setMarkups((m) => m.slice(0, -1))} disabled={!markups.length} className="flex-1 text-xs py-2 rounded-md border hover:bg-muted disabled:opacity-50 inline-flex items-center justify-center gap-1.5"><Undo2 className="h-3.5 w-3.5" /> Undo</button>
                    <button onClick={() => setMarkups([])} disabled={!markups.length} className="flex-1 text-xs py-2 rounded-md border hover:bg-muted disabled:opacity-50 inline-flex items-center justify-center gap-1.5 text-destructive"><Trash2 className="h-3.5 w-3.5" /> Clear all</button>
                  </div>
                  <p className="text-[11px] text-muted-foreground">{markups.length} annotation{markups.length === 1 ? "" : "s"}. They are baked into the image when you save or download.</p>
                </>
              )}

              {tab === "resize" && (
                <>
                  <Field label="Output size">
                    <div className="flex items-center gap-2">
                      <input type="number" value={outW} onChange={(e) => setW(Number(e.target.value))} className="w-full border rounded-md px-2 py-1.5 text-sm" />
                      <span className="text-muted-foreground text-xs">×</span>
                      <input type="number" value={outH} onChange={(e) => setH(Number(e.target.value))} className="w-full border rounded-md px-2 py-1.5 text-sm" />
                    </div>
                    <label className="flex items-center gap-2 text-xs mt-2">
                      <input type="checkbox" checked={lockRatio} onChange={(e) => setLockRatio(e.target.checked)} /> Lock aspect ratio
                    </label>
                  </Field>
                  <Field label="Quick sizes">
                    <div className="grid grid-cols-3 gap-1.5">
                      {[256, 512, 800, 1200, 1600, 2000].map((w) => (
                        <button key={w} onClick={() => setW(w)} className="text-xs py-1.5 rounded-md border hover:bg-muted">{w}px</button>
                      ))}
                    </div>
                  </Field>
                  <Field label="Format">
                    <div className="grid grid-cols-3 gap-1.5">
                      {([["image/webp", "WebP"], ["image/jpeg", "JPEG"], ["image/png", "PNG"]] as const).map(([f, l]) => (
                        <button key={f} onClick={() => setFormat(f)} className={`text-xs py-1.5 rounded-md border ${format === f ? "bg-primary text-primary-foreground border-primary" : "hover:bg-muted"}`}>{l}</button>
                      ))}
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-1.5">WebP gives the smallest file at the same quality. Use PNG only when you need transparency.</p>
                  </Field>
                  {format !== "image/png" && (
                    <>
                      <Slider label="Quality" value={Math.round(quality * 100)} min={40} max={100} onChange={(v) => setQuality(v / 100)} unit="%" />
                      <div className="grid grid-cols-3 gap-1.5">
                        {([[0.95, "Max"], [0.82, "Balanced"], [0.65, "Small"]] as const).map(([q, l]) => (
                          <button key={l} onClick={() => setQuality(q)} className={`text-xs py-1.5 rounded-md border ${Math.abs(quality - q) < 0.01 ? "bg-primary text-primary-foreground border-primary" : "hover:bg-muted"}`}>{l}</button>
                        ))}
                      </div>
                    </>
                  )}
                  <div className="rounded-lg border bg-muted/40 p-3 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Estimated file size</span>
                      <strong>{estimate || "\u2026"}</strong>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Balanced WebP is usually 60&ndash;80% smaller than the original JPEG with no
                      visible difference. Saved images are compressed again on the server.
                    </p>
                  </div>
                  <button onClick={download} disabled={!img} className="w-full inline-flex items-center justify-center gap-2 border text-sm font-semibold py-2 rounded-md hover:bg-muted disabled:opacity-60">
                    <Download className="h-4 w-4" /> Download{estimate ? ` (${estimate})` : ""}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* footer */}
        <div className="flex items-center gap-2 px-4 py-3 border-t">
          <span className="text-xs text-muted-foreground">{outW} × {outH} px · {format.split("/")[1].toUpperCase()}</span>
          <div className="ml-auto flex gap-2">
            <button onClick={onClose} className="text-sm px-4 py-2 rounded-md border hover:bg-muted">Cancel</button>
            <button onClick={save} disabled={busy || !img} className="inline-flex items-center gap-2 bg-primary text-primary-foreground text-sm font-semibold px-5 py-2 rounded-md hover:bg-primary/90 disabled:opacity-60">
              <Check className="h-4 w-4" /> {busy ? "Saving…" : "Save image"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------- helpers ---------------- */

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-semibold mb-1.5">{label}</p>
      {children}
    </div>
  );
}

function IconBtn({ children, onClick, title, active }: { children: React.ReactNode; onClick: () => void; title: string; active?: boolean }) {
  return (
    <button onClick={onClick} title={title} className={`flex-1 grid place-items-center py-2 rounded-md border ${active ? "bg-primary text-primary-foreground border-primary" : "hover:bg-muted"}`}>
      {children}
    </button>
  );
}

function Slider({ label, value, min, max, step = 1, unit = "", onChange }: { label: string; value: number; min: number; max: number; step?: number; unit?: string; onChange: (v: number) => void }) {
  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="font-semibold">{label}</span>
        <span className="text-muted-foreground">{value}{unit}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full accent-[var(--color-primary,#0ea5b7)]" />
    </div>
  );
}

// Unsharp mask via a 3×3 convolution — CSS filters have no sharpen primitive.
function applySharpen(ctx: CanvasRenderingContext2D, w: number, h: number, amount: number) {
  if (w < 3 || h < 3) return;
  const src = ctx.getImageData(0, 0, w, h);
  const out = ctx.createImageData(w, h);
  const s = src.data, d = out.data;
  const c = 1 + 4 * amount, e = -amount; // centre / edge weights
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      if (x === 0 || y === 0 || x === w - 1 || y === h - 1) {
        d[i] = s[i]; d[i + 1] = s[i + 1]; d[i + 2] = s[i + 2]; d[i + 3] = s[i + 3];
        continue;
      }
      for (let ch = 0; ch < 3; ch++) {
        const p = i + ch;
        const v =
          s[p] * c +
          s[p - 4] * e + s[p + 4] * e +
          s[p - w * 4] * e + s[p + w * 4] * e;
        d[p] = v < 0 ? 0 : v > 255 ? 255 : v;
      }
      d[i + 3] = s[i + 3];
    }
  }
  ctx.putImageData(out, 0, 0);
}
