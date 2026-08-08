// Authorization guards used inside server-function handlers.
import { getSessionUser, type SessionUser } from "./session";

export type { SessionUser };

// "support" sits off the privilege ladder (rank 0, like a customer for every
// staff+ guard) but is granted email-client access via requireMailAccess.
const RANK = { customer: 0, support: 0, staff: 1, manager: 2, admin: 3 } as const;
type Role = keyof typeof RANK;
const MAIL_ROLES = new Set<string>(["support", "staff", "manager", "admin"]);

export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw new Error("Unauthorized: please sign in");
  return user;
}

export async function requireRole(min: Role): Promise<SessionUser> {
  const user = await requireUser();
  if (RANK[user.role] < RANK[min]) throw new Error("Forbidden: insufficient permissions");
  return user;
}

export const requireStaff = () => requireRole("staff");
export const requireManager = () => requireRole("manager");
export const requireAdmin = () => requireRole("admin");

// Email-client access: support role plus all staff+. Used only by mail fns.
export async function requireMailAccess(): Promise<SessionUser> {
  const user = await requireUser();
  if (!MAIL_ROLES.has(user.role)) throw new Error("Forbidden: no email access");
  return user;
}

export function isStaff(user: SessionUser | null): boolean {
  return !!user && RANK[user.role] >= RANK.staff;
}
