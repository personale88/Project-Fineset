# Vercel staging deploy (GitHub Actions)

## Why this exists

Vercel **Hobby** cannot auto-deploy from a **private GitHub organization** repository (`tribly-tech/Project-Fineset`) via Git integration. You may see:

```text
Cannot deploy from a private GitHub organization repository on the Hobby plan
```

**Staging** deploys through **GitHub Actions** + Vercel CLI. Staging **environment variables live in GitHub Actions secrets** — you do **not** need to paste them into the Vercel dashboard.

Workflow: [`.github/workflows/vercel-staging.yml`](../.github/workflows/vercel-staging.yml)

---

## One-time setup

### 1. Vercel deploy secrets (already set)

GitHub → **tribly-tech/Project-Fineset** → **Settings** → **Secrets and variables** → **Actions**

| Secret | Purpose |
|--------|---------|
| `VERCEL_TOKEN` | Vercel API token for deploy |
| `VERCEL_ORG_ID` | tribly-tech team / org id |
| `VERCEL_PROJECT_ID` | `project-fineset` id |

### 2. Staging app secrets (add these)

Staging uses **jewelry-analytics** Supabase (`qkfldqzowkcucfdulozc`), **not** production.

| GitHub secret | Copy from |
|---------------|-----------|
| `STAGING_DATABASE_URL` | `.env.staging.local` → `DATABASE_URL` |
| `STAGING_DIRECT_URL` | `.env.staging.local` → `DIRECT_URL` |
| `STAGING_NEXT_PUBLIC_SUPABASE_URL` | `.env.staging.local` |
| `STAGING_NEXT_PUBLIC_SUPABASE_ANON_KEY` | `.env.staging.local` |
| `STAGING_SUPABASE_SERVICE_ROLE_KEY` | `.env.staging.local` |
| `STAGING_ENCRYPTION_KEY` | `.env.staging.local` |
| `STAGING_GEMINI_API_KEY` | `.env.local.db` → `GEMINI_API_KEY` |

`NEXT_PUBLIC_APP_URL` is set automatically to `https://fineset.staging.tribly.ai` during the workflow.

**Upload from your laptop** (optional script):

```powershell
gh auth login
.\scripts\set-staging-github-secrets.ps1
```

Or paste each secret manually in the GitHub UI.

On every `staging` push, the workflow writes these into `.vercel/.env.preview.local` before `vercel build`, so the deployed preview gets staging DB + Gemini without any Vercel env-var UI step.

### 3. Supabase Auth URLs (still required for login)

[jewelry-analytics → Auth → URL configuration](https://supabase.com/dashboard/project/qkfldqzowkcucfdulozc/auth/url-configuration)

- **Site URL:** `https://fineset.staging.tribly.ai`
- **Redirect URLs:** `https://fineset.staging.tribly.ai/**`, `http://localhost:3000/**`

```powershell
node scripts/configure-staging-supabase-auth.mjs
```

---

## Deploy staging

```powershell
git push origin staging
```

Or re-run **Vercel Staging Deployment** from GitHub **Actions**.

---

## Verify

1. GitHub → Actions → **Vercel Staging Deployment** → green check
2. `https://fineset.staging.tribly.ai/api/auth/config-check` → `"ok": true`, staging `databaseHost` (`qkfldqzowkcucfdulozc`)
3. Login `staging-admin@test.com` / `Staging@123` → Admin → Analytics → **Analyze** → **"Analysis enhanced with Gemini."**

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Workflow fails: missing staging secrets | Add all `STAGING_*` secrets in step 2 |
| Workflow fails: missing Vercel secrets | Add `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` |
| Login fails on staging URL | Add staging redirect URLs in Supabase (step 3) |
| Staging URL returns **401** | Vercel Deployment Protection — log in via Vercel SSO or disable for Preview |
| AI Analytics uses server rules | Check `STAGING_GEMINI_API_KEY` is set in GitHub secrets |

---

## Production note

Production uses [`.github/workflows/vercel-production.yml`](../.github/workflows/vercel-production.yml) on `main`/`master`. [`vercel.json`](../vercel.json) disables Vercel Git auto-deploy for `main` and `staging`.
