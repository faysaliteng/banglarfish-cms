import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteLayout } from "@/components/site/SiteLayout";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { login, signupEmail } from "@/lib/auth.functions";
import { getSocialEnabled } from "@/lib/site.functions";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { withBase } from "@/lib/base-path";
import { Eye, EyeOff } from "lucide-react";

// Signup collects identity + a mandatory phone (kept unverified — the customer
// can verify by SMS later). Delivery address is collected right after, at
// /complete-profile.
const signupSchema = z.object({
  full_name: z.string().trim().min(2, "Enter your full name").max(100),
  email: z.string().trim().email("Invalid email").max(255),
  password: z.string().min(8, "At least 8 characters").max(72),
  phone: z.string().trim().regex(/^(\+?88)?01[3-9]\d{8}$/, "Enter a valid BD phone (e.g. 017XXXXXXXX)"),
});

export const Route = createFileRoute("/auth")({
  validateSearch: (s: Record<string, unknown>): { next: string; error?: string } => ({
    next: typeof s.next === "string" ? s.next : "/account",
    ...(typeof s.error === "string" ? { error: s.error } : {}),
  }),
  head: () => ({
    meta: [
      { title: "Sign in or Sign up — Banglarfish" },
      { name: "description", content: "Sign in to Banglarfish to place orders and track deliveries." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

// Only allow same-origin internal redirect targets (blocks //evil.com and /\evil.com).
function safePath(next: string): string {
  if (!next.startsWith("/") || next.startsWith("//") || next.includes("\\")) return "/account";
  return next;
}

const OAUTH_ERRORS: Record<string, string> = {
  oauth_disabled: "That social login isn't set up yet. Add your API keys in Admin → Social Login.",
  oauth_state: "Sign-in session expired. Please try again.",
  oauth_failed: "Could not sign you in with that provider. Please try again.",
};

function AuthPage() {
  const { next, error } = Route.useSearch();
  const qc = useQueryClient();
  const [tab, setTab] = useState<"login" | "signup">("login");
  const [busy, setBusy] = useState(false);
  const [twoFA, setTwoFA] = useState<{ email: string; password: string } | null>(null);
  const [twoFACode, setTwoFACode] = useState("");
  const dest = safePath(next);

  const doLogin = useServerFn(login);
  const doSignupEmail = useServerFn(signupEmail);
  const socialFn = useServerFn(getSocialEnabled);
  const { data: social } = useQuery({ queryKey: ["social"], queryFn: () => socialFn(), staleTime: 300_000 });

  useEffect(() => {
    if (error) toast.error(OAUTH_ERRORS[error] ?? "Sign-in failed. Please try again.");
  }, [error]);

  function finishLogin(user: { role: string }) {
    qc.setQueryData(["me"], user);
    toast.success("Welcome back!");
    const isStaff = ["staff", "manager", "admin"].includes(user.role);
    window.location.href = withBase(dest === "/account" && isStaff ? "/admin" : dest);
  }

  async function onLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email") ?? "").trim();
    const password = String(fd.get("password") ?? "");
    setBusy(true);
    try {
      const res = await doLogin({ data: { email, password } });
      if (res && "twoFactorRequired" in res) {
        setTwoFA({ email, password });
        setBusy(false);
        return;
      }
      finishLogin(res);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sign in failed");
      setBusy(false);
    }
  }

  async function onVerify2FA(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!twoFA) return;
    setBusy(true);
    try {
      const res = await doLogin({ data: { email: twoFA.email, password: twoFA.password, code: twoFACode.trim() } });
      if (res && "twoFactorRequired" in res) { toast.error("Enter your 6-digit code."); setBusy(false); return; }
      finishLogin(res);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Invalid code");
      setBusy(false);
    }
  }

  async function onSignup(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const raw = Object.fromEntries(new FormData(e.currentTarget).entries());
    const parsed = signupSchema.safeParse(raw);
    if (!parsed.success) return toast.error(parsed.error.issues[0].message);
    setBusy(true);
    try {
      // Phone is saved (unverified) — the account is created instantly.
      const user = await doSignupEmail({ data: parsed.data });
      qc.setQueryData(["me"], user);
      toast.success("Account created — welcome!");
      window.location.href = withBase(`/complete-profile?next=${encodeURIComponent(dest)}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create account");
      setBusy(false);
    }
  }

  const notConfigured = (name: string) => toast.error(`${name} sign-in isn't set up yet. Enable it in Admin → Social Login.`);
  const btnCls = "flex items-center justify-center gap-2 border rounded-md py-2.5 text-sm font-medium transition";

  return (
    <SiteLayout>
      <div className="container-x py-12 max-w-md mx-auto">
        <div className="flex bg-muted rounded-full p-1 mb-6 text-sm font-medium">
          <button onClick={() => setTab("login")} className={`flex-1 py-2 rounded-full transition ${tab === "login" ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground"}`}>Sign in</button>
          <button onClick={() => setTab("signup")} className={`flex-1 py-2 rounded-full transition ${tab === "signup" ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground"}`}>Create account</button>
        </div>

        {/* Social login — always visible. When a provider isn't configured yet,
            the button explains how to enable it. */}
        <div className="mb-5">
          <div className="grid gap-2">
            {social?.google ? (
              <a href={withBase(`/api/auth/google?next=${encodeURIComponent(next)}`)} className={`${btnCls} hover:bg-muted`}>
                <GoogleIcon /> {tab === "signup" ? "Sign up with Google" : "Continue with Google"}
              </a>
            ) : (
              <button type="button" onClick={() => notConfigured("Google")} className={`${btnCls} hover:bg-muted`}>
                <GoogleIcon /> {tab === "signup" ? "Sign up with Google" : "Continue with Google"}
              </button>
            )}
            {social?.facebook ? (
              <a href={withBase(`/api/auth/facebook?next=${encodeURIComponent(next)}`)} className={`${btnCls} text-white hover:opacity-90`} style={{ background: "#1877F2", borderColor: "#1877F2" }}>
                <FacebookIcon /> {tab === "signup" ? "Sign up with Facebook" : "Continue with Facebook"}
              </a>
            ) : (
              <button type="button" onClick={() => notConfigured("Facebook")} className={`${btnCls} text-white hover:opacity-90`} style={{ background: "#1877F2", borderColor: "#1877F2" }}>
                <FacebookIcon /> {tab === "signup" ? "Sign up with Facebook" : "Continue with Facebook"}
              </button>
            )}
          </div>
          <div className="relative my-4 text-center">
            <div className="absolute inset-x-0 top-1/2 border-t" />
            <span className="relative bg-background px-3 text-xs text-muted-foreground">or with email</span>
          </div>
        </div>

        {twoFA ? (
          <form onSubmit={onVerify2FA} className="space-y-3 border rounded-2xl p-6 bg-card">
            <h1 className="text-2xl font-bold text-center mb-1">Two-factor authentication</h1>
            <p className="text-sm text-muted-foreground text-center mb-2">Enter the 6-digit code from your authenticator app, or a recovery code.</p>
            <input value={twoFACode} onChange={(e) => setTwoFACode(e.target.value)} inputMode="numeric" autoComplete="one-time-code" autoFocus placeholder="123456" className="w-full border rounded-md px-3 py-2.5 text-center text-lg tracking-[0.3em] focus:outline-none focus:ring-2 focus:ring-primary/30" />
            <button disabled={busy || twoFACode.trim().length < 6} className="w-full bg-primary text-primary-foreground py-2.5 rounded-md font-semibold hover:bg-primary/90 disabled:opacity-60">
              {busy ? "Verifying…" : "Verify & sign in"}
            </button>
            <button type="button" onClick={() => { setTwoFA(null); setTwoFACode(""); }} className="text-xs text-muted-foreground hover:text-primary block text-center w-full">← Back</button>
          </form>
        ) : tab === "login" ? (
          <form onSubmit={onLogin} className="space-y-3 border rounded-2xl p-6 bg-card">
            <h1 className="text-2xl font-bold text-center mb-2">Welcome back</h1>
            <Input name="email" type="email" placeholder="Email" required />
            <PasswordInput name="password" placeholder="Password" required minLength={8} />
            <button disabled={busy} className="w-full bg-primary text-primary-foreground py-2.5 rounded-md font-semibold hover:bg-primary/90 disabled:opacity-60">
              {busy ? "Signing in…" : "Sign in"}
            </button>
            <Link to="/reset-password" search={{ token: undefined }} className="text-xs text-muted-foreground hover:text-primary block text-center">Forgot password?</Link>
          </form>
        ) : (
          <form onSubmit={onSignup} className="space-y-3 border rounded-2xl p-6 bg-card">
            <h1 className="text-2xl font-bold text-center mb-2">Create your account</h1>
            <Input name="full_name" placeholder="Full name *" required />
            <Input name="email" type="email" placeholder="Email *" required />
            <Input name="phone" type="tel" placeholder="Phone * (e.g. 017XXXXXXXX)" required />
            <PasswordInput name="password" placeholder="Password (min 8 chars) *" required minLength={8} />
            <button disabled={busy} className="w-full bg-primary text-primary-foreground py-2.5 rounded-md font-semibold hover:bg-primary/90 disabled:opacity-60">
              {busy ? "Creating…" : "Create account"}
            </button>
            <p className="text-[11px] text-muted-foreground text-center leading-relaxed">
              Your phone is required for delivery. You can verify it by SMS later from your account. Delivery address is set on the next step.
            </p>
          </form>
        )}
        <p className="text-center text-xs text-muted-foreground mt-4">
          <Link to="/" className="hover:text-primary">← Back to store</Link>
        </p>
      </div>
    </SiteLayout>
  );
}

function Input({ className = "", ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`w-full border rounded-md px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 ${className}`} />;
}

// Password field with a show/hide toggle.
function PasswordInput({ className = "", ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input {...props} type={show ? "text" : "password"} className={`w-full border rounded-md px-3 py-2.5 pr-11 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 ${className}`} />
      <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? "Hide password" : "Show password"} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 48 48" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 8 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.3-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 15.1 18.9 12 24 12c3.1 0 5.8 1.1 8 3l5.7-5.7C34 6.1 29.3 4 24 4 16.1 4 9.3 8.4 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2c-2 1.4-4.5 2.4-7.2 2.4-5.2 0-9.6-3.3-11.2-8l-6.5 5C9.2 39.6 16 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.2 5.6l6.2 5.2C41.8 35.4 44 30.1 44 24c0-1.3-.1-2.3-.4-3.5z" />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.68 4.53-4.68 1.31 0 2.68.24 2.68.24v2.97h-1.51c-1.49 0-1.96.93-1.96 1.89v2.24h3.33l-.53 3.49h-2.8V24C19.61 23.1 24 18.1 24 12.07z" />
    </svg>
  );
}
