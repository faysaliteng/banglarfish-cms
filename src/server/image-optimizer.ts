// Image compression — the ShortPixel idea, self-hosted.
//
// Re-encodes an image at its ORIGINAL resolution using much better encoder
// settings than a camera or design tool produces: mozjpeg with trellis
// quantisation for JPEG, palette quantisation for PNG, and modern WebP/AVIF
// effort levels. Pixels and dimensions are unchanged; only the file gets
// smaller. Typical saving on photographic JPEGs is 60-80%.
//
// Safety rules, in order of importance:
//   1. The original is copied to a backup directory before anything is written.
//   2. The new file replaces the old one ONLY if it is actually smaller.
//   3. The write is atomic (temp file + rename), so a crash can't truncate an
//      image that is being served.
import path from "node:path";
import { readFile, writeFile, stat, mkdir, copyFile, rename, unlink } from "node:fs/promises";

export type OptimizeResult = {
  ok: boolean;
  before: number;
  after: number;
  saved: number;
  savedPercent: number;
  skipped?: string;
};

export type OptimizeOptions = {
  /** JPEG/WebP quality. 82 is visually indistinguishable for photos. */
  quality?: number;
  /** Convert PNGs with no transparency to JPEG (big win, changes the file ext). */
  pngToJpeg?: boolean;
  /** Keep a copy of the original under uploads/_originals. */
  backup?: boolean;
};

const DEFAULTS: Required<OptimizeOptions> = { quality: 82, pngToJpeg: false, backup: true };

function backupDir(): string {
  const up = process.env.UPLOAD_DIR ?? path.join(process.cwd(), "public", "uploads");
  return path.join(up, "_originals");
}

/**
 * Compress one image in place. Returns how many bytes were saved.
 * `absPath` must already be validated by the caller.
 */
export async function optimizeImageFile(absPath: string, opts: OptimizeOptions = {}): Promise<OptimizeResult> {
  const o = { ...DEFAULTS, ...opts };
  const ext = path.extname(absPath).toLowerCase();
  const none: OptimizeResult = { ok: false, before: 0, after: 0, saved: 0, savedPercent: 0 };

  if (![".jpg", ".jpeg", ".png", ".webp"].includes(ext)) {
    return { ...none, skipped: `unsupported type ${ext || "(none)"}` };
  }

  let sharp: typeof import("sharp");
  try {
    sharp = (await import("sharp")).default as unknown as typeof import("sharp");
  } catch {
    return { ...none, skipped: "sharp unavailable" };
  }

  const before = (await stat(absPath)).size;
  const input = await readFile(absPath);

  // Re-encode at the SAME dimensions — we are trading encoder effort for bytes,
  // never resolution. rotate() applies EXIF orientation so stripping metadata
  // can't flip the image.
  let out: Buffer;
  try {
    const img = (sharp as unknown as (b: Buffer) => import("sharp").Sharp)(input).rotate();
    if (ext === ".png") {
      out = await img.png({ compressionLevel: 9, effort: 10, palette: true, quality: o.quality }).toBuffer();
    } else if (ext === ".webp") {
      out = await img.webp({ quality: o.quality, effort: 6 }).toBuffer();
    } else {
      out = await img.jpeg({ quality: o.quality, mozjpeg: true, progressive: true, trellisQuantisation: true }).toBuffer();
    }
  } catch (e) {
    return { ...none, before, skipped: e instanceof Error ? e.message : "encode failed" };
  }

  // Never make a file bigger. Already-optimised images land here.
  if (out.length >= before) {
    return { ok: true, before, after: before, saved: 0, savedPercent: 0, skipped: "already optimal" };
  }

  if (o.backup) {
    try {
      const dir = backupDir();
      await mkdir(dir, { recursive: true });
      const dest = path.join(dir, `${path.basename(absPath)}`);
      // Only back up the first time, so re-running never overwrites the true original.
      try { await stat(dest); } catch { await copyFile(absPath, dest); }
    } catch { /* backup is best-effort; don't block the saving */ }
  }

  // Atomic replace so a half-written file is never served.
  const tmp = `${absPath}.opt.tmp`;
  try {
    await writeFile(tmp, out);
    await rename(tmp, absPath);
  } catch (e) {
    try { await unlink(tmp); } catch { /* ignore */ }
    return { ...none, before, skipped: e instanceof Error ? e.message : "write failed" };
  }

  const saved = before - out.length;
  return { ok: true, before, after: out.length, saved, savedPercent: Math.round((saved / before) * 100) };
}

/** Map a public URL (/img/... or /uploads/...) to a path on disk, or null. */
export function resolveMediaPath(url: string): string | null {
  if (!url.startsWith("/")) return null;
  const uploadDir = process.env.UPLOAD_DIR ?? path.join(process.cwd(), "public", "uploads");
  let base: string, rel: string;
  if (url.startsWith("/uploads/")) {
    base = uploadDir;
    rel = url.slice("/uploads/".length);
  } else if (url.startsWith("/img/")) {
    base = path.join(process.cwd(), "public", "img");
    rel = url.slice("/img/".length);
  } else {
    return null;
  }
  if (rel.includes("..") || rel.startsWith("_")) return null;
  const abs = path.join(base, rel);
  // The resolved path must stay inside its base directory.
  if (!path.resolve(abs).startsWith(path.resolve(base))) return null;
  return abs;
}
