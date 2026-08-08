/**
 * Background removal by alpha matting.
 *
 * The naive version of this — average the border pixels, flood fill anything
 * within an RGB distance, blur the mask edge — fails in four predictable ways
 * on real catalogue photography, and each stage here exists to fix one of them:
 *
 *   1. A single average colour cannot describe a gradient or vignette backdrop.
 *      Averaging a white-to-grey sweep gives mid-grey, which matches neither
 *      end.  →  a small k-means colour model, plus a local step threshold so
 *      the fill can walk a smooth gradient without leaking across a real edge.
 *
 *   2. RGB Euclidean distance is not perceptual. A soft shadow on white is far
 *      away in RGB but is obviously still background to a human.
 *      →  OKLab with the lightness axis down-weighted, so shadows fall inside a
 *      sane tolerance while a genuine colour change does not.
 *
 *   3. Blurring a binary mask is not matting. It halos, and it destroys hair,
 *      fins and fabric.  →  a trimap and per-pixel alpha estimated by
 *      projecting the pixel onto the foreground–background colour line.
 *
 *   4. Semi-transparent edge pixels keep the backdrop mixed into them, which is
 *      the white/green fringe that makes a cut-out look pasted on.
 *      →  colour decontamination, recovering F from C = αF + (1-α)B.
 *
 * Everything is plain canvas + typed arrays; no dependencies, no network.
 */

/* ------------------------------------------------------------------ *
 * Colour space
 * ------------------------------------------------------------------ */

