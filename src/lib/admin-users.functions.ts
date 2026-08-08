import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type AdminUserRow = {
  id: string;
  email: string;
  full_name: string;
  phone: string;
  address_line1: string;
  address_line2: string | null;
  city: string;
  district: string | null;
  postal_code: string | null;
  created_at: string;
  roles: string[];
  status: string;
  customer_group: string;
  orders: number;
  spent: number;
};

export const listAllUsers = createServerFn({ method: "GET" }).handler(async (): Promise<AdminUserRow[]> => {
  const { requireStaff } = await import("@/server/auth/context");
  const { db } = await import("@/server/db");
  const { users, addresses, orders } = await import("@/server/db/schema");
  const { desc, eq, and } = await import("drizzle-orm");
  await requireStaff();

  const userRows = await db.select().from(users).orderBy(desc(users.createdAt));
  const addrRows = await db.select().from(addresses).where(eq(addresses.isDefault, true));
  const addrByUser = new Map(addrRows.map((a) => [a.userId, a]));
  const orderRows = await db.select({ userId: orders.userId, total: orders.total }).from(orders);
  const spendByUser = new Map<string, { orders: number; spent: number }>();
  for (const o of orderRows) {
    if (!o.userId) continue;
    const cur = spendByUser.get(o.userId) ?? { orders: 0, spent: 0 };
    cur.orders += 1;
    cur.spent += o.total;
    spendByUser.set(o.userId, cur);
  }
  void and;
  return userRows.map((u) => {
    const a = addrByUser.get(u.id);
    const s = spendByUser.get(u.id) ?? { orders: 0, spent: 0 };
    return {
      id: u.id,
      email: u.email,
      full_name: u.fullName,
      phone: u.phone,
      address_line1: a?.addressLine1 ?? "",
      address_line2: a?.addressLine2 ?? null,
      city: a?.city ?? "",
      district: a?.district ?? null,
      postal_code: a?.postalCode ?? null,
      created_at: u.createdAt.toISOString(),
      roles: [u.role],
      status: u.status,
      customer_group: (u as { customerGroup?: string }).customerGroup ?? "",
      orders: s.orders,
      spent: s.spent,
    };
  });
});

const roleEnum = z.enum(["customer", "support", "staff", "manager", "admin"]);

const CreateUser = z.object({
  email: z.string().trim().email().max(255),
  password: z.string().min(8).max(72),
  full_name: z.string().trim().min(2).max(100),
  phone: z.string().trim().min(10).max(20),
  address_line1: z.string().trim().min(3).max(200),
  city: z.string().trim().min(2).max(80),
  district: z.string().trim().max(80).optional().nullable(),
  postal_code: z.string().trim().max(20).optional().nullable(),
  role: roleEnum,
});

export const adminCreateUser = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => CreateUser.parse(i))
  .handler(async ({ data }): Promise<{ ok: true; id: string }> => {
    const { requireManager } = await import("@/server/auth/context");
    const { db } = await import("@/server/db");
    const { users, addresses } = await import("@/server/db/schema");
    const { hashPassword } = await import("@/server/auth/password");
    const { audit } = await import("@/server/audit");
    const { eq } = await import("drizzle-orm");
    const actor = await requireManager();

    const dupe = await db.select({ id: users.id }).from(users).where(eq(users.email, data.email.toLowerCase())).limit(1);
    if (dupe.length) throw new Error("A user with this email already exists.");

    const [u] = await db
      .insert(users)
      .values({ email: data.email.toLowerCase(), phone: data.phone, passwordHash: await hashPassword(data.password), fullName: data.full_name, role: data.role, phoneVerified: true, emailVerified: true })
      .returning({ id: users.id });
    await db.insert(addresses).values({ userId: u.id, label: "Home", fullName: data.full_name, phone: data.phone, addressLine1: data.address_line1, city: data.city, district: data.district ?? null, postalCode: data.postal_code ?? null, isDefault: true });
    await audit(actor, "user.create", "user", u.id, { email: data.email, role: data.role });
    return { ok: true, id: u.id };
  });

