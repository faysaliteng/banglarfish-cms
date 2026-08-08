import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site/SiteLayout";
import { useServerFn } from "@tanstack/react-start";
import { requestPasswordReset, resetPassword, requestPasswordResetEmail, resetPasswordWithToken } from "@/lib/auth.functions";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/reset-password")({
  validateSearch: (s: Record<string, unknown>) => ({ token: typeof s.token === "string" ? s.token : undefined }),
  head: () => ({ meta: [{ title: "Reset password — Banglarfish" }, { name: "robots", content: "noindex" }] }),
  component: ResetPassword,
});

const input = "w-full border rounded-md px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30";
const primaryBtn = "w-full bg-primary text-primary-foreground py-2.5 rounded-md font-semibold hover:bg-primary/90 disabled:opacity-60";

function ResetPassword() {
  const nav = useNavigate();
  const { token } = Route.useSearch();
  return (
    <SiteLayout>
      <div className="container-x py-16 max-w-md mx-auto">
        <h1 className="text-2xl font-bold mb-4 text-center">Reset your password</h1>
        {token ? <TokenReset token={token} nav={nav} /> : <RequestReset nav={nav} />}
        <p className="text-center text-xs text-muted-foreground mt-4">
          <Link to="/auth" search={{ next: "/account" }} className="hover:text-primary">← Back to sign in</Link>
        </p>
      </div>
    </SiteLayout>
  );
}

/* Landing on a reset link (?token=…): choose a new password. */
function TokenReset({ token, nav }: { token: string; nav: ReturnType<typeof useNavigate> }) {
  const doReset = useServerFn(resetPasswordWithToken);
  const [busy, setBusy] = useState(false);
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setBusy(true);
    try {
      await doReset({ data: { token, password: String(fd.get("password") ?? "") } });
      toast.success("Password updated. Please sign in.");
      nav({ to: "/auth", search: { next: "/account" } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Reset failed");
    } finally { setBusy(false); }
  }
  return (
    <form onSubmit={onSubmit} className="space-y-3 border rounded-2xl p-6 bg-card">
      <p className="text-sm text-muted-foreground text-center mb-2">Choose a new password for your account.</p>
      <input name="password" type="password" placeholder="New password (min 8 chars)" required minLength={8} className={input} />
      <button disabled={busy} className={primaryBtn}>{busy ? "Saving…" : "Update password"}</button>
    </form>
  );
}

/* Request a reset — by email (link) or by phone (SMS code). */
function RequestReset({ nav }: { nav: ReturnType<typeof useNavigate> }) {
  const [method, setMethod] = useState<"email" | "phone">("email");
  const [busy, setBusy] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [phoneStep, setPhoneStep] = useState<"phone" | "code">("phone");
  const [phone, setPhone] = useState("");

  const sendEmail = useServerFn(requestPasswordResetEmail);
  const sendSms = useServerFn(requestPasswordReset);
  const doPhoneReset = useServerFn(resetPassword);

  async function onEmail(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setBusy(true);
    try {
      await sendEmail({ data: { email: String(fd.get("email") ?? "").trim() } });
      setEmailSent(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send email");
    } finally { setBusy(false); }
  }
  async function onSendSms(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const p = String(fd.get("phone") ?? "").trim();
    setBusy(true);
    try {
      const res = await sendSms({ data: { phone: p } });
      setPhone(p); setPhoneStep("code");
      toast.success("If an account exists for that number, a reset code was sent by SMS.");
      if (res.devCode) toast.message(`Dev code: ${res.devCode}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send code");
    } finally { setBusy(false); }
  }
  async function onPhoneReset(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setBusy(true);
    try {
      await doPhoneReset({ data: { phone, code: String(fd.get("code") ?? "").trim(), password: String(fd.get("password") ?? "") } });
      toast.success("Password updated. Please sign in.");
      nav({ to: "/auth", search: { next: "/account" } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Reset failed");
    } finally { setBusy(false); }
  }

  if (emailSent) {
    return (
      <div className="border rounded-2xl p-6 bg-card text-center space-y-2">
        <p className="text-3xl">📧</p>
        <p className="text-sm text-muted-foreground">If an account exists for that email, we've sent a reset link. Check your inbox (and spam) and click the link to choose a new password. The link expires in 1 hour.</p>
        <button onClick={() => setEmailSent(false)} className="text-xs text-primary hover:underline">Use a different email</button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-1 rounded-full border p-1 text-sm">
        <button onClick={() => setMethod("email")} className={`flex-1 py-1.5 rounded-full transition ${method === "email" ? "bg-primary text-primary-foreground font-semibold" : "text-muted-foreground"}`}>By email</button>
        <button onClick={() => setMethod("phone")} className={`flex-1 py-1.5 rounded-full transition ${method === "phone" ? "bg-primary text-primary-foreground font-semibold" : "text-muted-foreground"}`}>By phone</button>
      </div>

      {method === "email" ? (
        <form onSubmit={onEmail} className="space-y-3 border rounded-2xl p-6 bg-card">
          <p className="text-sm text-muted-foreground text-center mb-2">Enter your account email and we'll send a reset link.</p>
          <input name="email" type="email" placeholder="you@example.com" required className={input} />
          <button disabled={busy} className={primaryBtn}>{busy ? "Sending…" : "Send reset link"}</button>
        </form>
      ) : phoneStep === "phone" ? (
        <form onSubmit={onSendSms} className="space-y-3 border rounded-2xl p-6 bg-card">
          <p className="text-sm text-muted-foreground text-center mb-2">Enter your registered phone number and we'll text you a code.</p>
          <input name="phone" type="tel" placeholder="Phone (e.g. 017XXXXXXXX)" required className={input} />
          <button disabled={busy} className={primaryBtn}>{busy ? "Sending…" : "Send code"}</button>
        </form>
      ) : (
        <form onSubmit={onPhoneReset} className="space-y-3 border rounded-2xl p-6 bg-card">
          <p className="text-sm text-muted-foreground text-center mb-2">Enter the 6-digit code sent to {phone} and choose a new password.</p>
          <input name="code" inputMode="numeric" maxLength={6} placeholder="6-digit code" required className={`${input} text-center tracking-[0.4em]`} />
          <input name="password" type="password" placeholder="New password (min 8 chars)" required minLength={8} className={input} />
          <button disabled={busy} className={primaryBtn}>{busy ? "Saving…" : "Update password"}</button>
          <button type="button" onClick={() => setPhoneStep("phone")} className="text-xs text-muted-foreground hover:text-primary block mx-auto">Use a different number</button>
        </form>
      )}
    </div>
  );
}