// sRGB → OKLab. Chosen over CIELAB: comparable perceptual uniformity, no white
// point bookkeeping, and cheaper (three cube roots, no piecewise f(t)).
const SRGB_LUT = new Float32Array(256);
for (let i = 0; i < 256; i++) {
  const c = i / 255;
  SRGB_LUT[i] = c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

export function rgbToOklab(r: number, g: number, b: number): [number, number, number] {
  const R = SRGB_LUT[r], G = SRGB_LUT[g], B = SRGB_LUT[b];
  const l = Math.cbrt(0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B);
  const m = Math.cbrt(0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B);
  const s = Math.cbrt(0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B);
  return [
    0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s,
  ];
}

/**
 * Lightness weight for the distance metric.
 *
 * Below 1 on purpose: a drop shadow under a fish is a large lightness step but
 * almost no chroma step, and it should read as background. Pull this to 1 and
 * every soft shadow survives as a grey smear around the cut-out.
 */
const L_WEIGHT = 0.45;

function labDist2(
  L1: number, a1: number, b1: number,
  L2: number, a2: number, b2: number,
): number {
  const dL = (L1 - L2) * L_WEIGHT, da = a1 - a2, db = b1 - b2;
  return dL * dL + da * da + db * db;
}

/* ------------------------------------------------------------------ *
 * Options
 * ------------------------------------------------------------------ */

export type MattingOptions = {
  /** 0-100. How far a colour may sit from the background model. */
  tolerance: number;
  /** 0-100. How much a neighbouring pixel may differ and still continue the
   *  fill. This is what lets a gradient backdrop work — it walks the ramp one
   *  small step at a time instead of comparing everything to one seed colour. */
  gradientTolerance: number;
  /** 0-12 px. Width of the unknown band where alpha is estimated. */
  softness: number;
  /** "auto" seeds from the border; "chroma" keys out one picked colour. */
  mode: "auto" | "chroma";
  /** Key colour for chroma mode, as [r,g,b] 0-255. */
  keyColor?: [number, number, number];
  /** Drop foreground islands smaller than this many pixels (0 = off). */
  despeckle: number;
  /**
   * 0-100. Pulls the matte inward, killing the last ring of halo.
   * Acts on partial alpha only, so it does nothing when `softness` is 0 — a
   * binary matte has no partial values to pull. The UI disables it there rather
   * than offering a slider that silently has no effect.
   */
  shrink: number;
  /** Recover true foreground colour from the blend. Off looks fringed. */
  decontaminate: boolean;
  /** Also remove background not touching the border (kills enclosed gaps). */
  global: boolean;
};

/**
 * Defaults calibrated against measured OKLab distances rather than guessed.
 * On a white sweep: backdrop variation sits around 0.02, a light silver fish
 * around 0.084, mid grey around 0.18. Tolerance 12 puts the threshold at 0.066
 * — comfortably past backdrop noise, with ~25% margin before it starts eating a
 * pale subject. Too generous a default is worse than too tight: a user who
 * loses half the fish assumes the tool is broken, while one who sees leftover
 * background reaches for the slider.
 */
export const DEFAULT_MATTING: MattingOptions = {
  tolerance: 12,
  gradientTolerance: 4,
  softness: 3,
  mode: "auto",
  despeckle: 24,
  shrink: 12,
  decontaminate: true,
  global: false,
};

/** Analysis is capped here; the alpha matte is upsampled back to full size.
 *  Three Float32Arrays over a 12 MP image is 144 MB, which is enough to get a
 *  browser tab killed. The matte is smooth by construction, so upsampling it
 *  costs far less quality than running out of memory costs. */
const MAX_ANALYSIS_PX = 4_000_000;

/* ------------------------------------------------------------------ *
 * Background colour model
 * ------------------------------------------------------------------ */

type Cluster = { L: number; a: number; b: number; n: number };

/**
 * k-means over the border pixels.
 *
 * One average colour is the single biggest cause of bad cut-outs on real
 * photos: a backdrop that is lighter at the top than the bottom, or a paper
 * sweep with a shadow gradient, has no meaningful mean. A handful of centroids
 * describes it well enough, and the fill then measures against the *nearest*
 * one.
 */
function backgroundModel(
  L: Float32Array, A: Float32Array, B: Float32Array,
  w: number, h: number, k = 5,
): Cluster[] {
  const samples: number[] = [];
  const push = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= w || y >= h) return;   // 1-3 px images index off the end
    samples.push(y * w + x);
  };
  // Two rings deep: the outermost row often carries lens vignetting or a
  // compression edge that is not representative of the backdrop.
  for (let x = 0; x < w; x++) { push(x, 0); push(x, 1); push(x, h - 1); push(x, h - 2); }
  for (let y = 0; y < h; y++) { push(0, y); push(1, y); push(w - 1, y); push(w - 2, y); }

  // Seed spread across the sample list rather than randomly: deterministic, and
  // it lands on different parts of a gradient instead of clumping.
  const centres: Cluster[] = [];
  for (let i = 0; i < k; i++) {
    const p = samples[Math.floor((i + 0.5) * samples.length / k)];
    centres.push({ L: L[p], a: A[p], b: B[p], n: 0 });
  }

  for (let iter = 0; iter < 8; iter++) {
    const acc = centres.map(() => ({ L: 0, a: 0, b: 0, n: 0 }));
    for (const p of samples) {
      let best = 0, bestD = Infinity;
      for (let c = 0; c < centres.length; c++) {
        const d = labDist2(L[p], A[p], B[p], centres[c].L, centres[c].a, centres[c].b);
        if (d < bestD) { bestD = d; best = c; }
      }
      acc[best].L += L[p]; acc[best].a += A[p]; acc[best].b += B[p]; acc[best].n++;
    }
    for (let c = 0; c < centres.length; c++) {
      // An emptied centroid must lose its count too. Leaving the stale n behind
      // lets a dead cluster survive the min-size cull below and stay in the
      // model at a position nothing actually voted for.
      if (!acc[c].n) { centres[c] = { ...centres[c], n: 0 }; continue; }
      centres[c] = { L: acc[c].L / acc[c].n, a: acc[c].a / acc[c].n, b: acc[c].b / acc[c].n, n: acc[c].n };
    }
  }
  // Clusters that captured almost nothing are noise (a stray object clipping
  // the frame edge); keeping them would widen the background model wrongly.
  const min = samples.length * 0.02;
  const kept = centres.filter((c) => c.n >= min);
  return kept.length ? kept : centres;
}

