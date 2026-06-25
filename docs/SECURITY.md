# Security model

FineSet enforces multi-tenancy at the **application layer**. Every API route and service checks session role and store scope before reading or mutating data.

## Tenant isolation

- **Store scoping** — staff, store manager, and business owner sessions are bound to `AppUser.storeId`. Services reject cross-store access.
- **Business owner scope** — owners may manage multiple stores linked to their email; queries filter by resolved store membership.
- **Admin scope** — `MASTER_ADMIN` and `PLATFORM_ADMIN` bypass store filters only on explicit admin routes.

Integration tests in `tests/integration/store-scoping.test.ts`, `tests/integration/auth-security.test.ts`, and `tests/integration/billing-payment-submissions.test.ts` cover critical paths.

## Authentication

- Passwords live in `AppUser.passwordHash` (bcrypt).
- Sessions are signed httpOnly cookies (`AUTH_SECRET`).
- Edge middleware (`proxy.ts`) rejects unauthenticated access to protected portal and API prefixes.

## Encryption

Customer PII is encrypted at the application layer with `ENCRYPTION_KEY`. Phone numbers are hashed for deduplication.

## Rate limiting

Production enables Upstash Redis rate limits when `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` are set. Set `ENABLE_RATE_LIMIT=true` locally to exercise limits.

## Error monitoring

Set `SENTRY_DSN` in production to capture unhandled API, auth, and billing failures server-side.

## Postgres RLS (optional, deferred)

Row-level security in PostgreSQL is **not enabled** today. Prisma uses a single database role, so RLS would require:

1. A restricted DB role for runtime queries.
2. `SET LOCAL app.store_id = …` on every request (Prisma extension or `$transaction` wrapper).
3. Policies on tenant tables (`Customer`, `Visit`, `Staff`, etc.).

This remains a defense-in-depth option for self-hosted deployments. App-layer checks are the primary control and are covered by integration tests.
