# Vercel staging deploy (GitHub Actions)

## Why this exists

Vercel **Hobby** cannot auto-deploy from a **private GitHub organization** repository (`tribly-tech/Project-Fineset`) via Git integration. You may see:

```text
Cannot deploy from a private GitHub organization repository on the Hobby plan
```

**Staging** (and future pushes) deploy through **GitHub Actions** + Vercel CLI instead. Production can use the same pattern later if Git integration is blocked on `main`.

Workflow: [`.github/workflows/vercel-staging.yml`](../.github/workflows/vercel-staging.yml)

Official reference: [Vercel + GitHub Actions](https://vercel.com/guides/how-can-i-use-github-actions-with-vercel)

---

## One-time setup (about 5 minutes)

### 1. Create a Vercel access token

1. Open [Vercel Account → Tokens](https://vercel.com/account/tokens)
2. Create a token (e.g. `github-actions-staging`)
3. Copy the value — you will not see it again

### 2. Get Org ID and Project ID

In the project folder on your laptop:

```powershell
npx vercel login
npx vercel link
```

Select the **existing** FineSet project (same as `mystore.tribly.ai`).

Open `.vercel/project.json` (local only — never commit):

| Field in JSON | GitHub secret name |
|---------------|-------------------|
| `orgId` | `VERCEL_ORG_ID` |
| `projectId` | `VERCEL_PROJECT_ID` |

### 3. Add GitHub repository secrets

GitHub → **tribly-tech/Project-Fineset** → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**

| Secret | Value |
|--------|-------|
| `VERCEL_TOKEN` | Token from step 1 |
| `VERCEL_ORG_ID` | `orgId` from step 2 |
| `VERCEL_PROJECT_ID` | `projectId` from step 2 |

### 3b. Staging app env (Preview / GitHub secrets)

Staging uses the **jewelry-analytics** Supabase project (`qkfldqzowkcucfdulozc`), not production.

**Easiest path** — upload from your laptop (reads `.env.staging.local` + `GEMINI_API_KEY` from `.env.local.db`):

```powershell
gh auth login
.\scripts\set-staging-github-secrets.ps1
```

Then GitHub → **Actions** → **Sync Staging Preview Env** → **Run workflow** (pushes vars to Vercel Preview on the tribly-tech project).

On every `staging` push, [`.github/workflows/vercel-staging.yml`](../.github/workflows/vercel-staging.yml) also injects these secrets at build time.

| GitHub secret | Copy from |
|---------------|-----------|
| `STAGING_DATABASE_URL` | `.env.staging.local` → `DATABASE_URL` |
| `STAGING_DIRECT_URL` | `.env.staging.local` → `DIRECT_URL` |
| `STAGING_NEXT_PUBLIC_SUPABASE_URL` | `.env.staging.local` |
| `STAGING_NEXT_PUBLIC_SUPABASE_ANON_KEY` | `.env.staging.local` |
| `STAGING_SUPABASE_SERVICE_ROLE_KEY` | `.env.staging.local` |
| `STAGING_ENCRYPTION_KEY` | `.env.staging.local` |
| `STAGING_GEMINI_API_KEY` | `.env.local.db` → `GEMINI_API_KEY` |

`NEXT_PUBLIC_APP_URL` is set automatically to `https://fineset.staging.tribly.ai`.

**Manual alternative** — Vercel → **project-fineset** (tribly-tech team) → **Settings** → **Environment Variables** → scope **Preview** only. Paste the same keys/values.

### 4. Optional — stable staging URL

Vercel → Project → **Settings** → **Domains** → assign the **`staging`** branch preview to a domain (e.g. `staging.tribly.ai`).

Otherwise use the default preview URL: `project-name-git-staging-*.vercel.app` (shown in each deployment).

---

## Deploy staging

Push to the `staging` branch:

```powershell
git push origin staging
```

Or re-run **Vercel Staging Deployment** from the GitHub **Actions** tab.

---

## Verify success

1. **GitHub** → Actions → **Vercel Staging Deployment** → green check
2. **Vercel** → Deployments → new **Preview** from branch `staging`
3. Open the preview URL → login / smoke test

The red **Vercel** Git check on commits may still appear (Hobby + org Git integration). **Ignore it** once the GitHub Action deploy succeeds.

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Workflow fails immediately: missing secrets | Add all three secrets in step 3 |
| Build fails: missing env vars | Vercel → Project → Settings → Environment Variables → ensure **Preview** has the same vars as Production |
| Wrong project deployed | Re-run `vercel link`, update `VERCEL_PROJECT_ID` secret |
| Login fails on staging URL | Add staging URL to Supabase Auth redirect URLs |
| Staging URL returns **401 Authentication Required** | Vercel → project-fineset → **Deployment Protection** → allow team access or disable for Preview |
| AI Analytics shows "server rules" not Gemini | Add `GEMINI_API_KEY` to **Preview** env (not Production) |

---

## Preview environment variables (staging Supabase + Gemini)

Scope **Preview** only on the **tribly-tech** `project-fineset` project (the domain `fineset.staging.tribly.ai` is not on a personal Hobby project).

Minimum vars: `DATABASE_URL`, `DIRECT_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `ENCRYPTION_KEY`, `NEXT_PUBLIC_APP_URL` (`https://fineset.staging.tribly.ai`), `GEMINI_API_KEY`.

From a machine linked to the tribly-tech Vercel team:

```powershell
npx vercel login
npx vercel link --project project-fineset
node scripts/sync-staging-vercel-preview-env.mjs
```

Supabase Auth URLs for jewelry-analytics (`qkfldqzowkcucfdulozc`):

```powershell
node scripts/configure-staging-supabase-auth.mjs
```

---

## Production note

Production uses [`.github/workflows/vercel-production.yml`](../.github/workflows/vercel-production.yml) on `main`/`master` with `--environment=production` and `vercel build --prod` / `vercel deploy --prebuilt --prod`. [`vercel.json`](../vercel.json) disables Vercel Git auto-deploy for `main` and `staging` so GitHub Actions is the single deploy path on Hobby.