function nearestBg(cs: Cluster[], L: number, a: number, b: number): { d2: number; c: Cluster } {
  let best = cs[0], bestD = Infinity;
  for (const c of cs) {
    const d = labDist2(L, a, b, c.L, c.a, c.b);
    if (d < bestD) { bestD = d; best = c; }
  }
  return { d2: bestD, c: best };
}

/* ------------------------------------------------------------------ *
 * Distance transform (for the unknown band)
 * ------------------------------------------------------------------ */

/**
 * Chamfer distance to the nearest pixel where `mask` differs from `mask[p]`,
 * in two sweeps. O(n).
 *
 * This replaces a box filter over every pixel at radius r, which is O(n·r²) —
 * at r=8 on a 3000×3000 image that is ~2.6 billion operations and long enough
 * to hang the tab. Here only the thin band near the boundary is ever visited
 * by the expensive matting step.
 */
function boundaryDistance(mask: Uint8Array, w: number, h: number, limit: number): Float32Array {
  const INF = 1e9;
  const dist = new Float32Array(w * h).fill(INF);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const p = y * w + x;
      const m = mask[p];
      if ((x > 0 && mask[p - 1] !== m) || (x < w - 1 && mask[p + 1] !== m) ||
          (y > 0 && mask[p - w] !== m) || (y < h - 1 && mask[p + w] !== m)) {
        dist[p] = 0;
      }
    }
  }

  const D1 = 1, D2 = 1.41421356;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const p = y * w + x;
      let d = dist[p];
      if (y > 0) {
        if (d > dist[p - w] + D1) d = dist[p - w] + D1;
        if (x > 0 && d > dist[p - w - 1] + D2) d = dist[p - w - 1] + D2;
        if (x < w - 1 && d > dist[p - w + 1] + D2) d = dist[p - w + 1] + D2;
      }
      if (x > 0 && d > dist[p - 1] + D1) d = dist[p - 1] + D1;
      if (d < dist[p]) dist[p] = d;
    }
  }
  for (let y = h - 1; y >= 0; y--) {
    for (let x = w - 1; x >= 0; x--) {
      const p = y * w + x;
      let d = dist[p];
      if (y < h - 1) {
        if (d > dist[p + w] + D1) d = dist[p + w] + D1;
        if (x > 0 && d > dist[p + w - 1] + D2) d = dist[p + w - 1] + D2;
        if (x < w - 1 && d > dist[p + w + 1] + D2) d = dist[p + w + 1] + D2;
      }
      if (x < w - 1 && d > dist[p + 1] + D1) d = dist[p + 1] + D1;
      if (d < dist[p]) dist[p] = d;
      if (dist[p] > limit) dist[p] = limit;
    }
  }
  return dist;
}

/* ------------------------------------------------------------------ *
 * The pipeline
 * ------------------------------------------------------------------ */

export type MatteResult = {
  /** 0-255 alpha at the analysis resolution. */
  alpha: Uint8ClampedArray;
  width: number;
  height: number;
  /** The background colour model, reused for decontamination. */
  clusters: Cluster[];
  /**
   * The LOCAL background colour behind each band pixel, as packed RGB, or 0 when
   * unknown. Recorded during matting because it cannot be recovered afterwards:
   * by the time applyMatte sees a pixel it holds the blend C, and asking which
   * cluster C is nearest gives the wrong answer as soon as alpha rises — C
   * drifts off its own backdrop cluster onto a neighbouring one, and the
   * decontamination then subtracts a colour that was never there.
   */
  bgOf: Int32Array;
  /** Share of the frame judged to be background — used to warn about a wipe-out. */
  removedFraction: number;
};

/**
 * Compute an alpha matte for `src`. Pure: it does not touch the canvas.
 * Exposed separately from `applyMatte` so the editor can preview a matte and
 * let the user paint corrections before anything is committed.
 */
