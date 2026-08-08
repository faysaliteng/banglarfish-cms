# Banglarfish CMS — a self-hosted, product-agnostic e-commerce platform

An all-in-one, **self-hosted e-commerce CMS** you can use to sell **any product, in any country, in any currency**. No SaaS lock-in, no per-seat fees — you own the code and the data. Ships with a fish-shop demo (`Banglarfish`) that you can rebrand or replace in a few clicks.

> Built with **TanStack Start** (React 19 + Vite, SSR) · **PostgreSQL** + **Drizzle ORM** · self-hosted auth · deployed with **systemd + nginx**.

---

## ✨ Features

**Storefront & catalog**
- Products with variants, images, stock, compare-at pricing, SEO fields
- Categories, search, shop filters, product pages with related items & reviews
- Cart, checkout, coupons, shipping zones, orders with full status lifecycle
- Blog, **Recipes**, banners, CMS pages, header/footer menus — every section toggleable

**Design & customization**
- **111+ theme presets** + full control: colors, 8 card surfaces (glass/neo/clay/glossy/aurora/outline/elevated/flat), real **layered 3D shadow depth**, glass/transparency, 9 backgrounds, typography, effects — with live preview & import/export
- **102+ homepage templates** (one-click hero + section + copy presets)
- **8 homepage hero layouts**; scroll-reveal animations; 3D hover
- **Custom Code** — global CSS + `<head>` / footer HTML & JS (front-end code control)
- **Modules** — turn built-in features on/off (no code)

**Commerce & growth**
- **Multi-currency / global** — any currency code, symbol, position, decimals
- **Delivery-area coverage** — restrict orders to serviced areas
- **Payments** — bKash, Nagad, SSLCommerz, Cash on Delivery (simulate / sandbox / live)
- **SMS OTP** (Boomcast or any HTTP gateway) · **Social login** (Google / Facebook)
- **Advanced SEO engine** — Yoast/Rank-Math-style content analyzer & scoring, sitemap (with images + priority), RSS feed, Organization + WebSite/SearchAction schema, per-entity meta, robots, verification
- **Analytics** — revenue/orders/growth, CSV export, visitor tracking, IP bans

**Operations**
- **Setup Wizard** (guided onboarding) · **Starter Templates** (6 verticals w/ demo data)
- **Restore Defaults** (roll back any config safely)
- **In-admin Help & Developer Docs** (30+ guides) · ⌘K command palette
- Role-based admin (customer < staff < manager < admin)

---

## 🚀 Quick start (local development)

Requirements: **Node 20+**, **PostgreSQL 14+**.

```bash
git clone <your-repo-url> mystore && cd mystore
npm ci
cp .env.example .env          # then edit DATABASE_URL etc.
npm run db:push               # create the schema (or: npm run db:migrate)
npm run db:seed               # demo catalog + admin user (prints the login)
npm run dev                   # http://localhost:8080
```

The seed prints the admin credentials. Sign in at `/auth`, then open `/admin`.

---

## 🖥️ One-command production deploy (Ubuntu VPS)

```bash
# On a fresh Ubuntu 22.04/24.04 server, from the project root:
sudo DOMAIN=yourdomain.com bash deploy/setup.sh
```

This installs Node + PostgreSQL + nginx, provisions the DB, builds the app, runs migrations + seed, installs the `banglarfish.service` systemd unit, and configures nginx. Then add TLS:

```bash
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

- **Sub-path deploys** (e.g. `yourdomain.com/store`): build with `VITE_BASE_PATH=/store APP_BASE_PATH=/store` and add the nginx location blocks (see `deploy/nginx.conf`). Full guide in [DEPLOY.md](DEPLOY.md).
- Config lives in `.env` (see `.env.example`) — DB, `APP_URL`, uploads dir, SMS/payment keys.

---

## 🎛️ Configure it in the admin

Almost everything is editable without code, from **/admin**:

- **Appearance → Theme & Layout / Custom Code** — full design control
- **Content → Homepage / Homepage Templates / Pages / Blog / Recipes / Menus**
- **Configuration → Payments / SMS / Social Login / SEO / Settings / Modules**
- **Sales → Orders / Coupons / Shipping / Delivery Areas**
- **System → Setup Wizard / Starter Templates / Help & Docs / Restore Defaults**

To sell something else entirely: **Starter Templates** (one-click Fashion/Electronics/Grocery/Restaurant/Beauty/Home) or manually swap branding, categories, products, currency and theme.

---

## 📧 Self-hosted email (no third-party service)

The platform runs its **own mail server** — transactional sending *and* receiving —
with no Resend/SendGrid/Brevo account and no per-email cost. Incoming mail for every
address at your domain is stored in the database and read from a built-in mail client
in the admin panel.

**[→ docs/SELF-HOSTED-EMAIL.md](docs/SELF-HOSTED-EMAIL.md)** — a complete, reusable
technical guide: Postfix + OpenDKIM setup, SPF/DKIM/DMARC, routing inbound mail into
Postgres, app integration, verification steps, and the non-obvious gotchas
(duplicate SPF records, the localhost TLS trap, `relay_domains` vs `mydestination`).
It is domain-agnostic — drop it onto any project.

## 🧩 Extending (for developers)

There's a full **Developer** section inside the admin (**Help & Docs**). In short:

- **New admin page** → a `src/routes/admin.<name>.tsx` route + a nav entry in `src/routes/admin.tsx`
- **New data** → a Drizzle table in `src/server/db/schema.ts` (run `npm run db:push`) + server functions in `src/lib/<name>.functions.ts` using `createServerFn` with `requireStaff/requireManager` guards + zod validation
- **New config** → a `settings` (jsonb) key via the `src/server/site-config.ts` pattern
- **New theme preset** → add to `THEME_PRESETS` / the generated gallery in `src/lib/theme-presets.ts`
- **Feature on/off** → a Module toggle

**Server code stays server-side** via dynamic `import("@/server/...")` inside server functions — it never ships to the client.

## 📜 Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Dev server |
| `npm run build` | Production build to `.output/` |
| `npm run start` | Run the built Node server |
| `npm run db:generate` | Generate a migration from the schema |
| `npm run db:migrate` / `db:push` | Apply migrations / push schema |
| `npm run db:seed` | Seed catalog + default admin |

---

## 🔒 Security

- Passwords hashed with **scrypt**; opaque **HttpOnly** session cookies (Secure in prod)
- **Role guards** + **zod validation** on every admin/server function
- Prices, stock, coupons and delivery coverage are **recomputed server-side** (client values ignored)
- IP-ban enforcement; sanitized custom code (front-end only)
- By design there is **no admin editor for server-side code / no uploadable-code plugins** — that would be remote code execution. Extend via the codebase + redeploy instead.

---

## 📄 License

MIT — see [LICENSE](./LICENSE). Free for commercial and personal use.
