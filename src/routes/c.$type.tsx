import { createFileRoute, Outlet } from "@tanstack/react-router";

// Layout for the /c/{type} segment; list lives in c.$type.index, entry in c.$type.$slug.
export const Route = createFileRoute("/c/$type")({ component: () => <Outlet /> });