export function computeMatte(
  src: ImageData,
  opts: MattingOptions,
  /** Optional manual overrides: 1 = force foreground, 2 = force background. */
  strokes?: Uint8Array,
): MatteResult {
  const w = src.width, h = src.height;
  const n = w * h;
  const d = src.data;
  if (strokes && strokes.length !== n) {
    throw new Error(`Stroke buffer is ${strokes.length}, expected ${n}`);
  }

  const L = new Float32Array(n), A = new Float32Array(n), B = new Float32Array(n);
  for (let p = 0; p < n; p++) {
    const i = p * 4;
    const [l, a, b] = rgbToOklab(d[i], d[i + 1], d[i + 2]);
    L[p] = l; A[p] = a; B[p] = b;
  }

  const clusters: Cluster[] =
    opts.mode === "chroma" && opts.keyColor  // eslint-disable-line
      ? [(() => { const [l, a, b] = rgbToOklab(...opts.keyColor); return { L: l, a, b, n: 1 }; })()]
      : backgroundModel(L, A, B, w, h);

  // Tolerances are squared distances in OKLab. The scale factors map the 0-100
  // sliders onto a useful range — OKLab distances between distinct colours are
  // typically 0.05-0.6, so 100 lands a little past "everything".
  const tol = (opts.tolerance / 100) * 0.55;
  const tol2 = tol * tol;
  const step = (opts.gradientTolerance / 100) * 0.18;
  const step2 = step * step;
  // A pure step-to-step walk is unbounded: on a softly blurred subject edge it
  // can hop from backdrop into the middle of the fish one small step at a time
  // and never stop. The walk may exceed the global tolerance, but only so far.
  const loose2 = (tol * 1.75) * (tol * 1.75);

  /* --- 1. Flood fill: global membership OR a small step from a known bg pixel --- */
  const mask = new Uint8Array(n); // 1 = background
  const stack = new Int32Array(n);
  let sp = 0;

  const consider = (p: number, from: number) => {
    if (mask[p]) return;
    if (strokes && strokes[p] === 1) return;            // painted foreground wins
    const inModel = nearestBg(clusters, L[p], A[p], B[p]).d2 <= tol2;
    const inStep = from >= 0
      && labDist2(L[p], A[p], B[p], L[from], A[from], B[from]) <= step2
      && nearestBg(clusters, L[p], A[p], B[p]).d2 <= loose2;
    if (!inModel && !inStep) return;
    mask[p] = 1;
    stack[sp++] = p;
  };

  // The key-colour branch requires an actual key colour. Selecting "chroma" in
  // the UI sets the mode before the user has clicked anything, and without this
  // test that intermediate state ran a connectivity-free removal against the
  // BORDER model — deleting every pixel resembling the backdrop anywhere in the
  // frame, which is neither mode the user asked for.
  const keyed = opts.mode === "chroma" && !!opts.keyColor;
  if (keyed || opts.global) {
    // Colour keying is not a connectivity problem: every matching pixel goes,
    // wherever it is. Same for the "remove enclosed background" option.
    for (let p = 0; p < n; p++) {
      if (strokes && strokes[p] === 1) continue;
      if (nearestBg(clusters, L[p], A[p], B[p]).d2 <= tol2) mask[p] = 1;
    }
  } else {
    for (let x = 0; x < w; x++) { consider(x, -1); consider((h - 1) * w + x, -1); }
    for (let y = 0; y < h; y++) { consider(y * w, -1); consider(y * w + w - 1, -1); }
    while (sp > 0) {
      const p = stack[--sp];
      const x = p % w, y = (p / w) | 0;
      if (x > 0) consider(p - 1, p);
      if (x < w - 1) consider(p + 1, p);
      if (y > 0) consider(p - w, p);
      if (y < h - 1) consider(p + w, p);
    }
  }

  // Painted background always wins, whatever the colour said.
  if (strokes) for (let p = 0; p < n; p++) if (strokes[p] === 2) mask[p] = 1;

  /* --- 2. Despeckle: drop tiny islands on both sides --- */
  if (opts.despeckle > 0) {
    removeSmallRegions(mask, w, h, 0, opts.despeckle, strokes); // stray foreground specks
    removeSmallRegions(mask, w, h, 1, opts.despeckle, strokes); // pinholes inside the subject
  }

  /* --- 3. Trimap + alpha matting inside the band only --- */
  const band = Math.max(0, Math.min(12, opts.softness));
  const alpha = new Uint8ClampedArray(n);
  const bgOf = new Int32Array(n);
  for (let p = 0; p < n; p++) alpha[p] = mask[p] ? 0 : 255;

  if (band > 0) {
    const dist = boundaryDistance(mask, w, h, band + 2);
    // +2 so the window always extends past the band. At exactly ceil(band) a
    // pixel in the middle of the band can fail to find any confident foreground
    // or background pixel, and gets skipped — which silently leaves it fully
    // opaque and produces a hard, un-feathered edge exactly where the softness
    // setting was supposed to help.
    const r = Math.ceil(band) + 2;

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const p = y * w + x;
        if (dist[p] > band) continue;                 // outside the unknown band
        if (strokes && strokes[p]) continue;          // hand-painted: leave binary

        // Nearest confident foreground and background colours in a small window.
        let fL = 0, fA = 0, fB = 0, fD = Infinity;
        let bL = 0, bA = 0, bB = 0, bD = Infinity;
        for (let dy = -r; dy <= r; dy++) {
          const yy = y + dy;
          if (yy < 0 || yy >= h) continue;
          for (let dx = -r; dx <= r; dx++) {
            const xx = x + dx;
            if (xx < 0 || xx >= w) continue;
            const q = yy * w + xx;
            if (dist[q] <= band) continue;            // also unknown — no help
            const g = dx * dx + dy * dy;
            if (mask[q]) { if (g < bD) { bD = g; bL = L[q]; bA = A[q]; bB = B[q]; } }
            else { if (g < fD) { fD = g; fL = L[q]; fA = A[q]; fB = B[q]; } }
          }
        }
        if (fD === Infinity || bD === Infinity) continue;

        // C = αF + (1-α)B  ⇒  α = ((C-B)·(F-B)) / |F-B|²
        const dfL = fL - bL, dfA = fA - bA, dfB = fB - bB;
        const den = dfL * dfL + dfA * dfA + dfB * dfB;
        if (den < 1e-8) continue;                     // F and B identical: undecidable
        const cL = L[p] - bL, cA = A[p] - bA, cB = B[p] - bB;
        let a = (cL * dfL + cA * dfA + cB * dfB) / den;
        a = a < 0 ? 0 : a > 1 ? 1 : a;
        alpha[p] = Math.round(a * 255);
        // Remember the actual local backdrop, not a guess made later.
        const [br, bgc, bb] = oklabToRgb(bL, bA, bB);
        bgOf[p] = 1 | (br << 8) | (bgc << 16) | (bb << 24);
      }
    }
  }

  /* --- 4. Shrink: pull the matte in to kill the last halo ring --- */
  if (opts.shrink > 0) {
    const s = (opts.shrink / 100) * 0.85;             // never allow a full wipe
    const inv = 1 / (1 - s);
    for (let p = 0; p < n; p++) {
      if (alpha[p] === 0 || alpha[p] === 255) continue;
      const a = alpha[p] / 255;
      alpha[p] = Math.round(Math.max(0, (a - s) * inv) * 255);
    }
  }

  let removed = 0;
  for (let p = 0; p < n; p++) if (alpha[p] < 128) removed++;

  return { alpha, width: w, height: h, clusters, bgOf, removedFraction: removed / n };
}

