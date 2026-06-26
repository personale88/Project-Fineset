const BLOCKED_HOST_FRAGMENTS = [
  "supabase.co",
  "pooler.supabase.com",
  "railway.app",
  "neon.tech",
];

function allowsRemoteIntegrationDatabase(): boolean {
  const flag = process.env.INTEGRATION_ALLOW_REMOTE_DATABASE?.trim().toLowerCase();
  return flag === "1" || flag === "true" || flag === "yes";
}

export function assertSafeTestDatabase(): void {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) return;

  let host = "";
  try {
    host = new URL(url.replace(/^postgresql:/, "http:")).hostname;
  } catch {
    throw new Error(`Refusing integration tests: invalid DATABASE_URL (${url})`);
  }

  if (BLOCKED_HOST_FRAGMENTS.some((fragment) => host.includes(fragment))) {
    if (allowsRemoteIntegrationDatabase()) {
      console.warn(
        `[integration] Running against remote database (${host}) — INTEGRATION_ALLOW_REMOTE_DATABASE is set.`,
      );
      return;
    }
    throw new Error(
      `Refusing integration tests against remote database (${host}). ` +
        "Use local Postgres, e.g. postgresql://fineset:fineset@localhost:5432/fineset_test, " +
        "or set INTEGRATION_ALLOW_REMOTE_DATABASE=1 to run against an approved remote database.",
    );
  }

  if (host !== "localhost" && host !== "127.0.0.1") {
    if (allowsRemoteIntegrationDatabase()) {
      console.warn(
        `[integration] Running against remote database (${host}) — INTEGRATION_ALLOW_REMOTE_DATABASE is set.`,
      );
      return;
    }
    throw new Error(
      `Refusing integration tests against non-local database host: ${host}`,
    );
  }
}
