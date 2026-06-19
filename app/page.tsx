import { LoginScreen } from "@/components/auth/LoginScreen";
import { getAppSession } from "@/lib/auth/get-app-session";
import { getRedirectForRole } from "@/lib/auth/routes";
import { redirect } from "next/navigation";

export default async function HomePage() {
  const session = await getAppSession();
  if (session) {
    redirect(getRedirectForRole(session.role));
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-surface-primary px-page-x py-12">
      <LoginScreen showLogo />
    </main>
  );
}
