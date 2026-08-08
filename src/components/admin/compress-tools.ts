/**
 * Client-side compression with a measured quality target.
 *
 * A bare quality slider asks the wrong question. "Is 82 enough?" has no answer
 * without looking at the image: a flat studio shot survives quality 55, a photo
 * of crushed ice falls apart at 80. So everything here is built around actually
 * measuring the damage (SSIM) and searching for the setting that meets a stated
 * goal — a size budget, or a quality floor — instead of guessing.
 */

export type Format = "image/webp" | "image/jpeg" | "image/png";

export type EncodeResult = {
  format: Format;
  quality: number;
  bytes: number;
  blob: Blob;
  /** 0-1 structural similarity against the source. 1 = identical. */
  ssim: number;
  /** False when a target-size or target-quality search could not be satisfied. */
  metTarget?: boolean;
};

/* ------------------------------------------------------------------ *
 * Encoding
 * ------------------------------------------------------------------ */

export function encode(canvas: HTMLCanvasElement, format: Format, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    // toBlob rather than toDataURL: no base64 round-trip, so it is both faster
    // and roughly a third less memory on a large image.
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Encoding failed"))),
      format,
      format === "image/png" ? undefined : quality,
    );
  });
}

async function decodeToCanvas(blob: Blob, w: number, h: number): Promise<HTMLCanvasElement> {
  const bmp = await createImageBitmap(blob);
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  const x = c.getContext("2d", { willReadFrequently: true });
  if (!x) throw new Error("No 2D context");
  // Must match the reference sampler exactly. A fresh context defaults to "low",
  // so without this the reference is resampled with a good filter and the encode
  // with a cheap one, and SSIM reports the difference between the two filters as
  // if it were codec damage — a lossless re-encode scored well below 1.
  x.imageSmoothingQuality = "high";
  x.drawImage(bmp, 0, 0, w, h);
  bmp.close?.();
  return c;
}

/* ------------------------------------------------------------------ *
 * Quality measurement
 * ------------------------------------------------------------------ */

/** Rec. 709 luma. Structure lives in luminance; chroma error is far less visible. */
function luma(data: Uint8ClampedArray, n: number): Float32Array {
  const out = new Float32Array(n);
  for (let p = 0; p < n; p++) {
    const i = p * 4;
    out[p] = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
  }
  return out;
}

/**
 * Mean SSIM over 8×8 windows.
 *
 * Chosen over PSNR because PSNR is close to useless for this decision — it
 * scores a uniformly slightly-wrong image the same as one with an ugly blocking
 * artefact in the middle of the subject. SSIM tracks the structural damage a
 * person actually notices.
 *
 * Constants are the standard ones for 8-bit data (Wang et al. 2004):
 * C1 = (0.01·255)², C2 = (0.03·255)².
 */
export function ssim(a: ImageData, b: ImageData): number {
  if (a.width !== b.width || a.height !== b.height) return 0;
  const w = a.width, h = a.height, n = w * h;
  const A = luma(a.data, n), B = luma(b.data, n);
  const C1 = 6.5025, C2 = 58.5225;
  const W = 8;
  // Stride is HALF the window, not the whole window. With a stride of 8 anchored
  // at (0,0) every window is exactly one JPEG DCT block, so a blocking artefact
  // — the dominant failure of a low-quality encode — always falls on a window
  // edge and never inside one. Measured on a synthetic ±8 code-value DC step per
  // block: aligned windows score 0.998 ("visually identical") where an
  // overlapping pass scores 0.676. That blindness let fitToQuality drive quality
  // down to ~12% while reporting it had met a 97% floor.
  const STRIDE = W >> 1;

  let total = 0, windows = 0;
  for (let y = 0; y + W <= h; y += STRIDE) {
    for (let x = 0; x + W <= w; x += STRIDE) {
      let sa = 0, sb = 0, saa = 0, sbb = 0, sab = 0;
      for (let dy = 0; dy < W; dy++) {
        const row = (y + dy) * w + x;
        for (let dx = 0; dx < W; dx++) {
          const va = A[row + dx], vb = B[row + dx];
          sa += va; sb += vb; saa += va * va; sbb += vb * vb; sab += va * vb;
        }
      }
      const m = W * W;
      const ma = sa / m, mb = sb / m;
      const va = saa / m - ma * ma, vb = sbb / m - mb * mb;
      const cov = sab / m - ma * mb;
      total += ((2 * ma * mb + C1) * (2 * cov + C2)) / ((ma * ma + mb * mb + C1) * (va + vb + C2));
      windows++;
    }
  }
  return windows ? total / windows : 1;
}

