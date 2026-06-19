import { getAppSession } from "@/lib/auth/get-app-session";
import type { AppSession } from "@/types";
import { NextResponse } from "next/server";

/** Server-side session from local auth cookie + Prisma AppUser profile. */
export async function getServerSession(): Promise<AppSession | null> {
  return getAppSession();
}

export function unauthorized(message = "Unauthorized"): NextResponse {
  return NextResponse.json({ message }, { status: 401 });
}

export function forbidden(message = "Forbidden"): NextResponse {
  return NextResponse.json({ message }, { status: 403 });
}

export function badRequest(error: unknown, message = "Validation failed"): NextResponse {
  return NextResponse.json({ message, details: error }, { status: 400 });
}

export function notFound(message = "Not found"): NextResponse {
  return NextResponse.json({ message }, { status: 404 });
}

export function requireRole<T extends AppSession["role"]>(
  session: AppSession | null,
  allowed: readonly T[],
): session is Extract<AppSession, { role: T }> {
  return session !== null && (allowed as readonly AppSession["role"][]).includes(session.role);
}
