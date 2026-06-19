/** Public app base URL for email links and redirects. */
export function getAppBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.trim() ??
    process.env.AUTH_URL?.trim() ??
    process.env.NEXTAUTH_URL?.trim() ??
    "http://localhost:3000"
  );
}
