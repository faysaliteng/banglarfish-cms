# Banglarfish — VPS Deployment Guide

Self-hosted, no third-party runtime dependencies. The app is a single Node
process (TanStack Start built to a nitro **node-server**) talking to a local
**PostgreSQL** database. No Supabase, no Lovable, no Cloudflare.

```
Internet ──> nginx (443, TLS via certbot)
                ├── /uploads/*  → files on disk (/var/www/banglarfish/uploads)
                └── /*          → Node server on 127.0.0.1:3000  (systemd)
                                     └── PostgreSQL 16 (localhost)
```

## Stack

- **Frontend + SSR:** React 19 + TanStack Start (Vite), built to `.output/`.
- **Server:** `node .output/server/index.mjs` (nitro `node-server` preset).
- **Database:** PostgreSQL 16, accessed with Drizzle ORM (`pg` driver).
- **Auth:** self-hosted email/password with `scrypt` hashing + opaque cookie
  sessions (`sessions` table). Phone verification on signup via **Boomcast SMS OTP**.
- **File storage:** local disk under `$UPLOAD_DIR`, served by nginx at `/uploads`.

## One-command setup (recommended)

On a fresh Ubuntu VPS, from the project root:

```bash
sudo DOMAIN=banglarfish.com bash deploy/setup.sh
```

This installs Node 20 + PostgreSQL + nginx + certbot, creates the DB and role,
copies the app to `/var/www/banglarfish`, writes `.env`, `npm ci && npm run build`,
runs migrations + seed, installs the systemd service, and configures nginx.
It prints the generated DB password and the admin login. Then add TLS:

```bash
sudo certbot --nginx -d banglarfish.com -d www.banglarfish.com
```

## Manual setup

1. **Install prerequisites:** Node 20+, PostgreSQL 16, nginx, certbot.
2. **Create the database:**
   ```bash
   sudo -u postgres psql -c "CREATE ROLE banglarfish LOGIN PASSWORD 'yourpassword';"
   sudo -u postgres psql -c "CREATE DATABASE banglarfish OWNER banglarfish;"
   ```
3. **Configure env:** `cp .env.example .env` and set `DATABASE_URL` (and, when
   ready, the `BOOMCAST_*` SMS credentials; set `SMS_DEV_MODE=false`).
4. **Build:**
   ```bash
   npm ci
   npm run build
   ```
5. **Migrate + seed:**
   ```bash
   npm run db:migrate    # applies drizzle/0000_init.sql
   npm run db:seed       # seeds catalog + creates the default admin (prints login)
   ```
6. **Run:** `npm run start` (or install `deploy/banglarfish.service` and
   `systemctl enable --now banglarfish`).
7. **nginx:** copy `deploy/nginx.conf` to `/etc/nginx/sites-available/banglarfish`,
   symlink into `sites-enabled`, `nginx -t && systemctl reload nginx`, then certbot.

## Environment variables

See `.env.example` for the full list. The ones that matter:

| Var | Purpose |
|-----|---------|
| `DATABASE_URL` | Postgres connection string (**required**) |
| `PORT` | Node listen port (default 3000; nginx proxies to it) |
| `UPLOAD_DIR` | Where media uploads are written (nginx serves `/uploads` from here) |
| `SMS_DEV_MODE` | `true` = log OTP to server console; `false` = send via Boomcast |
| `BOOMCAST_*` | Boomcast SMS gateway credentials/endpoint |
| `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` | Default admin created by `db:seed` |

## First admin login

`npm run db:seed` creates an admin from `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`
(defaults `admin@banglarfish.com` / `ChangeMe#2026`). Sign in at `/auth`, then
change the password under **Account → Security**. Roles are `customer`, `staff`,
`manager`, `admin` — grant them from **Admin → Users**.

## Boomcast SMS OTP

Signup requires a phone OTP delivered by Boomcast. Until you set `BOOMCAST_API_KEY`
(and `SMS_DEV_MODE=false`), codes are logged to the server console so you can test
signup without SMS credits. The gateway request is fully configurable via the
`BOOMCAST_*` vars in case your account uses different parameter names.

## Updating

```bash
git pull
npm ci && npm run build
npm run db:migrate      # if the schema changed
sudo systemctl restart banglarfish
```

## Backups

Daily `pg_dump` via cron:

```cron
0 3 * * *  pg_dump -U banglarfish banglarfish | gzip > /var/backups/banglarfish-$(date +\%F).sql.gz
```

## Schema changes

Edit `src/server/db/schema.ts`, then:

```bash
npm run db:generate     # writes a new migration into drizzle/
npm run db:migrate      # applies it
```