/**
 * Flood-fill connected regions of `value` and flip any smaller than `minSize`.
 * Hand-painted pixels are never flipped — an explicit instruction outranks a
 * size heuristic.
 */
function removeSmallRegions(
  mask: Uint8Array, w: number, h: number,
  value: number, minSize: number, strokes?: Uint8Array,
): void {
  // 8-connected, not 4. A one-pixel-wide diagonal — a prawn antenna, a whisker,
  // a fin ray — is a chain of pixels that touch only at corners, so under
  // 4-connectivity it labels as N separate regions of size 1 and the despeckle
  // threshold deletes every one of them.
  const n = w * h;
  const seen = new Uint8Array(n);
  const queue = new Int32Array(n);

  for (let start = 0; start < n; start++) {
    if (seen[start] || mask[start] !== value) continue;
    let qh = 0, qt = 0;
    queue[qt++] = start; seen[start] = 1;
    let painted = false;
    while (qh < qt) {
      const p = queue[qh++];
      if (strokes && strokes[p]) painted = true;
      const x = p % w, y = (p / w) | 0;
      for (let dy = -1; dy <= 1; dy++) {
        const yy = y + dy;
        if (yy < 0 || yy >= h) continue;
        for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx;
          if (xx < 0 || xx >= w || (dx === 0 && dy === 0)) continue;
          const q = yy * w + xx;
          if (!seen[q] && mask[q] === value) { seen[q] = 1; queue[qt++] = q; }
        }
      }
    }
    // queue[0..qt) IS the region — BFS never removes from it, so a second
    // full-size buffer holding the same indices was pure waste.
    if (!painted && qt < minSize) {
      const flip = value === 0 ? 1 : 0;
      for (let i = 0; i < qt; i++) mask[queue[i]] = flip;
    }
  }
}

