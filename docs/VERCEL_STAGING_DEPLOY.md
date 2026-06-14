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

Environment variables for the app stay on **Vercel** (Preview environment). `vercel pull` downloads them during the workflow — do not duplicate DB URLs in GitHub unless you add a separate migrate workflow for staging.

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

---

## Production note

If `main` stops deploying via Vercel Git integration, add a similar workflow for `main` with `--environment=production` and `vercel build --prod` / `vercel deploy --prebuilt --prod`, or upgrade to Vercel Pro.
