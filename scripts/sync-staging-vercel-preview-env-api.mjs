/**
 * Push staging Preview env vars to Vercel via REST API (tribly-tech project).
 * Uses VERCEL_TOKEN, VERCEL_ORG_ID, VERCEL_PROJECT_ID + STAGING_* secrets.
 *
 * Run in GitHub Actions (workflow_dispatch) or locally with env vars set.
 */
const STAGING_APP_URL = "https://fineset.staging.tribly.ai";
const PROD_DB_REF = "mfqpccrzfrptpiclafzu";

const ENTRIES = [
  ["DATABASE_URL", "STAGING_DATABASE_URL"],
  ["DIRECT_URL", "STAGING_DIRECT_URL"],
  ["NEXT_PUBLIC_SUPABASE_URL", "STAGING_NEXT_PUBLIC_SUPABASE_URL"],
  ["NEXT_PUBLIC_SUPABASE_ANON_KEY", "STAGING_NEXT_PUBLIC_SUPABASE_ANON_KEY"],
  ["SUPABASE_SERVICE_ROLE_KEY", "STAGING_SUPABASE_SERVICE_ROLE_KEY"],
  ["ENCRYPTION_KEY", "STAGING_ENCRYPTION_KEY"],
  ["GEMINI_API_KEY", "STAGING_GEMINI_API_KEY"],
  ["NEXT_PUBLIC_APP_URL", null],
];

async function listEnv(token, projectId, teamId) {
  const url = `https://api.vercel.com/v9/projects/${projectId}/env?teamId=${teamId}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`list env failed: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return data.envs ?? [];
}

async function deleteEnv(token, projectId, teamId, envId) {
  const url = `https://api.vercel.com/v9/projects/${projectId}/env/${envId}?teamId=${teamId}`;
  const res = await fetch(url, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok && res.status !== 404) {
    throw new Error(`delete env ${envId} failed: ${res.status} ${await res.text()}`);
  }
}

async function createEnv(token, projectId, teamId, key, value) {
  const url = `https://api.vercel.com/v10/projects/${projectId}/env?teamId=${teamId}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      key,
      value,
      type: "encrypted",
      target: ["preview"],
    }),
  });
  if (!res.ok) throw new Error(`create ${key} failed: ${res.status} ${await res.text()}`);
}

async function main() {
  const token = process.env.VERCEL_TOKEN?.trim();
  const projectId = process.env.VERCEL_PROJECT_ID?.trim();
  const teamId = process.env.VERCEL_ORG_ID?.trim();
  if (!token || !projectId || !teamId) {
    throw new Error("Need VERCEL_TOKEN, VERCEL_PROJECT_ID, VERCEL_ORG_ID");
  }

  const databaseUrl = process.env.STAGING_DATABASE_URL?.trim();
  if (!databaseUrl) {
    throw new Error("STAGING_DATABASE_URL not set");
  }
  if (databaseUrl.includes(PROD_DB_REF)) {
    throw new Error(`STAGING_DATABASE_URL contains production ref ${PROD_DB_REF}`);
  }

  const existing = await listEnv(token, projectId, teamId);
  const previewKeys = new Set(ENTRIES.map(([k]) => k));

  for (const env of existing) {
    if (!previewKeys.has(env.key)) continue;
    if (!env.target?.includes("preview")) continue;
    await deleteEnv(token, projectId, teamId, env.id);
    console.log(`Removed old Preview ${env.key}`);
  }

  for (const [vercelKey, secretKey] of ENTRIES) {
    const value =
      vercelKey === "NEXT_PUBLIC_APP_URL"
        ? STAGING_APP_URL
        : process.env[secretKey]?.trim();
    if (!value) throw new Error(`Missing ${secretKey ?? vercelKey}`);
    await createEnv(token, projectId, teamId, vercelKey, value);
    console.log(`Set Preview ${vercelKey}`);
  }

  console.log("Vercel Preview env synced. Redeploy staging if needed.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
