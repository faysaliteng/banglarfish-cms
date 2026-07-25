import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const bdPhone = z.string().trim().regex(/^(\+?88)?01[3-9]\d{8}$/, "Enter a valid BD phone (e.g. 017XXXXXXXX)");

// Signup is intentionally lightweight — just identity + credentials. Delivery
// address is collected later (at checkout, which prefills from the profile).
const SignupBase = z.object({
  email: z.string().trim().email("Invalid email").max(255),
  password: z.string().min(8, "At least 8 characters").max(72),
  full_name: z.string().trim().min(2, "Enter your full name").max(100),
});
// Phone path → verify by SMS OTP. Email-only path → phone optional (added later).
const SignupOtpSchema = SignupBase.extend({ phone: bdPhone });
const SignupEmailSchema = SignupBase.extend({ phone: z.union([bdPhone, z.literal("")]).optional() });

export type MeUser = {
  id: string;
  email: string;
  full_name: string;
  phone: string;
  role: "customer" | "staff" | "manager" | "admin";
  phone_verified: boolean;
};

/* ---- Current user ---- */
export const me = createServerFn({ method: "GET" }).handler(async (): Promise<MeUser | null> => {
  const { getSessionUser } = await import("@/server/auth/session");
  const u = await getSessionUser();
  if (!u) return null;
  return { id: u.id, email: u.email, full_name: u.fullName, phone: u.phone, role: u.role, phone_verified: u.phoneVerified };
});

/* ---- Signup (instant) with email — phone optional, no SMS step ---- */
export const signupEmail = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => SignupEmailSchema.parse(i))
  .handler(async ({ data }): Promise<MeUser> => {
    const { db } = await import("@/server/db");
    const { users } = await import("@/server/db/schema");
    const { hashPassword } = await import("@/server/auth/password");
    const { createSession } = await import("@/server/auth/session");
    const { eq } = await import("drizzle-orm");

    const email = data.email.toLowerCase();
    const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
    if (existing.length) throw new Error("An account with this email already exists. Please sign in.");

    const passwordHash = await hashPassword(data.password);
    const [u] = await db
      .insert(users)
      .values({ email, phone: data.phone || "", passwordHash, fullName: data.full_name, role: "customer", phoneVerified: false })
      .returning();

    await createSession(u.id);
    return { id: u.id, email: u.email, full_name: u.fullName, phone: u.phone, role: u.role, phone_verified: u.phoneVerified };
  });

/* ---- Signup: step 1, send OTP (used when the user wants to verify a phone) ---- */
export const requestSignupOtp = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => SignupOtpSchema.parse(i))
  .handler(async ({ data }): Promise<{ ok: boolean; devCode?: string }> => {
    const { db } = await import("@/server/db");
    const { users } = await import("@/server/db/schema");
    const { hashPassword } = await import("@/server/auth/password");
    const { issueOtp } = await import("@/server/auth/otp");
    const { eq } = await import("drizzle-orm");

    const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, data.email.toLowerCase())).limit(1);
    if (existing.length) throw new Error("An account with this email already exists. Please sign in.");

    const passwordHash = await hashPassword(data.password);
    const res = await issueOtp(data.phone, "signup", {
      email: data.email.toLowerCase(),
      passwordHash,
      full_name: data.full_name,
      phone: data.phone,
    });
    if (!res.ok) throw new Error(res.error ?? "Could not send verification code");
    return { ok: true, devCode: res.devCode };
  });

/* ---- Signup: step 2, verify OTP + create account (phone-verified) ---- */
export const verifySignupOtp = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => z.object({ phone: bdPhone, code: z.string().trim().length(6) }).parse(i))
  .handler(async ({ data }): Promise<MeUser> => {
    const { db } = await import("@/server/db");
    const { users } = await import("@/server/db/schema");
    const { verifyOtp } = await import("@/server/auth/otp");
    const { createSession } = await import("@/server/auth/session");
    const { eq } = await import("drizzle-orm");

    const v = await verifyOtp(data.phone, data.code, "signup");
    if (!v.ok || !v.payload) throw new Error(v.error ?? "Verification failed");
    const p = v.payload as Record<string, string>;

    const dupe = await db.select({ id: users.id }).from(users).where(eq(users.email, p.email)).limit(1);
    if (dupe.length) throw new Error("Account already exists. Please sign in.");

    const [u] = await db
      .insert(users)
      .values({
        email: p.email,
        phone: p.phone,
        passwordHash: p.passwordHash,
        fullName: p.full_name,
        role: "customer",
        phoneVerified: true,
      })
      .returning();

    await createSession(u.id);
    return { id: u.id, email: u.email, full_name: u.fullName, phone: u.phone, role: u.role, phone_verified: true };
  });