/* ------------------------------------------------------------------ *
 * Applying the matte
 * ------------------------------------------------------------------ */

function bilinearAlpha(
  alpha: Uint8ClampedArray, aw: number, ah: number,
  x: number, y: number,
): number {
  const fx = Math.min(aw - 1, Math.max(0, x)), fy = Math.min(ah - 1, Math.max(0, y));
  const x0 = Math.floor(fx), y0 = Math.floor(fy);
  const x1 = Math.min(aw - 1, x0 + 1), y1 = Math.min(ah - 1, y0 + 1);
  const tx = fx - x0, ty = fy - y0;
  const a00 = alpha[y0 * aw + x0], a10 = alpha[y0 * aw + x1];
  const a01 = alpha[y1 * aw + x0], a11 = alpha[y1 * aw + x1];
  return (a00 * (1 - tx) + a10 * tx) * (1 - ty) + (a01 * (1 - tx) + a11 * tx) * ty;
}

/** Convert an OKLab background centroid back to sRGB for decontamination. */
function oklabToRgb(L: number, a: number, b: number): [number, number, number] {
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.2914855480 * b;
  const l = l_ * l_ * l_, m = m_ * m_ * m_, s = s_ * s_ * s_;
  const lin = [
    +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s,
  ];
  return lin.map((c) => {
    const v = c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(Math.max(0, c), 1 / 2.4) - 0.055;
    return Math.round(Math.min(255, Math.max(0, v * 255)));
  }) as [number, number, number];
}

/**
 * Write a matte into full-resolution image data.
 *
 * Decontamination is the step that makes a cut-out look cut rather than pasted:
 * a 50%-alpha edge pixel photographed against white is literally half white, so
 * compositing it onto a dark page shows a bright fringe. Solving C = αF + (1-α)B
 * for F removes it.
 */
