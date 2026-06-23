/**
 * Supabase/Railway often set DIRECT_URL to the :6543 transaction pooler.
 * Prisma migrate and directUrl need the :5432 session/direct connection.
 */
export function deriveDirectUrlFromDatabaseUrl(databaseUrl: string): string {
  try {
    const url = new URL(databaseUrl);
    if (url.port === "6543") {
      url.port = "5432";
    }
    url.searchParams.delete("pgbouncer");
    url.searchParams.delete("connection_limit");
    const normalized = url.toString();
    return normalized.endsWith("?") ? normalized.slice(0, -1) : normalized;
  } catch {
    return databaseUrl
      .replace(":6543", ":5432")
      .replace(/([?&])pgbouncer=true&?/g, "$1")
      .replace(/([?&])connection_limit=[0-9]+&?/g, "$1")
      .replace(/[?&]$/, "");
  }
}

export function applyDirectUrlNormalization(
  env: NodeJS.ProcessEnv = process.env,
): void {
  const databaseUrl = env.DATABASE_URL?.trim();
  const directUrl = env.DIRECT_URL?.trim();

  if (directUrl) {
    const normalized = deriveDirectUrlFromDatabaseUrl(directUrl);
    if (normalized !== directUrl) {
      env.DIRECT_URL = normalized;
    }
    return;
  }

  if (databaseUrl) {
    env.DIRECT_URL = deriveDirectUrlFromDatabaseUrl(databaseUrl);
  }
}

export function logDatabaseTarget(label: string, connectionUrl: string): void {
  try {
    const url = new URL(connectionUrl);
    console.log(
      `[db] ${label}: ${url.hostname}:${url.port || "5432"}/${url.pathname.replace(/^\//, "")}`,
    );
  } catch {
    console.log(`[db] ${label}: (configured)`);
  }
}
