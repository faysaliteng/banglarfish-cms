import { createFileRoute, Outlet } from "@tanstack/react-router";

// Layout route for the /blog segment. The list lives in blog.index.tsx and the
// article in blog.$slug.tsx; this parent just renders the active child.
export const Route = createFileRoute("/blog")({
  component: () => <Outlet />,
});
