import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { Check } from "lucide-react";
import { getPreferences, savePreferences } from "@/lib/newsletter.functions";
import { SiteLayout } from "@/components/site/SiteLayout";

/**
 * Preference centre, reached from the signed link in every newsletter.
 *
 * Exists so that "too many emails" has an answer other than leaving. Every
 * marketing email links here next to the unsubscribe link.
 */
export const Route = createFileRoute("/preferences")({
  validateSearch: (s: Record<string, unknown>) =>
    z.object({ email: z.string().optional(), token: z.string().optional() }).parse(s),
  head: () => ({ meta: [{ title: "Email preferences" }, { name: "robots", content: "noindex" }] }),
  component: PreferencesPage,
});

type Topics = { products: boolean; blog: boolean; recipes: boolean; offers: boolean; digest: boolean };

const ROWS: { key: keyof Topics; label: string; hint: string }[] = [
  { key: "digest", label: "Weekly list", hint: "Once a week — everything we have in, with prices." },
  { key: "products", label: "New items", hint: "When something new arrives in the shop." },
  { key: "offers", label: "Offers & price drops", hint: "Discount codes and when a price comes down." },
  { key: "recipes", label: "Recipes", hint: "New recipes — what to cook with what you bought." },
  { key: "blog", label: "Blog posts", hint: "Sourcing notes, seasons, how we work." },
];

function PreferencesPage() {
  const { email = "", token = "" } = Route.useSearch();
  const load = useServerFn(getPreferences);
  const save = useServerFn(savePreferences);

  const [state, setState] = useState<"loading" | "ready" | "invalid">("loading");
  const [topics, setTopics] = useState<Topics>({ products: true, blog: true, recipes: true, offers: true, digest: true });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!email || !token) { setState("invalid"); return; }
    load({ data: { email, token } })
      .then((r) => {
        if (!r.ok || !r.topics) { setState("invalid"); return; }
        setTopics(r.topics);
        setState("ready");
      })
      .catch(() => setState("invalid"));
  }, [email, token, load]);

  async function commit(next: Topics) {
    setTopics(next);
    setSaving(true);
    setSaved(false);
    try {
      await save({ data: { email, token, topics: next } });
      setSaved(true);
    } catch { /* the toggle stays where the user put it; they can retry */ }
    finally { setSaving(false); }
  }

  const none = !Object.values(topics).some(Boolean);

  return (
    <SiteLayout>
      <div className="container-x py-16 max-w-lg">
        {state === "loading" && <p className="text-muted-foreground text-sm">Loading your preferences…</p>}

        {state === "invalid" && (
          <>
            <h1 className="text-2xl font-bold mb-2">Link not valid</h1>
            <p className="text-muted-foreground text-sm">
              This preferences link has expired or is not complete. Open the link from the bottom of any
              email we sent you, or write to support@banglarfish.com and we'll sort it out.
            </p>
          </>
        )}

        {state === "ready" && (
          <>
            <h1 className="text-2xl font-bold mb-1">Email preferences</h1>
            <p className="text-sm text-muted-foreground mb-6">
              Choose what we send to <strong>{email}</strong>. Changes save as you make them.
            </p>

            <div className="border rounded-xl divide-y bg-card">
              {ROWS.map((r) => (
                <label key={r.key} className="flex items-start gap-3 p-4 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={topics[r.key]}
                    onChange={(e) => commit({ ...topics, [r.key]: e.target.checked })}
                    className="mt-0.5 h-4 w-4 accent-[var(--primary)]"
                  />
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold">{r.label}</span>
                    <span className="block text-xs text-muted-foreground mt-0.5">{r.hint}</span>
                  </span>
                </label>
              ))}
            </div>

            <div className="mt-4 min-h-6 text-sm">
              {saving && <span className="text-muted-foreground">Saving…</span>}
              {!saving && saved && (
                <span className="text-emerald-600 inline-flex items-center gap-1.5">
                  <Check className="h-4 w-4" /> Saved
                </span>
              )}
            </div>

            {none && (
              <p className="mt-2 text-sm text-amber-700 dark:text-amber-400">
                Everything is switched off, so you're unsubscribed from marketing email. Tick anything
                above to start again.
              </p>
            )}

            <p className="mt-6 text-xs text-muted-foreground">
              Order confirmations, payment receipts, delivery updates and replies from support are not
              marketing and are not affected by these settings — they follow the orders you place.
            </p>

            <button
              onClick={() => commit({ products: false, blog: false, recipes: false, offers: false, digest: false })}
              className="mt-4 text-xs text-muted-foreground underline hover:text-foreground"
            >
              Unsubscribe from everything
            </button>
          </>
        )}
      </div>
    </SiteLayout>
  );
}
