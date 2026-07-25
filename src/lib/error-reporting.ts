// Local client-side error reporting hook. Logs to the console; extend this to
// POST to your own monitoring endpoint if desired. No third-party dependencies.
export function reportError(error: unknown, context: Record<string, unknown> = {}) {
  if (typeof window === "undefined") return;
  const message =
    error instanceof Response
      ? `Response ${error.status}${error.url ? ` at ${error.url}` : ""}`
      : error instanceof Error
        ? error.message
        : String(error);
  console.error("[app-error]", message, { route: window.location.pathname, ...context });
}
