// Self-hosted, dependency-free Vite config (no Lovable, no Cloudflare).
// Produces a standalone Node server via nitro's `node-server` preset:
//   build  -> .output/server/index.mjs
//   run    -> node .output/server/index.mjs   (listens on $PORT, default 3000)
import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";

// Optional sub-path deploy (e.g. /client1). Set VITE_BASE_PATH=/client1 at build.
const BASE = process.env.VITE_BASE_PATH ? process.env.VITE_BASE_PATH.replace(/\/+$/, "") + "/" : "/";

export default defineConfig(({ command }) => ({
  base: BASE,
  css: { transformer: "lightningcss" },
  resolve: {
    alias: { "@": `${process.cwd()}/src` },
    dedupe: [
      "react",
      "react-dom",
      "react/jsx-runtime",
      "react/jsx-dev-runtime",
      "@tanstack/react-query",
      "@tanstack/query-core",
    ],
  },
  optimizeDeps: {
    include: ["react", "react-dom", "react-dom/client", "react/jsx-runtime", "react/jsx-dev-runtime"],
  },
  server: { host: "::", port: 8080 },
  plugins: [
    tailwindcss(),
    tsConfigPaths({ projects: ["./tsconfig.json"] }),
    tanstackStart({
      // Keep the server code out of the client bundle.
      importProtection: {
        behavior: "error",
        client: { files: ["**/server/**"], specifiers: ["server-only"] },
      },
      // Redirect the bundled server entry to src/server.ts (our SSR error wrapper).
      server: { entry: "server" },
    }),
    // nitro is a build-only plugin; target a long-lived Node server for the VPS.
    ...(command === "build" ? [nitro({ preset: "node-server" })] : []),
    viteReact(),
  ],
}));
