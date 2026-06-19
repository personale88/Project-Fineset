import { NextResponse } from "next/server";
import { handleRouteError } from "@/lib/api/route-handler";
import { logAuthEvent } from "@/lib/auth/audit";
import {
  clearSessionCookie,
  getSessionTokenFromCookies,
} from "@/lib/auth/session-cookie";
import { deleteSessionByToken } from "@/lib/auth/session-store";
import { getAppSession } from "@/lib/auth/get-app-session";

export async function POST() {
  try {
    const token = await getSessionTokenFromCookies();
    const session = await getAppSession();

    if (token) {
      await deleteSessionByToken(token);
    }

    await clearSessionCookie();

    if (session?.email) {
      await logAuthEvent({
        event: "LOGOUT",
        email: session.email,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleRouteError(error);
  }
}
