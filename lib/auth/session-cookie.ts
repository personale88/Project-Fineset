import { cookies } from "next/headers";
import type { NextRequest, NextResponse } from "next/server";
import { isProduction } from "@/lib/env";

export const SESSION_COOKIE_NAME = "fineset-session";

/** 30 days */
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

export function getSessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: isProduction(),
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  };
}

export async function getSessionTokenFromCookies(): Promise<string | null> {
  const cookieStore = await cookies();
  const value = cookieStore.get(SESSION_COOKIE_NAME)?.value?.trim();
  return value || null;
}

export function getSessionTokenFromRequest(request: NextRequest): string | null {
  const value = request.cookies.get(SESSION_COOKIE_NAME)?.value?.trim();
  return value || null;
}

export async function setSessionCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, getSessionCookieOptions());
}

export function setSessionCookieOnResponse(
  response: NextResponse,
  token: string,
): void {
  response.cookies.set(SESSION_COOKIE_NAME, token, getSessionCookieOptions());
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

export function clearSessionCookieOnResponse(response: NextResponse): void {
  response.cookies.delete(SESSION_COOKIE_NAME);
}