/* ---- Verify phone later (for a signed-in user) ---- */
export const requestPhoneVerify = createServerFn({ method: "POST" }).handler(async (): Promise<{ ok: boolean; devCode?: string }> => {
  const { requireUser } = await import("@/server/auth/context");
  const { issueOtp } = await import("@/server/auth/otp");
  const user = await requireUser();
  if (!user.phone) throw new Error("Add a phone number to your profile first.");
  if (user.phoneVerified) return { ok: true };
  const res = await issueOtp(user.phone, "verify");
  if (!res.ok) throw new Error(res.error ?? "Could not send verification code");
  return { ok: true, devCode: res.devCode };
});

export const confirmPhoneVerify = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => z.object({ code: z.string().trim().length(6) }).parse(i))
  .handler(async ({ data }): Promise<MeUser> => {
    const { requireUser } = await import("@/server/auth/context");
    const { db } = await import("@/server/db");
    const { users } = await import("@/server/db/schema");
    const { verifyOtp } = await import("@/server/auth/otp");
    const { eq } = await import("drizzle-orm");
    const user = await requireUser();
    const v = await verifyOtp(user.phone, data.code, "verify");
    if (!v.ok) throw new Error(v.error ?? "Verification failed");
    await db.update(users).set({ phoneVerified: true, updatedAt: new Date() }).where(eq(users.id, user.id));
    return { id: user.id, email: user.email, full_name: user.fullName, phone: user.phone, role: user.role, phone_verified: true };
  });

/* ---- Login ---- */
export const login = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => z.object({ email: z.string().trim().email().max(255), password: z.string().min(1).max(72) }).parse(i))
  .handler(async ({ data }): Promise<MeUser> => {
    const { db } = await import("@/server/db");
    const { users } = await import("@/server/db/schema");
    const { verifyPassword } = await import("@/server/auth/password");
    const { createSession } = await import("@/server/auth/session");
    const { eq } = await import("drizzle-orm");

    const [u] = await db.select().from(users).where(eq(users.email, data.email.toLowerCase())).limit(1);
    if (!u || !(await verifyPassword(data.password, u.passwordHash))) throw new Error("Invalid email or password");
    if (u.status === "blocked") throw new Error("This account has been blocked. Contact support.");

    await createSession(u.id);
    return { id: u.id, email: u.email, full_name: u.fullName, phone: u.phone, role: u.role, phone_verified: u.phoneVerified };
  });

/* ---- Logout ---- */
export const logout = createServerFn({ method: "POST" }).handler(async (): Promise<{ ok: true }> => {
  const { destroySession } = await import("@/server/auth/session");
  await destroySession();
  return { ok: true };
});

/* ---- Password reset via phone OTP ---- */
export const requestPasswordReset = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => z.object({ phone: bdPhone }).parse(i))
  .handler(async ({ data }): Promise<{ ok: boolean; devCode?: string }> => {
    const { db } = await import("@/server/db");
    const { users } = await import("@/server/db/schema");
    const { issueOtp } = await import("@/server/auth/otp");
    const { eq } = await import("drizzle-orm");

    const [u] = await db.select({ id: users.id }).from(users).where(eq(users.phone, data.phone)).limit(1);
    // Always respond ok (no account enumeration); only actually send if the phone exists.
    if (!u) return { ok: true };
    const res = await issueOtp(data.phone, "reset");
    return { ok: true, devCode: res.devCode };
  });

export const resetPassword = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) =>
    z.object({ phone: bdPhone, code: z.string().trim().length(6), password: z.string().min(8).max(72) }).parse(i),
  )
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const { db } = await import("@/server/db");
    const { users } = await import("@/server/db/schema");
    const { verifyOtp } = await import("@/server/auth/otp");
    const { hashPassword } = await import("@/server/auth/password");
    const { eq } = await import("drizzle-orm");

    const v = await verifyOtp(data.phone, data.code, "reset");
    if (!v.ok) throw new Error(v.error ?? "Verification failed");
    const passwordHash = await hashPassword(data.password);
    await db.update(users).set({ passwordHash, phoneVerified: true, updatedAt: new Date() }).where(eq(users.phone, data.phone));
    return { ok: true };
  });