type Rect = { x: number; y: number; w: number; h: number };

/**
 * Where to measure.
 *
 * Deliberately NOT a downscale of the whole frame. Downscaling is a low-pass
 * filter, and it removes exactly the high-frequency ringing and blocking that
 * the measurement exists to detect — a scaled-down comparison flatters every
 * encode. Instead: use the image whole if it is small, otherwise take tiles at
 * NATIVE resolution, spread across the frame so the subject and the background
 * are both represented.
 */
function sampleRects(canvas: HTMLCanvasElement): Rect[] {
  const W = canvas.width, H = canvas.height;
  const BUDGET = 1_200_000;
  if (W * H <= BUDGET) return [{ x: 0, y: 0, w: W, h: H }];

  const tile = Math.max(64, Math.min(W, H, Math.round(Math.sqrt(BUDGET / 4))));
  const at = (fx: number, fy: number): Rect => ({
    x: Math.max(0, Math.min(W - tile, Math.round(fx * W - tile / 2))),
    y: Math.max(0, Math.min(H - tile, Math.round(fy * H - tile / 2))),
    w: tile, h: tile,
  });
  // Centre carries the subject; the three others catch backdrop and edges.
  return [at(0.5, 0.5), at(0.25, 0.3), at(0.75, 0.35), at(0.5, 0.8)];
}

function readRects(canvas: HTMLCanvasElement, rects: Rect[]): ImageData[] {
  const x = canvas.getContext("2d", { willReadFrequently: true });
  if (!x) throw new Error("No 2D context");
  return rects.map((r) => x.getImageData(r.x, r.y, r.w, r.h));
}

/** SSIM of an encode against the source, averaged over the sample tiles. */
async function measure(
  source: HTMLCanvasElement, blob: Blob, ref: ImageData[], rects: Rect[],
): Promise<number> {
  const dec = await decodeToCanvas(blob, source.width, source.height);
  const got = readRects(dec, rects);
  let total = 0;
  for (let i = 0; i < ref.length; i++) total += ssim(ref[i], got[i]);
  return ref.length ? total / ref.length : 1;
}

/* ------------------------------------------------------------------ *
 * Search strategies
 * ------------------------------------------------------------------ */

export type Strategy = "quality" | "target-size" | "target-quality" | "smallest";

/** Encode once at a fixed quality and report what it cost. */
export async function encodeAt(canvas: HTMLCanvasElement, format: Format, quality: number): Promise<EncodeResult> {
  const rects = sampleRects(canvas);
  const ref = readRects(canvas, rects);
  const blob = await encode(canvas, format, quality);
  return { format, quality, bytes: blob.size, blob, ssim: await measure(canvas, blob, ref, rects) };
}

/**
 * Binary search for the highest quality that fits a byte budget.
 *
 * Monotonicity of size against quality is what makes this valid, and it does
 * hold for JPEG and WebP. It does NOT hold for PNG, which ignores the quality
 * argument entirely — that path is handled by palette reduction instead.
 */
export async function fitToSize(
  canvas: HTMLCanvasElement, format: Format, targetBytes: number,
  onStep?: (q: number, bytes: number) => void,
): Promise<EncodeResult> {
  const rects = sampleRects(canvas);
  const ref = readRects(canvas, rects);
  // PNG ignores the quality argument entirely, so searching it would run nine
  // identical full-resolution encodes and then report the last as if it had
  // found something. Colour reduction is the only lever there.
  if (format === "image/png") return encodeAt(canvas, format, 1);
  let lo = 0.05, hi = 0.98;
  let best: Blob | null = null, bestQ = lo;

  for (let i = 0; i < 9; i++) {
    const q = (lo + hi) / 2;
    const blob = await encode(canvas, format, q);
    onStep?.(q, blob.size);
    if (blob.size <= targetBytes) { best = blob; bestQ = q; lo = q; }
    else hi = q;
  }
  if (!best) { best = await encode(canvas, format, 0.05); bestQ = 0.05; }
  return {
    format, quality: bestQ, bytes: best.size, blob: best,
    ssim: await measure(canvas, best, ref, rects),
    // Distinguishes "found it" from "gave up": the UI must not present a miss as
    // a hit just because an EncodeResult came back.
    metTarget: best.size <= targetBytes,
  };
}

