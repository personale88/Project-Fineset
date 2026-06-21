/**
 * Local development only — skip password verification when DEV_AUTH_BYPASS=true.
 * Never enabled in production builds or on Vercel production.
 */
export function isLocalAuthBypassEnabled(): boolean {
  if (process.env.NODE_ENV === "production") return false;
  if (process.env.VERCEL_ENV === "production") return false;
  return process.env.DEV_AUTH_BYPASS === "true";
}
