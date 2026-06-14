import { NextResponse } from "next/server";
import { handleRouteError } from "@/lib/api/route-handler";
import {
  clearDevSessionCookie,
  getDevSessionFromCookies,
  isDevAuthBypassEnabled,
} from "@/lib/auth/dev-bypass";
import { logAuthEvent } from "@/lib/auth/audit";
import { createClient } from "@/lib/supabase/server";

export async function POST() {
  try {
    if (isDevAuthBypassEnabled()) {
      const devSession = await getDevSessionFromCookies();
      await clearDevSessionCookie();

      if (devSession?.email) {
        await logAuthEvent({
          event: "LOGOUT",
          email: devSession.email,
          metadata: { devBypass: true },
        });
      }

      return NextResponse.json({ success: true });
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    await supabase.auth.signOut();

    if (user?.email) {
      await logAuthEvent({
        event: "LOGOUT",
        authId: user.id,
        email: user.email,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleRouteError(error);
  }
}
