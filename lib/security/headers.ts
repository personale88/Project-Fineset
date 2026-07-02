export type SecurityHeader = { key: string; value: string };

function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

function appOrigin(): string | null {
  const raw = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (!raw) return null;
  try {
    return new URL(raw).origin;
  } catch {
    return null;
  }
}

/**
 * Content-Security-Policy tuned for Next.js App Router (inline styles/scripts).
 * Tighten further when nonce-based CSP is adopted.
 */
export function buildContentSecurityPolicy(): string {
  const origin = appOrigin() ?? "'self'";
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const connectSrc = ["'self'", origin];
  if (supabaseUrl) {
    try {
      const host = new URL(supabaseUrl).host;
      connectSrc.push(`https://${host}`, `wss://${host}`);
    } catch {
      // ignore invalid supabase url
    }
  }

  return [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline'${isProduction() ? "" : " 'unsafe-eval'"}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    `connect-src ${connectSrc.join(" ")}`,
    "font-src 'self' data:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests",
  ].join("; ");
}

export function buildSecurityHeaders(): SecurityHeader[] {
  const headers: SecurityHeader[] = [
    { key: "X-Frame-Options", value: "DENY" },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    {
      key: "Permissions-Policy",
      value: "camera=(), microphone=(), geolocation=(self), payment=()",
    },
    { key: "Content-Security-Policy", value: buildContentSecurityPolicy() },
  ];

  if (isProduction()) {
    headers.push({
      key: "Strict-Transport-Security",
      value: "max-age=63072000; includeSubDomains; preload",
    });
  }

  return headers;
}
