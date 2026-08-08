import { useEffect, useState } from "react";

// Lightweight cookie-consent banner. The choice is stored in localStorage; a
// long-lived cookie mirrors it so the SSR layer can read consent if needed.
const KEY = "bf_cookie_consent_v1";

export function CookieConsent() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(KEY)) setShow(true);
    } catch { /* storage blocked — stay hidden */ }
  }, []);

  function decide(choice: "accepted" | "rejected") {
    try {
      localStorage.setItem(KEY, JSON.stringify({ choice, at: new Date().toISOString() }));
      document.cookie = `bf_consent=${choice}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
    } catch { /* ignore */ }
    setShow(false);
  }

  if (!show) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[100] p-3 sm:p-4" role="dialog" aria-label="Cookie consent">
      <div className="mx-auto max-w-4xl rounded-2xl border bg-card/95 backdrop-blur shadow-lg p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
        <p className="text-sm text-muted-foreground flex-1">
          We use cookies to keep you signed in, remember your cart, and understand how the store is used. See our{" "}
          <a href="privacy" className="text-primary underline">Privacy Policy</a>.
        </p>
        <div className="flex gap-2 shrink-0">
          <button onClick={() => decide("rejected")} className="text-sm px-4 py-2 rounded-md border hover:bg-muted">Reject non-essential</button>
          <button onClick={() => decide("accepted")} className="text-sm font-semibold px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90">Accept all</button>
        </div>
      </div>
    </div>
  );
}
