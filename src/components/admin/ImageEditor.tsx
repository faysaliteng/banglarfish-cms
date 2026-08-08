import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Crop as CropIcon, RotateCcw, RotateCw, FlipHorizontal, FlipVertical, Sliders,
  Maximize2, Download, X, Check, RefreshCw, Wand2,
} from "lucide-react";

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
  const [tab, setTab] = useState<"crop" | "adjust" | "resize">("crop");
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
    i.src = src;
  }, [src]);

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

    // Stage 1 — crop + colour, at source resolution.
    const c1 = document.createElement("canvas");
    c1.width = Math.round(sw); c1.height = Math.round(sh);
    const x1 = c1.getContext("2d");
    if (!x1) return null;
    x1.filter = filterCss || "none";
    x1.drawImage(img, sx, sy, sw, sh, 0, 0, c1.width, c1.height);

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
  }, [img, crop, filterCss, rotation, flipH, flipV, outW, outH, adj.sharpen]);

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
    setAdj(NEUTRAL); setPreset("none");
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
                  src={src} alt=""
                  className="block max-h-[60vh] max-w-full"
                  style={{ filter: filterCss || undefined, transform: `rotate(${rotation}deg) scale(${flipH ? -1 : 1}, ${flipV ? -1 : 1})` }}
                  draggable={false}
                />
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
              {([["crop", CropIcon, "Crop"], ["adjust", Sliders, "Adjust"], ["resize", Maximize2, "Export"]] as const).map(([k, Icon, label]) => (
                <button key={k} onClick={() => setTab(k)} className={`flex-1 py-2.5 text-xs font-semibold inline-flex items-center justify-center gap-1.5 ${tab === k ? "text-primary border-b-2 border-primary" : "text-muted-foreground hover:bg-muted"}`}>
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
                    <Slider label="Quality" value={Math.round(quality * 100)} min={40} max={100} onChange={(v) => setQuality(v / 100)} unit="%" />
                  )}
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
