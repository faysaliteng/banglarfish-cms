import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { me, logout, type MeUser } from "./auth.functions";

export type { MeUser };
export type Profile = {
  id: string;
  full_name: string;
  phone: string;
  address_line1: string;
  address_line2: string | null;
  city: string;
  district: string | null;
  postal_code: string | null;
};

const STAFF_ROLES = new Set(["staff", "manager", "admin"]);

/** Current authenticated user (or null). Cached via react-query under ["me"]. */
export function useSession() {
  const meFn = useServerFn(me);
  const q = useQuery({
    queryKey: ["me"],
    queryFn: () => meFn(),
    staleTime: 30_000,
    retry: false,
  });
  return { user: q.data ?? null, loading: q.isLoading };
}

/** Staff/manager/admin may access the admin panel. Derived from the user's role. */
export function useIsAdmin(user: MeUser | null) {
  const isAdmin = !!user && STAFF_ROLES.has(user.role);
  return { isAdmin, checked: true };
}

export function useSignOut() {
  const logoutFn = useServerFn(logout);
  const qc = useQueryClient();
  return async () => {
    try {
      await logoutFn();
    } finally {
      qc.setQueryData(["me"], null);
      await qc.invalidateQueries();
    }
  };
}
