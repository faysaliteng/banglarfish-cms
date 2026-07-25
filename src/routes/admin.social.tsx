import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { adminGetSocial, adminSaveSocial } from "@/lib/site.functions";
import type { SocialConfig } from "@/lib/config-types";
import { withBase } from "@/lib/base-path";
import { KeyRound, Save } from "lucide-react";
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

  const redirect = (p: string) => origin + withBase(`/api/auth/${p}/callback`);

  return (
    <div className="pb-16 max-w-3xl">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-1">
        <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2 min-w-0"><KeyRound className="h-6 w-6 shrink-0" /> Social Login</h1>
        <button onClick={save} disabled={saving} className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-md font-semibold hover:bg-primary/90 disabled:opacity-60">
          <Save className="h-4 w-4" /> {saving ? "Saving…" : "Save"}
        </button>
      </div>
      <p className="text-sm text-muted-foreground mb-4">Let customers sign in or sign up with Google or Facebook. Create OAuth apps, paste the credentials below, tick <strong>Enabled</strong>, and Save — the “Continue with Google / Facebook” buttons then appear automatically on the login &amp; signup page. Register the redirect URIs exactly as shown.</p>
      <div className="mb-6 rounded-xl border border-amber-300/60 bg-amber-50 text-amber-800 px-4 py-3 text-sm">
        <strong>Why don't the buttons show yet?</strong> They only appear once a provider is enabled here with a valid Client ID. OAuth keys are unique to your Google/Facebook apps and your domain, so they must be created and entered by you (a one-time setup).
      </div>

      <div className="border rounded-2xl p-5 bg-card mb-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold">Google</h3>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={cfg.google.enabled} onChange={(e) => setCfg({ ...cfg, google: { ...cfg.google, enabled: e.target.checked } })} /> Enabled</label>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Client ID" value={cfg.google.clientId} onChange={(v) => setCfg({ ...cfg, google: { ...cfg.google, clientId: v } })} />
          <Field label="Client Secret" secret value={cfg.google.clientSecret} onChange={(v) => setCfg({ ...cfg, google: { ...cfg.google, clientSecret: v } })} />
        </div>
        <CopyUri label="Authorized redirect URI" uri={redirect("google")} />
        <ol className="text-xs text-muted-foreground mt-2 space-y-0.5 list-decimal pl-4">
          <li>console.cloud.google.com → APIs &amp; Services → OAuth consent screen (External, add your email).</li>
          <li>Credentials → Create OAuth client ID → <strong>Web application</strong>.</li>
          <li>Paste the redirect URI above into <em>Authorized redirect URIs</em>.</li>
          <li>Copy the Client ID &amp; Secret here, tick Enabled, Save. (Scopes: email, profile.)</li>
        </ol>
      </div>

      <div className="border rounded-2xl p-5 bg-card">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold">Facebook</h3>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={cfg.facebook.enabled} onChange={(e) => setCfg({ ...cfg, facebook: { ...cfg.facebook, enabled: e.target.checked } })} /> Enabled</label>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="App ID" value={cfg.facebook.appId} onChange={(v) => setCfg({ ...cfg, facebook: { ...cfg.facebook, appId: v } })} />
          <Field label="App Secret" secret value={cfg.facebook.appSecret} onChange={(v) => setCfg({ ...cfg, facebook: { ...cfg.facebook, appSecret: v } })} />
        </div>
        <CopyUri label="Valid OAuth redirect URI" uri={redirect("facebook")} />
        <ol className="text-xs text-muted-foreground mt-2 space-y-0.5 list-decimal pl-4">
          <li>developers.facebook.com → Create App → add the <strong>Facebook Login</strong> product.</li>
          <li>Facebook Login → Settings → paste the redirect URI into <em>Valid OAuth Redirect URIs</em>.</li>
          <li>Copy the App ID &amp; Secret here, tick Enabled, Save. Switch the app to <em>Live</em> mode.</li>
          <li>Permissions: email, public_profile (granted by default).</li>
        </ol>
      </div>
    </div>
  );
}

function CopyUri({ label, uri }: { label: string; uri: string }) {
  return (
    <div className="mt-3">
      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{label}</span>
      <div className="mt-1 flex items-center gap-2">
        <code className="flex-1 bg-muted rounded-md px-3 py-2 text-xs break-all">{uri}</code>
        <button type="button" onClick={() => { navigator.clipboard?.writeText(uri); toast.success("Copied"); }} className="text-xs border rounded-md px-3 py-2 hover:bg-muted">Copy</button>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, secret }: { label: string; value: string; onChange: (v: string) => void; secret?: boolean }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{label}</span>
      <input type={secret ? "password" : "text"} value={value} onChange={(e) => onChange(e.target.value)} autoComplete="off" className="mt-1 w-full border rounded-md px-3 py-2 text-sm font-mono" />
    </label>
  );
}
