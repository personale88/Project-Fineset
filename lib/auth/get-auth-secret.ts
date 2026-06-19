/** Session signing secret — AUTH_SECRET or legacy NEXTAUTH_SECRET. */
export function getAuthSecret(): string {
  const secret =
    process.env.AUTH_SECRET?.trim() ?? process.env.NEXTAUTH_SECRET?.trim();
  if (!secret) {
    throw new Error("AUTH_SECRET is not configured");
  }
  return secret;
}