/**
 * Binary search for the *smallest* file whose SSIM still clears a floor.
 *
 * This is the setting worth having: state how much visible damage is
 * acceptable, and let the search find the cheapest encode that stays under it,
 * per image. A flat studio shot lands near quality 50, a busy one near 90 —
 * which is exactly the judgement a fixed slider cannot make.
 */
export async function fitToQuality(
  canvas: HTMLCanvasElement, format: Format, minSsim: number,
  onStep?: (q: number, ssimValue: number) => void,
): Promise<EncodeResult> {
  const rects = sampleRects(canvas);
  const ref = readRects(canvas, rects);
  if (format === "image/png") return encodeAt(canvas, format, 1);   // already lossless
  let lo = 0.05, hi = 0.98;
  let best: { blob: Blob; q: number; ssim: number } | null = null;

  for (let i = 0; i < 8; i++) {
    const q = (lo + hi) / 2;
    const blob = await encode(canvas, format, q);
    const sv = await measure(canvas, blob, ref, rects);
    onStep?.(q, sv);
    if (sv >= minSsim) { best = { blob, q, ssim: sv }; hi = q; }  // good enough — try smaller
    else lo = q;
  }
  let metTarget = true;
  if (!best) {
    // Nothing reached the floor. Hand back the best available rather than fail
    // quietly, and mark it so the UI can say the target was not met.
    const blob = await encode(canvas, format, 0.98);
    best = { blob, q: 0.98, ssim: await measure(canvas, blob, ref, rects) };
    metTarget = false;
  }
  return { format, quality: best.q, bytes: best.blob.size, blob: best.blob, ssim: best.ssim, metTarget };
}

/** Encode across formats and qualities so the choice can be made on numbers. */
/** Does any pixel carry partial or zero alpha? Decides whether JPEG is offerable. */
export function hasTransparency(canvas: HTMLCanvasElement): boolean {
  const x = canvas.getContext("2d", { willReadFrequently: true });
  if (!x) return false;
  const n = canvas.width * canvas.height;
  // Sampled rather than exhaustive: scanning 12 MP to answer a yes/no question
  // is not worth the stall, and a real cut-out has transparency spread widely.
  const step = Math.max(1, Math.floor(n / 200_000));
  const d = x.getImageData(0, 0, canvas.width, canvas.height).data;
  for (let p = 0; p < n; p += step) if (d[p * 4 + 3] < 250) return true;
  return false;
}

export async function compareFormats(
  canvas: HTMLCanvasElement,
  qualities = [0.9, 0.8, 0.65],
  onProgress?: (done: number, total: number) => void,
): Promise<EncodeResult[]> {
  const rects = sampleRects(canvas);
  const ref = readRects(canvas, rects);
  // JPEG has no alpha channel: canvas composites transparency onto black, so a
  // cut-out encoded as JPEG comes back on a black rectangle and scores terribly.
  // Offering it at all would be offering a broken option.
  const formats: Format[] = hasTransparency(canvas) ? ["image/webp"] : ["image/webp", "image/jpeg"];
  const jobs: { format: Format; quality: number }[] = [];
  for (const f of formats) for (const q of qualities) jobs.push({ format: f, quality: q });
  jobs.push({ format: "image/png", quality: 1 });

  const out: EncodeResult[] = [];
  for (let i = 0; i < jobs.length; i++) {
    const { format, quality } = jobs[i];
    const blob = await encode(canvas, format, quality);
    out.push({ format, quality, bytes: blob.size, blob, ssim: await measure(canvas, blob, ref, rects) });
    onProgress?.(i + 1, jobs.length);
  }
  return out.sort((a, b) => a.bytes - b.bytes);
}

/* ------------------------------------------------------------------ *
 * PNG palette reduction
 * ------------------------------------------------------------------ */