const UpdateUser = z.object({
  id: z.string().uuid(),
  email: z.string().trim().email().max(255).optional(),
  password: z.string().min(8).max(72).optional().or(z.literal("")),
  full_name: z.string().trim().min(2).max(100).optional(),
  phone: z.string().trim().min(10).max(20).optional(),
  address_line1: z.string().trim().min(3).max(200).optional(),
  address_line2: z.string().trim().max(200).optional().nullable(),
  city: z.string().trim().min(2).max(80).optional(),
  district: z.string().trim().max(80).optional().nullable(),
  postal_code: z.string().trim().max(20).optional().nullable(),
  role: roleEnum.optional(),
  customer_group: z.string().max(60).optional(),
});

export const adminUpdateUser = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => UpdateUser.parse(i))
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const { requireManager } = await import("@/server/auth/context");
    const { db } = await import("@/server/db");
    const { users, addresses } = await import("@/server/db/schema");
    const { hashPassword } = await import("@/server/auth/password");
    const { audit } = await import("@/server/audit");
    const { and, eq } = await import("drizzle-orm");
    const actor = await requireManager();

    const userPatch: Record<string, unknown> = { updatedAt: new Date() };
    if (data.email) userPatch.email = data.email.toLowerCase();
    if (data.full_name) userPatch.fullName = data.full_name;
    if (data.phone) userPatch.phone = data.phone;
    if (data.role) userPatch.role = data.role;
    if (data.customer_group !== undefined) userPatch.customerGroup = data.customer_group;
    if (data.password && data.password.length >= 8) userPatch.passwordHash = await hashPassword(data.password);
    await db.update(users).set(userPatch).where(eq(users.id, data.id));

    const addrPatch: Record<string, unknown> = {};
    if (data.full_name) addrPatch.fullName = data.full_name;
    if (data.phone) addrPatch.phone = data.phone;
    if (data.address_line1 !== undefined) addrPatch.addressLine1 = data.address_line1;
    if (data.address_line2 !== undefined) addrPatch.addressLine2 = data.address_line2 ?? null;
    if (data.city !== undefined) addrPatch.city = data.city;
    if (data.district !== undefined) addrPatch.district = data.district ?? null;
    if (data.postal_code !== undefined) addrPatch.postalCode = data.postal_code ?? null;
    if (Object.keys(addrPatch).length) {
      const [existing] = await db.select().from(addresses).where(and(eq(addresses.userId, data.id), eq(addresses.isDefault, true))).limit(1);
      if (existing) await db.update(addresses).set(addrPatch).where(eq(addresses.id, existing.id));
      else await db.insert(addresses).values({ userId: data.id, label: "Home", isDefault: true, addressLine1: "", city: "", ...addrPatch });
    }
    await audit(actor, "user.update", "user", data.id);
    return { ok: true };
  });

export const adminSetUserStatus = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid(), status: z.enum(["active", "blocked"]) }).parse(i))
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const { requireManager } = await import("@/server/auth/context");
    const { db } = await import("@/server/db");
    const { users } = await import("@/server/db/schema");
    const { audit } = await import("@/server/audit");
    const { eq } = await import("drizzle-orm");
    const actor = await requireManager();
    if (data.id === actor.id) throw new Error("You cannot block your own account.");
    await db.update(users).set({ status: data.status, updatedAt: new Date() }).where(eq(users.id, data.id));
    await audit(actor, "user.status", "user", data.id, { status: data.status });
    return { ok: true };
  });

export const adminDeleteUser = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const { requireManager } = await import("@/server/auth/context");
    const { db } = await import("@/server/db");
    const { users } = await import("@/server/db/schema");
    const { audit } = await import("@/server/audit");
    const { eq } = await import("drizzle-orm");
    const actor = await requireManager();
    if (data.id === actor.id) throw new Error("You cannot delete your own account.");
    await db.delete(users).where(eq(users.id, data.id));
    await audit(actor, "user.delete", "user", data.id);
    return { ok: true };
  });
