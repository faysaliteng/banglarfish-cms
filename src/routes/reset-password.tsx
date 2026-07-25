import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site/SiteLayout";
import { useServerFn } from "@tanstack/react-start";
import { requestPasswordReset, resetPassword } from "@/lib/auth.functions";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [{ title: "Reset password — Banglarfish" }, { name: "robots", content: "noindex" }] }),
  component: ResetPassword,
});

function ResetPassword() {
  const nav = useNavigate();
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const sendReset = useServerFn(requestPasswordReset);
  const doReset = useServerFn(resetPassword);

  async function onSendCode(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const p = String(fd.get("phone") ?? "").trim();
    setBusy(true);
    try {
      const res = await sendReset({ data: { phone: p } });
      setPhone(p);
      setStep("code");
      toast.success("If an account exists for that number, a reset code was sent by SMS.");
      if (res.devCode) toast.message(`Dev code: ${res.devCode}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send code");
    } finally {
      setBusy(false);
    }
  }

  async function onReset(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setBusy(true);
    try {
      await doReset({
        data: {
          phone,
          code: String(fd.get("code") ?? "").trim(),
          password: String(fd.get("password") ?? ""),
        },
      });
      toast.success("Password updated. Please sign in.");
      nav({ to: "/auth", search: { next: "/account" } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Reset failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <SiteLayout>
      <div className="container-x py-16 max-w-md mx-auto">
        <h1 className="text-2xl font-bold mb-4 text-center">Reset your password</h1>
        {step === "phone" ? (
          <form onSubmit={onSendCode} className="space-y-3 border rounded-2xl p-6 bg-card">
            <p className="text-sm text-muted-foreground text-center mb-2">
              Enter your registered phone number and we'll text you a verification code.
            </p>
            <input
              name="phone"
              type="tel"
              placeholder="Phone (e.g. 017XXXXXXXX)"
              required
              className="w-full border rounded-md px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <button disabled={busy} className="w-full bg-primary text-primary-foreground py-2.5 rounded-md font-semibold hover:bg-primary/90 disabled:opacity-60">
              {busy ? "Sending…" : "Send code"}
            </button>
          </form>
        ) : (
          <form onSubmit={onReset} className="space-y-3 border rounded-2xl p-6 bg-card">
            <p className="text-sm text-muted-foreground text-center mb-2">
              Enter the 6-digit code sent to {phone} and choose a new password.
            </p>
            <input
              name="code"
              inputMode="numeric"
              maxLength={6}
              placeholder="6-digit code"
              required
              className="w-full border rounded-md px-3 py-2.5 text-sm text-center tracking-[0.4em] focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <input
              name="password"
              type="password"
              placeholder="New password (min 8 chars)"
              required
              minLength={8}
              className="w-full border rounded-md px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <button disabled={busy} className="w-full bg-primary text-primary-foreground py-2.5 rounded-md font-semibold hover:bg-primary/90 disabled:opacity-60">
              {busy ? "Saving…" : "Update password"}
            </button>
            <button type="button" onClick={() => setStep("phone")} className="text-xs text-muted-foreground hover:text-primary block mx-auto">
              Use a different number
            </button>
          </form>
        )}
        <p className="text-center text-xs text-muted-foreground mt-4">
          <Link to="/auth" search={{ next: "/account" }} className="hover:text-primary">
            ← Back to sign in
          </Link>
        </p>
      </div>
    </SiteLayout>
  );
}
