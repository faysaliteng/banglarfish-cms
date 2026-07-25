# Banglarfish — notes for future contributors / agents

Self-hosted e-commerce platform. No Lovable, no Supabase, no Cloudflare.

## Architecture

- **DB:** PostgreSQL + Drizzle. Schema in `src/server/db/schema.ts`; client in
  `src/server/db/index.ts` (server-only — never import from client/route code;
  the `**/server/**` import-protection guard enforces this).
- **Server logic** lives under `src/server/**` (auth, sessions, OTP, SMS, mappers,
  settings) and is called from `*.functions.ts` server functions in `src/lib/`
  via dynamic `import()` inside handlers.
- **Auth:** `src/server/auth/*` — scrypt password hashing, cookie sessions
  (`sessions` table), role guards (`requireUser/requireStaff/requireManager/requireAdmin`).
  Roles: customer < staff < manager < admin.
- **Server functions** (`src/lib/*.functions.ts`): `auth`, `account`, `catalog`,
  `orders`, `admin-catalog`, `admin-orders`, `admin-users`, `admin-marketing`,
  `admin-content`, `admin-dashboard`, `admin-upload`.
- **Money** is integer BDT (whole taka) everywhere.
- **Order prices are recomputed server-side** in `orders.functions.ts` — never
  trust client-sent prices/totals.

## Workflow

- Change schema → `npm run db:generate` → `npm run db:migrate`.
- `npm run build` regenerates `src/routeTree.gen.ts` and builds the Node server.
- Uploads go to `$UPLOAD_DIR` (served at `/uploads`).

## Deploy

`deploy/` holds `setup.sh`, `nginx.conf`, `banglarfish.service`. See `DEPLOY.md`.
