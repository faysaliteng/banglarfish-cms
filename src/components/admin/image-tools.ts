// Canvas helpers for the image editor: background removal and markup drawing.
// Kept out of the component so the maths stays readable and testable.

/* ------------------------------------------------------------------ *
 * Background removal (no dependencies, instant)
 *
 * Aimed squarely at catalogue photography — a product on a white, grey or
 * otherwise uniform backdrop, which is what an e-commerce library is full of.
 * It flood-fills inward from the edges, so it only removes background that is
 * actually connected to the border; a white plate in the middle of the product
 * is left alone. Edges are then feathered so the cut-out doesn't look jagged.
 * ------------------------------------------------------------------ */

export type BgRemoveOptions = {
  /** 0-100. How different a pixel may be from the background and still count. */
  tolerance?: number;
  /** 0-10. Softens the alpha edge to avoid a hard, cut-with-scissors look. */
  feather?: number;
};

export function removeBackground(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  opts: BgRemoveOptions = {},
): void {
  const tolerance = Math.max(0, Math.min(100, opts.tolerance ?? 28));
  const feather = Math.max(0, Math.min(10, opts.feather ?? 2));
  if (w < 3 || h < 3) return;

  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;

  // 1. Background colour = average of the border pixels.
  let br = 0, bg = 0, bb = 0, n = 0;
  const sample = (x: number, y: number) => {
    const i = (y * w + x) * 4;
    br += d[i]; bg += d[i + 1]; bb += d[i + 2]; n++;
  };
  for (let x = 0; x < w; x++) { sample(x, 0); sample(x, h - 1); }
  for (let y = 0; y < h; y++) { sample(0, y); sample(w - 1, y); }
  br /= n; bg /= n; bb /= n;

  // Squared distance keeps the inner loop free of Math.sqrt.
  const maxDist = (tolerance / 100) * 441.673; // 441.673 = sqrt(3*255^2)
  const maxDistSq = maxDist * maxDist;
  const isBg = (i: number) => {
    const dr = d[i] - br, dg = d[i + 1] - bg, db = d[i + 2] - bb;
    return dr * dr + dg * dg + db * db <= maxDistSq;
  };

  // 2. Flood fill inward from every border pixel (iterative — a recursive fill
  //    blows the stack on a 1024x1024 image).
  const mask = new Uint8Array(w * h); // 1 = background
  const stack: number[] = [];
  const push = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= w || y >= h) return;
    const p = y * w + x;
    if (mask[p]) return;
    if (!isBg(p * 4)) return;
    mask[p] = 1;
    stack.push(p);
  };
  for (let x = 0; x < w; x++) { push(x, 0); push(x, h - 1); }
  for (let y = 0; y < h; y++) { push(0, y); push(w - 1, y); }
  while (stack.length) {
    const p = stack.pop() as number;
    const x = p % w, y = (p / w) | 0;
    push(x + 1, y); push(x - 1, y); push(x, y + 1); push(x, y - 1);
  }

  // 3. Feather: alpha becomes the fraction of non-background neighbours, so the
  //    boundary fades instead of stepping.
  if (feather > 0) {
    const r = Math.round(feather);
    const alpha = new Uint8ClampedArray(w * h);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const p = y * w + x;
        if (!mask[p]) { alpha[p] = 255; continue; }
        let keep = 0, total = 0;
        for (let dy = -r; dy <= r; dy++) {
          for (let dx = -r; dx <= r; dx++) {
            const nx = x + dx, ny = y + dy;
            if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
            total++;
            if (!mask[ny * w + nx]) keep++;
          }
        }
        alpha[p] = total ? Math.round((keep / total) * 255) : 0;
      }
    }
    for (let p = 0; p < w * h; p++) d[p * 4 + 3] = Math.min(d[p * 4 + 3], alpha[p]);
  } else {
    for (let p = 0; p < w * h; p++) if (mask[p]) d[p * 4 + 3] = 0;
  }

  ctx.putImageData(img, 0, 0);
}

