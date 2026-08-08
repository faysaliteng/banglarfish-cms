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
    await requireStaff();
    const { storeUpload } = await import("@/server/uploads");
    return storeUpload(data);
  });