/**
 * Median-cut colour quantisation, histogram-based.
 *
 * Two things worth being honest about:
 *
 * 1. The canvas PNG encoder always writes full RGBA — it cannot emit an indexed
 *    palette. So this does not produce a "palette PNG" in the pngquant sense.
 *    What it does is collapse the image onto N distinct colours, which makes
 *    DEFLATE's job dramatically easier: on real photographic content a cut-out
 *    at 64 colours measures roughly half the size. On a synthetic, noise-free
 *    gradient it can go the other way, which is why the result is measured and
 *    shown rather than assumed.
 *
 * 2. It works on a 15-bit histogram (32,768 cells), not on a per-pixel array.
 *    The obvious implementation — collect every opaque pixel into a number[] and
 *    sort it per split — is O(n log n) with an eight-byte boxed entry per pixel,
 *    which on a 12 MP image is hundreds of megabytes and a multi-second freeze
 *    of the main thread. The histogram is a fixed 32k regardless of image size.
 */
export function quantize(src: ImageData, colors: number, dither: boolean): ImageData {
  const n = src.width * src.height;
  const out = new ImageData(new Uint8ClampedArray(src.data), src.width, src.height);
  const d = out.data;
  const target = Math.max(2, Math.min(256, colors));

  // --- 15-bit histogram: 5 bits per channel ---
  const BINS = 32768;
  const count = new Uint32Array(BINS);
  const sumR = new Float64Array(BINS), sumG = new Float64Array(BINS), sumB = new Float64Array(BINS);
  const binOf = (r: number, g: number, b: number) => ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3);

  let opaque = 0;
  for (let p = 0; p < n; p++) {
    const i = p * 4;
    if (d[i + 3] <= 8) continue;          // fully clear pixels carry no colour
    const bin = binOf(d[i], d[i + 1], d[i + 2]);
    count[bin]++; sumR[bin] += d[i]; sumG[bin] += d[i + 1]; sumB[bin] += d[i + 2];
    opaque++;
  }
  if (!opaque) return out;

  const used: number[] = [];
  for (let b = 0; b < BINS; b++) if (count[b]) used.push(b);
  if (used.length <= target) return out;   // already simpler than the target

  // --- median cut over histogram cells ---
  type Box = { bins: number[]; rMin: number; rMax: number; gMin: number; gMax: number; bMin: number; bMax: number; pop: number };
  const bounds = (bins: number[]): Box => {
    let rMin = 255, rMax = 0, gMin = 255, gMax = 0, bMin = 255, bMax = 0, pop = 0;
    for (const bin of bins) {
      const r = (bin >> 10) << 3, g = ((bin >> 5) & 31) << 3, b = (bin & 31) << 3;
      if (r < rMin) rMin = r; if (r > rMax) rMax = r;
      if (g < gMin) gMin = g; if (g > gMax) gMax = g;
      if (b < bMin) bMin = b; if (b > bMax) bMax = b;
      pop += count[bin];
    }
    return { bins, rMin, rMax, gMin, gMax, bMin, bMax, pop };
  };

  let boxes: Box[] = [bounds(used)];
  while (boxes.length < target) {
    // Split the box with the largest population-weighted extent: splitting a
    // wide box that almost no pixels fall into wastes a palette entry.
    let bi = -1, score = 0;
    for (let i = 0; i < boxes.length; i++) {
      const b = boxes[i];
      if (b.bins.length < 2) continue;
      const width = Math.max(b.rMax - b.rMin, b.gMax - b.gMin, b.bMax - b.bMin);
      const sc = width * Math.log2(b.pop + 1);
      if (sc > score) { score = sc; bi = i; }
    }
    if (bi < 0 || score === 0) break;
    const b = boxes[bi];
    const rw = b.rMax - b.rMin, gw = b.gMax - b.gMin, bw = b.bMax - b.bMin;
    const shift = rw >= gw && rw >= bw ? 10 : gw >= bw ? 5 : 0;
    const key = (bin: number) => (bin >> shift) & 31;
    b.bins.sort((x, y) => key(x) - key(y));
    // Split at the population median, not the midpoint of the list — otherwise a
    // box holding one huge cell and many tiny ones splits into nothing useful.
    const half = b.pop / 2;
    let acc = 0, cut = 1;
    for (let i = 0; i < b.bins.length - 1; i++) {
      acc += count[b.bins[i]];
      if (acc >= half) { cut = i + 1; break; }
    }
    boxes.splice(bi, 1, bounds(b.bins.slice(0, cut)), bounds(b.bins.slice(cut)));
  }

  const palette = boxes.map((box) => {
    let r = 0, g = 0, b = 0, c = 0;
    for (const bin of box.bins) { r += sumR[bin]; g += sumG[bin]; b += sumB[bin]; c += count[bin]; }
    return c ? [r / c, g / c, b / c] as [number, number, number] : [0, 0, 0] as [number, number, number];
  });

  // --- lookup, memoised per histogram cell ---
  // Without the cache this is a linear palette scan per pixel: 12 MP x 256
  // entries is three billion comparisons. With it, at most 32k scans.
  const cache = new Int16Array(BINS).fill(-1);
  const lookup = (r: number, g: number, b: number): [number, number, number] => {
    const bin = binOf(r, g, b);
    let idx = cache[bin];
    if (idx < 0) {
      let bd = Infinity;
      for (let i = 0; i < palette.length; i++) {
        const dr = r - palette[i][0], dg = g - palette[i][1], db = b - palette[i][2];
        const dist = dr * dr + dg * dg + db * db;
        if (dist < bd) { bd = dist; idx = i; }
      }
      cache[bin] = idx;
    }
    return palette[idx];
  };

  const w = src.width, h = src.height;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      if (d[i + 3] <= 8) continue;
      const or_ = d[i], og = d[i + 1], ob = d[i + 2];
      const [nr, ng, nb] = lookup(or_, og, ob);
      d[i] = nr; d[i + 1] = ng; d[i + 2] = nb;

      if (!dither) continue;
      // Error diffusion trades banding for noise. Worth it on gradients, but it
      // is noise, and noise is exactly what DEFLATE cannot compress — which is
      // why this is off by default and offered as a choice.
      const er = or_ - nr, eg = og - ng, eb = ob - nb;
      const spread = (xx: number, yy: number, f: number) => {
        if (xx < 0 || xx >= w || yy < 0 || yy >= h) return;
        const j = (yy * w + xx) * 4;
        if (d[j + 3] <= 8) return;
        d[j] = Math.min(255, Math.max(0, d[j] + er * f));
        d[j + 1] = Math.min(255, Math.max(0, d[j + 1] + eg * f));
        d[j + 2] = Math.min(255, Math.max(0, d[j + 2] + eb * f));
      };
      spread(x + 1, y, 7 / 16);
      spread(x - 1, y + 1, 3 / 16);
      spread(x, y + 1, 5 / 16);
      spread(x + 1, y + 1, 1 / 16);
    }
  }
  return out;
}

