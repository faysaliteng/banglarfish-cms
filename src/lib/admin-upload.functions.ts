import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// Accepts a data URL from the admin media uploader, writes it to disk, and
// registers it in the media library. Files are stored in $UPLOAD_DIR (default
// public/uploads in dev) and served at /uploads/<file> — map that path in nginx
// to a persistent directory in production.
export const adminUploadMedia = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) =>
    z.object({ filename: z.string().trim().min(1).max(200), dataUrl: z.string().min(10) }).parse(i),
  )
  .handler(async ({ data }): Promise<{ id: string; url: string; name: string; size: string }> => {
    const { requireStaff } = await import("@/server/auth/context");
    const { db } = await import("@/server/db");
    const { media } = await import("@/server/db/schema");
    const { writeFile, mkdir } = await import("node:fs/promises");
    const path = await import("node:path");
    const { randomBytes } = await import("node:crypto");
    await requireStaff();

    const match = /^data:([^;]+);base64,(.+)$/.exec(data.dataUrl);
    if (!match) throw new Error("Invalid file data");
    const buffer = Buffer.from(match[2], "base64");
    if (buffer.length > 8 * 1024 * 1024) throw new Error("File too large (max 8MB)");

    const safe = data.filename.replace(/[^a-zA-Z0-9._-]/g, "-").slice(-80);
    const finalName = `${randomBytes(6).toString("hex")}-${safe}`;
    const dir = process.env.UPLOAD_DIR ?? path.join(process.cwd(), "public", "uploads");
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, finalName), buffer);

    const url = `/uploads/${finalName}`;
    const sizeKb = `${Math.round(buffer.length / 1024)} KB`;
    const [row] = await db.insert(media).values({ name: data.filename, url, size: sizeKb }).returning({ id: media.id });
    return { id: row.id, url, name: data.filename, size: sizeKb };
  });
