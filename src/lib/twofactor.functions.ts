import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type TwoFactorStatus = { enabled: boolean };
export type TwoFactorSetup = { secret: string; otpauthUrl: string };

export const get2FAStatus = createServerFn({ method: "GET" }).handler(async (): Promise<TwoFactorStatus> => {
  const { requireUser } = await import("@/server/auth/context");
  const { db } = await import("@/server/db");
  const { users } = await import("@/server/db/schema");
  const { eq } = await import("drizzle-orm");
  const user = await requireUser();
  const [u] = await db.select({ e: users.totpEnabled }).from(users).where(eq(users.id, user.id)).limit(1);
  return { enabled: !!u?.e };
});

// Step 1: generate a secret and store it (not yet enabled). Returns the secret +
// otpauth URL for the authenticator app.
export const begin2FASetup = createServerFn({ method: "POST" }).handler(async (): Promise<TwoFactorSetup> => {
  const { requireUser } = await import("@/server/auth/context");
  const { db } = await import("@/server/db");
  const { users } = await import("@/server/db/schema");
  const { eq } = await import("drizzle-orm");
  const { generateTotpSecret, otpauthUrl } = await import("@/server/auth/totp");
  const { getBrandingConfig } = await import("@/server/site-config");
  const user = await requireUser();
  const secret = generateTotpSecret();
  await db.update(users).set({ totpSecret: secret, totpEnabled: false, updatedAt: new Date() }).where(eq(users.id, user.id));
  let issuer = "Banglarfish";
  try { const b = await getBrandingConfig(); if (b?.storeName) issuer = b.storeName; } catch { /* default */ }
  return { secret, otpauthUrl: otpauthUrl(secret, user.email, issuer) };
});

// Step 2: verify the first code, enable 2FA, and return one-time recovery codes.
export const confirm2FASetup = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => z.object({ code: z.string().min(6).max(10) }).parse(i))
  .handler(async ({ data }): Promise<{ recoveryCodes: string[] }> => {
    const { requireUser } = await import("@/server/auth/context");
    const { db } = await import("@/server/db");
    const { users } = await import("@/server/db/schema");
    const { eq } = await import("drizzle-orm");
    const { verifyTotp, generateRecoveryCodes } = await import("@/server/auth/totp");
    const { audit } = await import("@/server/audit");
    const user = await requireUser();
    const [u] = await db.select({ secret: users.totpSecret }).from(users).where(eq(users.id, user.id)).limit(1);
    if (!u?.secret) throw new Error("Start 2FA setup first.");
    if (!verifyTotp(u.secret, data.code)) throw new Error("That code is incorrect. Check your authenticator app and try again.");
    const { plain, hashed } = generateRecoveryCodes(10);
    await db.update(users).set({ totpEnabled: true, totpRecovery: hashed, updatedAt: new Date() }).where(eq(users.id, user.id));
    await audit(user, "2fa.enable", "user", user.id);
    return { recoveryCodes: plain };
  });

// Disable 2FA — requires a valid current code (TOTP or an unused recovery code).
export const disable2FA = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => z.object({ code: z.string().min(6).max(20) }).parse(i))
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const { requireUser } = await import("@/server/auth/context");
    const { db } = await import("@/server/db");
    const { users } = await import("@/server/db/schema");
    const { eq } = await import("drizzle-orm");
    const { verifyTotp, hashRecovery } = await import("@/server/auth/totp");
    const { audit } = await import("@/server/audit");
    const user = await requireUser();
    const [u] = await db.select({ secret: users.totpSecret, enabled: users.totpEnabled, recovery: users.totpRecovery }).from(users).where(eq(users.id, user.id)).limit(1);
    if (!u?.enabled || !u.secret) throw new Error("2FA is not enabled.");
    const okTotp = verifyTotp(u.secret, data.code);
    const okRecovery = (u.recovery ?? []).includes(hashRecovery(data.code));
    if (!okTotp && !okRecovery) throw new Error("Invalid authentication code.");
    await db.update(users).set({ totpEnabled: false, totpSecret: null, totpRecovery: null, updatedAt: new Date() }).where(eq(users.id, user.id));
    await audit(user, "2fa.disable", "user", user.id);
    return { ok: true };
  });
