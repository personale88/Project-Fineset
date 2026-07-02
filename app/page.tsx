import { LoginScreen } from "@/components/auth/LoginScreen";
import { getAppSession } from "@/lib/auth/get-app-session";
import { getRedirectForRole } from "@/lib/auth/routes";
import { getSessionTokenFromCookies } from "@/lib/auth/session-cookie";
import { redirect } from "next/navigation";

export default async function HomePage() {
  const token = await getSessionTokenFromCookies();
  const session = await getAppSession();
  if (session) {
    redirect(getRedirectForRole(session.role));
  }
  if (token) {
    redirect("/api/auth/clear-stale-session");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-surface-primary px-page-x py-12">
      <LoginScreen showLogo />
    </main>
  );
}
