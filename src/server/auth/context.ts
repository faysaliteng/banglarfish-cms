// Authorization guards used inside server-function handlers.
import { getSessionUser, type SessionUser } from "./session";

export type { SessionUser };

const RANK = { customer: 0, staff: 1, manager: 2, admin: 3 } as const;
type Role = keyof typeof RANK;

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

export function isStaff(user: SessionUser | null): boolean {
  return !!user && RANK[user.role] >= RANK.staff;
}
