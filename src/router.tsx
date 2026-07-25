import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
    // Sub-path deploy support (baked in at build via VITE_BASE_PATH, e.g. /client1).
    basepath: import.meta.env.VITE_BASE_PATH || undefined,
  });

  return router;
};