/** Paint a solid colour behind a transparent cut-out (white product shots). */
export function fillTransparent(ctx: CanvasRenderingContext2D, w: number, h: number, color: string): void {
  ctx.save();
  ctx.globalCompositeOperation = "destination-over";
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

/* ------------------------------------------------------------------ *
 * Markup — annotations drawn over the image.
 * Coordinates are normalised 0-1 so they survive crop/resize.
 * ------------------------------------------------------------------ */

export type MarkupKind = "text" | "rect" | "ellipse" | "arrow" | "line" | "badge" | "blur";

export type Markup = {
  id: string;
  kind: MarkupKind;
  x: number; y: number;      // start (0-1)
  x2: number; y2: number;    // end (0-1)
  color: string;
  size: number;              // stroke width / font size, relative to image width
  text?: string;
  filled?: boolean;
};

/** Draw every markup onto a canvas at its natural pixel size. */
export function drawMarkups(ctx: CanvasRenderingContext2D, w: number, h: number, items: Markup[]): void {
  for (const m of items) {
    const x = m.x * w, y = m.y * h, x2 = m.x2 * w, y2 = m.y2 * h;
    const stroke = Math.max(1, (m.size / 100) * w * 0.02);
    ctx.save();
    ctx.strokeStyle = m.color;
    ctx.fillStyle = m.color;
    ctx.lineWidth = stroke;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    if (m.kind === "rect") {
      if (m.filled) ctx.fillRect(x, y, x2 - x, y2 - y);
      else ctx.strokeRect(x, y, x2 - x, y2 - y);
    } else if (m.kind === "ellipse") {
      ctx.beginPath();
      ctx.ellipse((x + x2) / 2, (y + y2) / 2, Math.abs(x2 - x) / 2, Math.abs(y2 - y) / 2, 0, 0, Math.PI * 2);
      m.filled ? ctx.fill() : ctx.stroke();
    } else if (m.kind === "line" || m.kind === "arrow") {
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x2, y2);
      ctx.stroke();
      if (m.kind === "arrow") {
        const a = Math.atan2(y2 - y, x2 - x);
        const head = stroke * 4;
        ctx.beginPath();
        ctx.moveTo(x2, y2);
        ctx.lineTo(x2 - head * Math.cos(a - Math.PI / 6), y2 - head * Math.sin(a - Math.PI / 6));
        ctx.lineTo(x2 - head * Math.cos(a + Math.PI / 6), y2 - head * Math.sin(a + Math.PI / 6));
        ctx.closePath();
        ctx.fill();
      }
    } else if (m.kind === "text") {
      const fs = Math.max(10, (m.size / 100) * w * 0.09);
      ctx.font = `700 ${fs}px system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif`;
      ctx.textBaseline = "top";
      ctx.fillText(m.text ?? "", x, y);
    } else if (m.kind === "badge") {
      // A pill — the "SALE" / "-20%" sticker an e-commerce photo usually wants.
      const fs = Math.max(12, (m.size / 100) * w * 0.06);
      ctx.font = `800 ${fs}px system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif`;
      const label = m.text ?? "SALE";
      const padX = fs * 0.7, padY = fs * 0.4;
      const tw = ctx.measureText(label).width;
      const bw = tw + padX * 2, bh = fs + padY * 2, r = bh / 2;
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + bw, y, x + bw, y + bh, r);
      ctx.arcTo(x + bw, y + bh, x, y + bh, r);
      ctx.arcTo(x, y + bh, x, y, r);
      ctx.arcTo(x, y, x + bw, y, r);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.textBaseline = "top";
      ctx.fillText(label, x + padX, y + padY);
    } else if (m.kind === "blur") {
      // Pixelate the region — for hiding a competitor's label or a price tag.
      const rx = Math.min(x, x2), ry = Math.min(y, y2);
      const rw = Math.abs(x2 - x), rh = Math.abs(y2 - y);
      if (rw >= 2 && rh >= 2) {
        const block = Math.max(3, Math.round((m.size / 100) * 40));
        const tmp = document.createElement("canvas");
        tmp.width = Math.max(1, Math.round(rw / block));
        tmp.height = Math.max(1, Math.round(rh / block));
        const tctx = tmp.getContext("2d");
        if (tctx) {
          tctx.imageSmoothingEnabled = true;
          tctx.drawImage(ctx.canvas, rx, ry, rw, rh, 0, 0, tmp.width, tmp.height);
          ctx.imageSmoothingEnabled = false;
          ctx.drawImage(tmp, 0, 0, tmp.width, tmp.height, rx, ry, rw, rh);
          ctx.imageSmoothingEnabled = true;
        }
      }
    }
    ctx.restore();
  }
}

/** Rough byte size of a data URL (base64 is 4/3 of the raw bytes). */
export function dataUrlBytes(dataUrl: string): number {
  const i = dataUrl.indexOf(",");
  if (i < 0) return 0;
  const b64 = dataUrl.length - i - 1;
  const pad = dataUrl.endsWith("==") ? 2 : dataUrl.endsWith("=") ? 1 : 0;
  return Math.max(0, Math.floor((b64 * 3) / 4) - pad);
}

export function prettyBytes(n: number): string {
  if (n >= 1048576) return `${(n / 1048576).toFixed(2)} MB`;
  if (n >= 1024) return `${Math.round(n / 1024)} KB`;
  return `${n} B`;
}
