import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { adminGetSocial, adminSaveSocial } from "@/lib/site.functions";
import type { SocialConfig } from "@/lib/config-types";
import { withBase } from "@/lib/base-path";
import { KeyRound, Save, BookOpen, CheckCircle2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/social")({ component: SocialConfigPage });

function SocialConfigPage() {
  const getFn = useServerFn(adminGetSocial);
  const saveFn = useServerFn(adminSaveSocial);
  const [cfg, setCfg] = useState<SocialConfig | null>(null);
  const [saving, setSaving] = useState(false);
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") setOrigin(window.location.origin);
    getFn().then(setCfg).catch((e) => toast.error(e instanceof Error ? e.message : "Failed"));
  }, [getFn]);

  if (!cfg) return <p className="text-sm text-muted-foreground">Loading…</p>;

  async function save() {
    if (!cfg) return;
    setSaving(true);
    try {
      await saveFn({ data: cfg });
      toast.success("Social login saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  const url = (p: string) => origin + withBase(p);
  const redirect = (p: string) => url(`/api/auth/${p}/callback`);

  return (
    <div className="pb-16 max-w-3xl">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-1">
        <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2 min-w-0"><KeyRound className="h-6 w-6 shrink-0" /> Social Login</h1>
        <button onClick={save} disabled={saving} className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-md font-semibold hover:bg-primary/90 disabled:opacity-60">
          <Save className="h-4 w-4" /> {saving ? "Saving…" : "Save"}
        </button>
      </div>
      <p className="text-sm text-muted-foreground mb-4">Let customers sign in with Google or Facebook. You create a free "app" on Google/Facebook once, paste two keys here, tick <strong>Enabled</strong>, and Save. The "Continue with Google / Facebook" buttons then appear automatically on your login &amp; signup page.</p>

      <div className="mb-6 rounded-xl border border-emerald-300/60 bg-emerald-50 text-emerald-800 px-4 py-3 text-sm">
        <strong>New here? Start with Google.</strong> It takes ~10 minutes and has the fewest hurdles. Facebook works too but needs a few extra steps (Live mode + a privacy policy). Full click-by-click guides are below each section — click <em>"📖 Full step-by-step guide"</em> to open them.
      </div>

      {/* ---------------- GOOGLE ---------------- */}
      <div className="border rounded-2xl p-5 bg-card mb-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-lg">Google</h3>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={cfg.google.enabled} onChange={(e) => setCfg({ ...cfg, google: { ...cfg.google, enabled: e.target.checked } })} /> Enabled</label>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Client ID" value={cfg.google.clientId} onChange={(v) => setCfg({ ...cfg, google: { ...cfg.google, clientId: v } })} placeholder="1234…apps.googleusercontent.com" />
          <Field label="Client Secret" secret value={cfg.google.clientSecret} onChange={(v) => setCfg({ ...cfg, google: { ...cfg.google, clientSecret: v } })} placeholder="GOCSPX-…" />
        </div>
        <CopyUri label="Authorized redirect URI — you'll paste this into Google" uri={redirect("google")} />

        <Guide title="📖 Full step-by-step guide for Google (≈10 min)">
          <Step n={1} title="Open Google Cloud Console">
            Go to <B>console.cloud.google.com</B> and sign in with any Google account (your personal Gmail is fine).
          </Step>
          <Step n={2} title="Create a project">
            Top-left, click the <B>project dropdown</B> (says "Select a project") → <B>New Project</B> → Name it <B>Banglarfish</B> → <B>Create</B>. Wait a few seconds, then make sure that project is selected in the top bar.
          </Step>
          <Step n={3} title="Set up the consent screen (what users see)">
            Left menu (☰) → <B>APIs &amp; Services</B> → <B>OAuth consent screen</B> (newer accounts call it <B>Google Auth Platform → Branding</B>).
            <SubList items={[
              "User type: choose External → Create.",
              "App name: Banglarfish. User support email: pick your email.",
              "Developer contact email: type your email. → Save and Continue.",
              "On the Scopes step: click 'Add or remove scopes', tick .../auth/userinfo.email and .../auth/userinfo.profile (and openid) → Update → Save and Continue.",
              "On the Test users step: click 'Add users', add your own email → Save and Continue. (This lets you test before publishing.)",
            ]} />
          </Step>
          <Step n={4} title="Create the OAuth credentials (your two keys)">
            Left menu → <B>APIs &amp; Services</B> → <B>Credentials</B> → <B>+ Create Credentials</B> → <B>OAuth client ID</B>.
            <SubList items={[
              "Application type: Web application.",
              "Name: Banglarfish Web.",
              "Under 'Authorized redirect URIs' click + ADD URI and paste the redirect URI shown above — it must match EXACTLY (copy it with the Copy button).",
              "Click Create.",
            ]} />
          </Step>
          <Step n={5} title="Copy the keys into this page">
            A popup shows your <B>Client ID</B> and <B>Client secret</B>. Copy each into the boxes above. Tick <B>Enabled</B>, then click <B>Save</B> (top-right of this page).
          </Step>
          <Step n={6} title="Publish so real customers can log in">
            Back on <B>OAuth consent screen</B>, click <B>Publish app</B> → Confirm. (While unpublished, only the test users you added can log in.) For basic email/profile, Google does not require a security review.
          </Step>
          <Trouble items={[
            "\"redirect_uri_mismatch\" → the URI in Google isn't identical to the one above. Re-copy and paste it exactly (https, no trailing slash).",
            "\"Access blocked: app not verified\" → click Publish app (step 6), or add your email as a Test user.",
            "Button not showing on the site → make sure Enabled is ticked here and you clicked Save.",
          ]} />
        </Guide>
      </div>

      {/* ---------------- FACEBOOK ---------------- */}
      <div className="border rounded-2xl p-5 bg-card">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-lg">Facebook</h3>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={cfg.facebook.enabled} onChange={(e) => setCfg({ ...cfg, facebook: { ...cfg.facebook, enabled: e.target.checked } })} /> Enabled</label>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="App ID" value={cfg.facebook.appId} onChange={(v) => setCfg({ ...cfg, facebook: { ...cfg.facebook, appId: v } })} placeholder="e.g. 1055512345678901" />
          <Field label="App Secret" secret value={cfg.facebook.appSecret} onChange={(v) => setCfg({ ...cfg, facebook: { ...cfg.facebook, appSecret: v } })} placeholder="32-character secret" />
        </div>
        <div className="mt-3">
          <Field label='Configuration ID — needed for "Facebook Login for Business"' value={cfg.facebook.configId ?? ""} onChange={(v) => setCfg({ ...cfg, facebook: { ...cfg.facebook, configId: v } })} placeholder="leave blank for consumer Facebook Login" />
          <p className="text-xs text-muted-foreground mt-1">Got the "Invalid Scopes: email" error? Your app is "Facebook Login for Business" — create a Login <strong>Configuration</strong> including <code>email</code> + <code>public_profile</code> and paste its ID here.</p>
        </div>
        <CopyUri label="Valid OAuth redirect URI — paste into Facebook Login settings" uri={redirect("facebook")} />
        <CopyUri label="Deauthorize callback URL (App Settings)" uri={url("/api/auth/facebook/deauthorize")} />
        <CopyUri label="Data Deletion Request URL (App Settings)" uri={url("/api/auth/facebook/data-deletion")} />

        <div className="mt-3 rounded-lg border border-amber-300/60 bg-amber-50 text-amber-800 px-3 py-2 text-xs flex gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <span><strong>Important:</strong> when creating the app, pick <strong>only</strong> "Authenticate and request data from users with Facebook Login". If you also tick Marketing / WhatsApp / Threads, Facebook <em>greys out</em> Facebook Login (they can't share one app).</span>
        </div>

        <Guide title="📖 Full step-by-step guide for Facebook (≈15 min)">
          <Step n={1} title="Open the Facebook developer site">
            Go to <B>developers.facebook.com</B> → log in with your Facebook account → top-right <B>My Apps</B> → <B>Create App</B>.
          </Step>
          <Step n={2} title="Choose the RIGHT use case">
            When asked what your app should do, select <B>"Authenticate and request data from users with Facebook Login"</B> and nothing else → <B>Next</B>. (Do not pick Marketing/WhatsApp/Threads, or Login gets greyed out — see the warning above.)
            <SubList items={[
              "App name: Banglarfish. App contact email: your email.",
              "Click Create app (you may need to re-enter your Facebook password).",
            ]} />
          </Step>
          <Step n={3} title="Add the redirect URI">
            In the left sidebar open <B>Facebook Login → Settings</B>. In <B>Valid OAuth Redirect URIs</B> paste the redirect URI shown above → <B>Save changes</B>.
          </Step>
          <Step n={4} title="Get your App ID &amp; App Secret">
            Left sidebar → <B>App settings → Basic</B>.
            <SubList items={[
              "App ID is shown at the top — copy it into the App ID box above.",
              "App Secret → click Show (enter your Facebook password) → copy it into the App Secret box above.",
              "Also on this page: App Domains = banglarfish.com. Privacy Policy URL = https://banglarfish.com/privacy. Paste the Data Deletion URL (shown above) into 'Data Deletion Request URL'.",
              "Pick a Category (e.g. Shopping) → Save changes.",
            ]} />
          </Step>
          <Step n={5} title="Add the deauthorize URL">
            Back in <B>Facebook Login → Settings</B>, paste the <B>Deauthorize callback URL</B> (shown above) into that field → Save.
          </Step>
          <Step n={6} title="Save here, then go Live">
            Paste App ID + Secret above, tick <B>Enabled</B>, click <B>Save</B>. Then at the very top of the Facebook dashboard flip the toggle from <B>Development</B> to <B>Live</B>. Basic email + public_profile work in Live once a Privacy Policy is set.
          </Step>
          <Trouble items={[
            "\"Invalid Scopes: email\" → your app uses 'Facebook Login for Business'. Open Facebook Login for Business → Configurations → create one that includes email + public_profile, then paste its Configuration ID in the field above and Save.",
            "Facebook Login is greyed out when creating → you picked extra use cases. Start a new app with only Facebook Login.",
            "\"URL Blocked: This redirect failed…\" → the Valid OAuth Redirect URI must match the one above exactly.",
            "\"App not active / in development\" → switch the app to Live (step 6).",
            "Can't find the Secret → App settings → Basic → App Secret → Show.",
          ]} />
        </Guide>
      </div>

      {/* ---------------- TEST ---------------- */}
      <div className="mt-6 rounded-xl border bg-card p-5 text-sm">
        <h3 className="font-semibold flex items-center gap-2 mb-2"><CheckCircle2 className="h-4 w-4 text-emerald-600" /> How to test it</h3>
        <ol className="list-decimal pl-5 space-y-1 text-muted-foreground">
          <li>After you tick Enabled and Save, open your storefront login page: <code>{url("/auth")}</code></li>
          <li>You should see a <strong>Continue with Google</strong> / <strong>Continue with Facebook</strong> button.</li>
          <li>Click it, sign in with that account, and you should be redirected back — signed in.</li>
          <li>If a button shows a "not set up" toast, the provider isn't Enabled/Saved yet here.</li>
        </ol>
      </div>
    </div>
  );
}

function Guide({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <details className="mt-4 border rounded-xl bg-muted/20 overflow-hidden group">
      <summary className="cursor-pointer select-none px-4 py-3 font-semibold text-sm flex items-center gap-2 hover:bg-muted/40">
        <BookOpen className="h-4 w-4 text-primary" /> {title}
      </summary>
      <div className="px-4 pb-4 pt-1 space-y-3">{children}</div>
    </details>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <span className="shrink-0 h-6 w-6 rounded-full bg-primary text-primary-foreground text-xs font-bold grid place-items-center">{n}</span>
      <div className="text-sm">
        <p className="font-semibold">{title}</p>
        <div className="text-muted-foreground mt-0.5 leading-relaxed">{children}</div>
      </div>
    </div>
  );
}

function SubList({ items }: { items: string[] }) {
  return <ul className="list-disc pl-5 mt-1 space-y-0.5">{items.map((t, i) => <li key={i}>{t}</li>)}</ul>;
}

function Trouble({ items }: { items: string[] }) {
  return (
    <div className="rounded-lg border border-amber-300/50 bg-amber-50/60 px-3 py-2">
      <p className="text-xs font-bold text-amber-800 mb-1">Troubleshooting</p>
      <ul className="list-disc pl-5 space-y-0.5 text-xs text-amber-900/90">{items.map((t, i) => <li key={i}>{t}</li>)}</ul>
    </div>
  );
}

function B({ children }: { children: React.ReactNode }) {
  return <strong className="text-foreground">{children}</strong>;
}

function CopyUri({ label, uri }: { label: string; uri: string }) {
  return (
    <div className="mt-3">
      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{label}</span>
      <div className="mt-1 flex items-center gap-2">
        <code className="flex-1 bg-muted rounded-md px-3 py-2 text-xs break-all">{uri}</code>
        <button type="button" onClick={() => { navigator.clipboard?.writeText(uri); toast.success("Copied"); }} className="text-xs border rounded-md px-3 py-2 hover:bg-muted shrink-0">Copy</button>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, secret, placeholder }: { label: string; value: string; onChange: (v: string) => void; secret?: boolean; placeholder?: string }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{label}</span>
      <input type={secret ? "password" : "text"} value={value} onChange={(e) => onChange(e.target.value)} autoComplete="off" placeholder={placeholder} className="mt-1 w-full border rounded-md px-3 py-2 text-sm font-mono" />
    </label>
  );
}
