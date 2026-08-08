import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { unsubscribeNewsletter } from "@/lib/catalog.functions";
import { SiteLayout } from "@/components/site/SiteLayout";
import { z } from "zod";

// One-click unsubscribe target for newsletter emails (signed link, no login).
export const Route = createFileRoute("/unsubscribe")({
  validateSearch: (s: Record<string, unknown>) =>
    z.object({ email: z.string().optional(), token: z.string().optional() }).parse(s),
  head: () => ({ meta: [{ title: "Unsubscribe" }, { name: "robots", content: "noindex" }] }),
  component: UnsubscribePage,
});

function UnsubscribePage() {
  const { email = "", token = "" } = Route.useSearch();
  const run = useServerFn(unsubscribeNewsletter);
  const [state, setState] = useState<"working" | "done" | "failed">("working");

  useEffect(() => {
    if (!email || !token) { setState("failed"); return; }
    run({ data: { email, token } })
      .then((r) => setState(r.ok ? "done" : "failed"))
      .catch(() => setState("failed"));
  }, [email, token, run]);

  return (
    <SiteLayout>
      <div className="container-x py-20 max-w-lg text-center">
        {state === "working" && <p className="text-muted-foreground">Unsubscribing…</p>}
        {state === "done" && (
          <>
            <h1 className="text-2xl font-bold mb-2">You're unsubscribed</h1>
            <p className="text-muted-foreground">{email} has been removed from our newsletter. You'll still receive emails about orders you place.</p>
          </>
        )}
        {state === "failed" && (
          <>
            <h1 className="text-2xl font-bold mb-2">Link not valid</h1>
            <p className="text-muted-foreground">This unsubscribe link is invalid or has already been used. Contact us and we'll remove you manually.</p>
          </>
        )}
      </div>
    </SiteLayout>
  );
}