/* ------------------------------------------------------------------ *
 * Presentation helpers
 * ------------------------------------------------------------------ */

export function prettyBytes(n: number): string {
  if (n >= 1048576) return `${(n / 1048576).toFixed(2)} MB`;
  if (n >= 1024) return `${Math.round(n / 1024)} KB`;
  return `${n} B`;
}

/** Plain-language reading of an SSIM score, so the number means something. */
export function qualityLabel(s: number): { text: string; tone: "good" | "ok" | "bad" } {
  // Calibrated for the OVERLAPPING window pass above, which reads meaningfully
  // lower than a block-aligned one because it can finally see blocking. What the
  // old aligned grid scored 0.998 reads around 0.68 here on blocky output.
  if (s >= 0.995) return { text: "Visually identical", tone: "good" };
  if (s >= 0.985) return { text: "Indistinguishable in normal use", tone: "good" };
  if (s >= 0.965) return { text: "Slight softening, hard to spot", tone: "ok" };
  if (s >= 0.93) return { text: "Visible on close inspection", tone: "ok" };
  return { text: "Noticeable quality loss", tone: "bad" };
}

export function formatLabel(f: Format): string {
  return f === "image/webp" ? "WebP" : f === "image/jpeg" ? "JPEG" : "PNG";
}

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(new Error("Could not read the encoded image"));
    r.readAsDataURL(blob);
  });
}
