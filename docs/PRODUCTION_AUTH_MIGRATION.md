# Production auth migration (Supabase → local auth)

Use this when you already have business data in PostgreSQL and are deploying the Supabase-free auth stack.

## What changes for existing users

- **Business data is untouched** — stores, staff, customers, visits, etc. stay as-is.
- **Login mechanism changes** — passwords move from Supabase Auth to `AppUser.passwordHash`.
- **Existing `AppUser` rows remain** — they need a password hash before they can sign in again.

## Before deploy

1. **Backup production database** (pg_dump or your provider snapshot).
2. **Set new env vars** on the production server:
   - `AUTH_SECRET` — `openssl rand -base64 32`
   - `SMTP_*` — for invite and forgot-password email
   - Remove: `NEXT_PUBLIC_SUPABASE_*`, `SUPABASE_SERVICE_ROLE_KEY`, `DEV_AUTH_BYPASS`
3. Keep `DATABASE_URL`, `DIRECT_URL`, `ENCRYPTION_KEY`, `NEXT_PUBLIC_APP_URL` unchanged.

## Deploy steps

```bash
# On production (with .env.production or your env file loaded)
npm ci
dotenv -e .env.production -- npx prisma migrate deploy
dotenv -e .env.production -- npm run auth:bootstrap
npm run build
# restart your app process
```

`auth:bootstrap` sets/updates the MASTER_ADMIN password from `MASTER_ADMIN_EMAIL` / `MASTER_ADMIN_PASSWORD`.

## Other users (store managers, staff)

Each `AppUser` without `passwordHash` cannot log in until they set a password:

| Option | When to use |
|--------|-------------|
| **Forgot password** (SMTP) | User has access to their email — preferred |
| **`npm run auth:reset-password`** | Admin resets a specific user from CLI |
| **`auth:bootstrap-dev`** | Dev/staging seeded accounts only |

Example CLI reset:

```bash
dotenv -e .env.production -- npm run auth:reset-password -- user@store.com 'NewSecurePass1!'
```

## Verify after deploy

```bash
curl https://your-domain/api/auth/config-check
# Expect: databaseConnected, hasAuthSecret, smtpConfigured, storeSchemaOk, customerSchemaOk
```

Manual checks:

- [ ] Admin login works
- [ ] Forgot-password email arrives and reset link works
- [ ] Staff / store manager login after password reset
- [ ] Invite new staff still sends email and activates account

## Rollback

If you must roll back before users change passwords:

1. Redeploy previous app version (still using Supabase Auth).
2. Do **not** revert the migration if `passwordHash` columns were added — they are nullable and harmless to old code.

If migration already ran and you need to stay on old auth temporarily, restore DB from backup taken before migrate.
