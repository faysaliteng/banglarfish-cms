// Phone OTP issue/verify backed by the `otp_codes` table + Boomcast SMS.
import { createHash, randomInt } from "node:crypto";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/server/db";
import { otpCodes } from "@/server/db/schema";
import { sendSms } from "@/server/sms/boomcast";

type Purpose = "signup" | "login" | "reset" | "verify";
const TTL_MS = 5 * 60 * 1000;
const MAX_ATTEMPTS = 5;

function hashCode(phone: string, code: string): string {
  return createHash("sha256").update(`${phone}:${code}`).digest("hex");
}

export async function issueOtp(
  phone: string,
  purpose: Purpose,
  payload?: Record<string, unknown>,
): Promise<{ ok: boolean; error?: string; devCode?: string }> {
  const code = String(randomInt(100000, 1000000)); // always 6 digits
  const expiresAt = new Date(Date.now() + TTL_MS);
  await db.insert(otpCodes).values({ phone, purpose, payload, codeHash: hashCode(phone, code), expiresAt });

  const sms = await sendSms(
    phone,
    `Your Banglarfish verification code is ${code}. It expires in 5 minutes. Do not share it.`,
  );
  if (!sms.ok) return { ok: false, error: sms.error ?? "Could not send SMS" };

  // Surface the code to the client only in dev mode so testing works without SMS credits.
  return { ok: true, devCode: process.env.SMS_DEV_MODE === "true" ? code : undefined };
}

export async function verifyOtp(
  phone: string,
  code: string,
  purpose: Purpose,
): Promise<{ ok: boolean; error?: string; payload?: Record<string, unknown> | null }> {
  const [rec] = await db
    .select()
    .from(otpCodes)
    .where(and(eq(otpCodes.phone, phone), eq(otpCodes.purpose, purpose), eq(otpCodes.consumed, false)))
    .orderBy(desc(otpCodes.createdAt))
    .limit(1);

  if (!rec) return { ok: false, error: "No code requested. Please request a new code." };
  if (rec.expiresAt.getTime() < Date.now()) return { ok: false, error: "Code expired. Request a new one." };
  if (rec.attempts >= MAX_ATTEMPTS) return { ok: false, error: "Too many attempts. Request a new code." };

  if (rec.codeHash !== hashCode(phone, code)) {
    await db.update(otpCodes).set({ attempts: rec.attempts + 1 }).where(eq(otpCodes.id, rec.id));
    return { ok: false, error: "Invalid code" };
  }
  await db.update(otpCodes).set({ consumed: true }).where(eq(otpCodes.id, rec.id));
  return { ok: true, payload: rec.payload };
}
