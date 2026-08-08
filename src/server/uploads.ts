// Shared upload core (auth-agnostic): validate a data URL, magic-byte sniff,
// dedup by content hash, write to $UPLOAD_DIR, register in the media library.
// Callers perform their own authorization before invoking this.
import { db } from "./db";
import { media } from "./db/schema";

export type StoredUpload = { id: string; url: string; name: string; size: string };

export async function storeUpload(data: { filename: string; dataUrl: string }): Promise<StoredUpload> {
  const { writeFile, mkdir } = await import("node:fs/promises");
  const path = await import("node:path");
  const { randomBytes, createHash } = await import("node:crypto");
  const { eq } = await import("drizzle-orm");

  const match = /^data:([^;]+);base64,(.+)$/.exec(data.dataUrl);
  if (!match) throw new Error("Invalid file data");
  const declaredMime = match[1].toLowerCase();
  const buffer = Buffer.from(match[2], "base64");
  if (buffer.length > 8 * 1024 * 1024) throw new Error("File too large (max 8MB)");

  const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif", "image/svg+xml", "application/pdf"];
  if (!ALLOWED.includes(declaredMime)) throw new Error("Unsupported file type. Allowed: JPEG, PNG, WebP, GIF, AVIF, SVG, PDF.");
  const sniff = (): string => {
    const b = buffer;
    if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
    if (b.length >= 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return "image/png";
    if (b.length >= 12 && b.toString("ascii", 0, 4) === "RIFF" && b.toString("ascii", 8, 12) === "WEBP") return "image/webp";
    if (b.length >= 6 && (b.toString("ascii", 0, 6) === "GIF87a" || b.toString("ascii", 0, 6) === "GIF89a")) return "image/gif";
    if (b.length >= 12 && b.toString("ascii", 4, 8) === "ftyp" && b.toString("ascii", 8, 12).startsWith("avif")) return "image/avif";
    if (b.length >= 5 && b.toString("ascii", 0, 5) === "%PDF-") return "application/pdf";
    const head = b.toString("utf8", 0, Math.min(b.length, 512)).trim().toLowerCase();
    if (head.startsWith("<?xml") || head.startsWith("<svg")) return "image/svg+xml";
    return "";
  };
  const detected = sniff();
  if (!detected || !ALLOWED.includes(detected)) throw new Error("File content does not match an allowed image/PDF type.");
  if (detected !== declaredMime && !(declaredMime === "image/svg+xml" && detected === "image/svg+xml")) {
    throw new Error("File content does not match its declared type.");
  }

  const hash = createHash("sha256").update(buffer).digest("hex");
  const [dupe] = await db.select().from(media).where(eq(media.hash, hash)).limit(1);
  if (dupe) return { id: dupe.id, url: dupe.url, name: dupe.name, size: dupe.size };

  // The stored extension MUST come from the sniffed content type, never from the
  // user-supplied filename: a PNG/HTML polyglot saved as ".html" would be served
  // from our own origin as HTML (stored XSS).
  const EXT_FOR: Record<string, string> = {
    "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp",
    "image/gif": "gif", "image/avif": "avif", "image/svg+xml": "svg", "application/pdf": "pdf",
  };
  const ext = EXT_FOR[detected] ?? "bin";
  const base = data.filename.replace(/\.[^.]*$/, "").replace(/[^a-zA-Z0-9_-]/g, "-").slice(-60) || "file";
  const finalName = `${randomBytes(6).toString("hex")}-${base}.${ext}`;
  const dir = process.env.UPLOAD_DIR ?? path.join(process.cwd(), "public", "uploads");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, finalName), buffer);

  let width: number | null = null, height: number | null = null, lqip = "";
  const isRaster = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"].includes(declaredMime);
  if (isRaster) {
    try {
      const sharp = (await import("sharp")).default;
      const meta = await sharp(buffer).metadata();
      width = meta.width ?? null;
      height = meta.height ?? null;
      const tiny = await sharp(buffer).resize(24, 24, { fit: "inside" }).webp({ quality: 40 }).toBuffer();
      lqip = `data:image/webp;base64,${tiny.toString("base64")}`;
    } catch { /* sharp unavailable / non-decodable */ }
  }

  const url = `/uploads/${finalName}`;
  const sizeKb = `${Math.round(buffer.length / 1024)} KB`;
  const [row] = await db.insert(media).values({ name: data.filename, url, size: sizeKb, width, height, hash, lqip }).returning({ id: media.id });
  return { id: row.id, url, name: data.filename, size: sizeKb };
}