export function applyMatte(
  target: ImageData,
  matte: MatteResult,
  opts: Pick<MattingOptions, "decontaminate">,
): void {
  const w = target.width, h = target.height, d = target.data;
  const sx = matte.width / w, sy = matte.height / h;
  const sameSize = matte.width === w && matte.height === h;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const p = y * w + x;
      const i = p * 4;
      // Centre-aligned sampling: (x + 0.5) * scale - 0.5. Corner alignment
      // shifts the whole matte by half a source pixel against the image, which
      // shows up as a one-sided halo on the upsampled path.
      const mx = sameSize ? x : (x + 0.5) * sx - 0.5;
      const my = sameSize ? y : (y + 0.5) * sy - 0.5;
      const a = sameSize ? matte.alpha[p] : bilinearAlpha(matte.alpha, matte.width, matte.height, mx, my);
      const af = a / 255;

      if (opts.decontaminate && af > 0.02 && af < 0.98) {
        const packed = matte.bgOf[sameSize ? p : Math.min(matte.height - 1, Math.max(0, Math.round(my))) * matte.width
          + Math.min(matte.width - 1, Math.max(0, Math.round(mx)))];
        if (packed & 1) {
          const br = (packed >> 8) & 255, bgc = (packed >> 16) & 255, bb = (packed >> 24) & 255;
          d[i] = Math.min(255, Math.max(0, (d[i] - (1 - af) * br) / af));
          d[i + 1] = Math.min(255, Math.max(0, (d[i + 1] - (1 - af) * bgc) / af));
          d[i + 2] = Math.min(255, Math.max(0, (d[i + 2] - (1 - af) * bb) / af));
        }
      }
      d[i + 3] = Math.round(Math.min(d[i + 3], a));
    }
  }
}

/**
 * One-shot: analyse (downscaling first if the image is large) and apply.
 * Returns the matte so the caller can report how much was removed.
 */
export function removeBackgroundAdvanced(
  ctx: CanvasRenderingContext2D,
  w: number, h: number,
  opts: Partial<MattingOptions> = {},
  strokes?: Uint8Array,
): MatteResult | null {
  if (w < 4 || h < 4) return null;
  const o = { ...DEFAULT_MATTING, ...opts };
  let full: ImageData;
  try {
    full = ctx.getImageData(0, 0, w, h);
  } catch {
    // A cross-origin image taints the canvas and getImageData throws
    // SecurityError. Surfaceable message rather than an editor crash.
    throw new Error("This image is served from another domain, so it can't be edited here. Upload it to the media library first.");
  }

  const scale = Math.min(1, Math.sqrt(MAX_ANALYSIS_PX / (w * h)));
  let analysis = full;
  let strokeData = strokes;

  if (scale < 1) {
    const aw = Math.max(4, Math.round(w * scale)), ah = Math.max(4, Math.round(h * scale));
    const c = document.createElement("canvas");
    c.width = aw; c.height = ah;
    const x = c.getContext("2d", { willReadFrequently: true });
    if (!x) return null;
    x.imageSmoothingQuality = "high";
    x.drawImage(ctx.canvas, 0, 0, w, h, 0, 0, aw, ah);
    analysis = x.getImageData(0, 0, aw, ah);
    if (strokes) {
      // Max-pool over the source block, not point-sample. Strokes are
      // categorical so they cannot be interpolated, but point-sampling a 4x
      // reduction drops any correction narrower than 4 source pixels — the user
      // paints a fix, watches it do nothing, and concludes the brush is broken.
      // Pooling keeps a stroke alive if it touched the block at all; "erase"
      // wins ties over "keep" because removing too much is visible and
      // correctable, whereas keeping too much hides the very edge being fixed.
      const s = new Uint8Array(aw * ah);
      const bx = Math.ceil(1 / scale), by = Math.ceil(1 / scale);
      for (let y = 0; y < ah; y++) {
        const sy0 = Math.floor(y / scale);
        for (let xx = 0; xx < aw; xx++) {
          const sx0 = Math.floor(xx / scale);
          let v = 0;
          for (let dy = 0; dy < by && v !== 2; dy++) {
            const yy = sy0 + dy;
            if (yy >= h) break;
            for (let dx = 0; dx < bx; dx++) {
              const xxx = sx0 + dx;
              if (xxx >= w) break;
              const t = strokes[yy * w + xxx];
              if (t === 2) { v = 2; break; }
              if (t === 1) v = 1;
            }
          }
          s[y * aw + xx] = v;
        }
      }
      strokeData = s;
    }
  }

  const matte = computeMatte(analysis, o, strokeData);
  applyMatte(full, matte, o);
  ctx.putImageData(full, 0, 0);
  return matte;
}
