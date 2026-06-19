# FineSet — Jewelry Store SaaS

Multi-tenant SaaS platform for jewelry store chains with Staff, Store, and Master Admin portals.

## Tech Stack

- Next.js 16 (App Router) + TypeScript (strict)
- Tailwind CSS + shadcn/ui design system
- Prisma + PostgreSQL
- Local session auth (bcrypt passwords + httpOnly cookie)
- nodemailer SMTP for invites and password reset
- React Query + Server-Sent Events for live sync

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env.local
```

Fill in:

- `DATABASE_URL` / `DIRECT_URL` — PostgreSQL connection (`:5432` for local dev and self-hosted)
- `AUTH_SECRET` — `openssl rand -base64 32`
- `ENCRYPTION_KEY` — `openssl rand -hex 32`
- `NEXT_PUBLIC_APP_URL` — e.g. `http://localhost:3000`
- `SMTP_*` — required for invite and forgot-password emails in production
- `MASTER_ADMIN_EMAIL` / `MASTER_ADMIN_PASSWORD` — first admin bootstrap

Optional:

- `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` — rate limiting

### 3. Set up database

```bash
npm run db:migrate
npm run db:seed
npm run auth:bootstrap
npm run auth:bootstrap-dev
```

`auth:bootstrap` creates the production admin from `MASTER_ADMIN_*` env vars.

`auth:bootstrap-dev` creates dev accounts (after seed) with password `FineSet#1dev`:

| Email | Role |
|-------|------|
| admin@fineset.local | MASTER_ADMIN |
| manager@store-alpha.local | BUSINESS_OWNER |
| store-manager@store-alpha.local | STORE_MANAGER |
| staff-a@store-alpha.local | STAFF |

### 4. Run development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Auth model

- **AppUser.passwordHash** stores bcrypt password hashes.
- **UserSession** stores opaque session tokens (hashed at rest).
- **Prisma `AppUser`** stores role, store assignment, and active status.
- **Staff** table remains for visit attribution (`employeeId`, metrics).
- Admins invite users by email; users set their password via invite link (SMTP).
- Forgot password sends a token link to `/reset-password?token=...`.
- Login uses a **server action** (`signInAction`) — one server round trip, session cookie set before redirect.

### SMTP diagnostics

```bash
npm run auth:diagnose-smtp
```

## Production migration

If you have existing production data, see [docs/PRODUCTION_AUTH_MIGRATION.md](docs/PRODUCTION_AUTH_MIGRATION.md) for cutover steps (migrate DB, bootstrap admin, reset other users via SMTP).

## Performance

Use `npm run perf:diagnostic` or `GET /api/perf/region-check` to measure DB latency. Keep the app server and PostgreSQL in the same region/network.

| Metric | Target (same region) |
|--------|----------------------|
| DB `SELECT 1` | < 100ms |
| `GET /api/visits` (20 rows) | < 600ms |
| Store overview bundle | < 1.5s |

## Project Structure

- `app/` — Routes and API handlers
- `components/` — UI, forms, charts, layouts
- `lib/` — API clients, auth, db, validations, sync, email
- `lib/auth/` — Session, invites, audit, RBAC helpers
- `content/en.ts` — All UI strings
- `prisma/` — Schema, migrations, and seed data

## Scripts

| Script | Description |
|--------|-------------|
| `npm run db:migrate` | Apply migrations |
| `npm run db:seed` | Seed demo stores, staff, visits |
| `npm run auth:bootstrap` | Create MASTER_ADMIN with password hash |
| `npm run auth:bootstrap-dev` | Dev login accounts for seeded data |
| `npm run auth:diagnose-smtp` | Test SMTP configuration |
| `npm run test:e2e` | Playwright smoke tests |
