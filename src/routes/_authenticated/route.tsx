import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { me } from "@/lib/auth.functions";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const user = await me();
    if (!user) throw redirect({ to: "/auth", search: { next: location.href } });
    return { user };
  },
  component: () => <Outlet />,
});
