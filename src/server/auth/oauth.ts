// Self-hosted Google + Facebook OAuth2 (no third-party auth service). Client
// credentials come from the admin-editable social config (site-config.ts).
import { getSocialConfig } from "@/server/site-config";

export type OAuthProvider = "google" | "facebook";

export async function getAuthUrl(provider: OAuthProvider, redirectUri: string, state: string): Promise<string | null> {
  const cfg = await getSocialConfig();
  if (provider === "google") {
    if (!cfg.google.enabled || !cfg.google.clientId) return null;
    const p = new URLSearchParams({
      client_id: cfg.google.clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: "openid email profile",
      state,
      access_type: "online",
      prompt: "select_account",
    });
    return "https://accounts.google.com/o/oauth2/v2/auth?" + p.toString();
  }
  if (provider === "facebook") {
    if (!cfg.facebook.enabled || !cfg.facebook.appId) return null;
    const p = new URLSearchParams({ client_id: cfg.facebook.appId, redirect_uri: redirectUri, response_type: "code", scope: "email public_profile", state });
    return "https://www.facebook.com/v18.0/dialog/oauth?" + p.toString();
  }
  return null;
}

export async function exchangeCode(provider: OAuthProvider, code: string, redirectUri: string): Promise<{ email: string; name: string } | null> {
  const cfg = await getSocialConfig();
  try {
    if (provider === "google") {
      const tRes = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ code, client_id: cfg.google.clientId, client_secret: cfg.google.clientSecret, redirect_uri: redirectUri, grant_type: "authorization_code" }),
      });
      const t = (await tRes.json()) as { access_token?: string };
      if (!t.access_token) return null;
      const uRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", { headers: { authorization: `Bearer ${t.access_token}` } });
      const u = (await uRes.json()) as { email?: string; name?: string };
      return u.email ? { email: u.email, name: u.name || u.email } : null;
    }
    if (provider === "facebook") {
      const tRes = await fetch("https://graph.facebook.com/v18.0/oauth/access_token?" + new URLSearchParams({ client_id: cfg.facebook.appId, client_secret: cfg.facebook.appSecret, redirect_uri: redirectUri, code }));
      const t = (await tRes.json()) as { access_token?: string };
      if (!t.access_token) return null;
      const uRes = await fetch("https://graph.facebook.com/me?" + new URLSearchParams({ fields: "id,name,email", access_token: t.access_token }));
      const u = (await uRes.json()) as { email?: string; name?: string };
      return u.email ? { email: u.email, name: u.name || u.email } : null;
    }
  } catch {
    return null;
  }
  return null;
}
