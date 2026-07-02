import { type NextRequest, NextResponse } from "next/server";
import { applyExpiredSessionRedirectParams } from "@/lib/auth/redirect-to-sign-in";
import {
  clearSessionCookie,
  getSessionTokenFromCookies,
} from "@/lib/auth/session-cookie";

export async function GET(request: NextRequest) {
  const token = await getSessionTokenFromCookies();

  if (token) {
    await clearSessionCookie();
  }

  const destination = new URL("/", request.url);
  applyExpiredSessionRedirectParams(destination, {
    hadSessionToken: Boolean(token),
    role: undefined,
  });

  return NextResponse.redirect(destination);
}
