import { cookies } from "next/headers";
import type { NextResponse } from "next/server";
import { logAuthEvent } from "@/lib/auth/audit";
import { isProduction } from "@/lib/env";
import { getPlatformSettings } from "@/lib/services/platform-settings";
import { prisma } from "@/lib/db/prisma";
import { storeNotDeletedWhere } from "@/lib/db/store-scope";

export const IMPERSONATION_COOKIE_NAME = "fineset-impersonate-store";

/** 1 hour */
export const IMPERSONATION_MAX_AGE_SECONDS = 60 * 60;

export function isImpersonationAllowed(): boolean {
  if (process.env.ALLOW_ADMIN_IMPERSONATION === "true") return true;
  if (process.env.ALLOW_ADMIN_IMPERSONATION === "false") return false;
  return !isProduction();
}

export async function isImpersonationAllowedForPlatform(): Promise<boolean> {
  try {
    const settings = await getPlatformSettings();
    if (settings.security.impersonationOverride === true) return true;
    if (settings.security.impersonationOverride === false) return false;
  } catch {
    // Fall through to env default when settings table is unavailable.
  }
  return isImpersonationAllowed();
}

function impersonationCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: isProduction(),
    path: "/",
    maxAge: IMPERSONATION_MAX_AGE_SECONDS,
  };
}

export async function getImpersonatedStoreIdFromCookie(): Promise<string | null> {
  const cookieStore = await cookies();
  const value = cookieStore.get(IMPERSONATION_COOKIE_NAME)?.value?.trim();
  return value || null;
}

export async function setImpersonationCookieOnResponse(
  response: NextResponse,
  storeId: string,
): Promise<void> {
  response.cookies.set(IMPERSONATION_COOKIE_NAME, storeId, impersonationCookieOptions());
}

export async function clearImpersonationCookieOnResponse(
  response: NextResponse,
): Promise<void> {
  response.cookies.delete(IMPERSONATION_COOKIE_NAME);
}

export async function clearImpersonationCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(IMPERSONATION_COOKIE_NAME);
}

export async function validateImpersonationStore(storeId: string): Promise<boolean> {
  const store = await prisma.store.findFirst({
    where: { ...storeNotDeletedWhere, id: storeId },
    select: { id: true },
  });
  return Boolean(store);
}

export async function startImpersonation(params: {
  storeId: string;
  adminEmail: string;
  adminAuthId?: string | null;
}): Promise<{ storeId: string; storeName: string } | null> {
  const store = await prisma.store.findFirst({
    where: { ...storeNotDeletedWhere, id: params.storeId },
    select: { id: true, name: true },
  });
  if (!store) return null;

  await logAuthEvent({
    event: "IMPERSONATE_START",
    email: params.adminEmail,
    authId: params.adminAuthId,
    metadata: { storeId: store.id, storeName: store.name },
  });

  return { storeId: store.id, storeName: store.name };
}

export async function stopImpersonation(params: {
  adminEmail: string;
  adminAuthId?: string | null;
  storeId?: string | null;
}): Promise<void> {
  await logAuthEvent({
    event: "IMPERSONATE_STOP",
    email: params.adminEmail,
    authId: params.adminAuthId,
    metadata: params.storeId ? { storeId: params.storeId } : undefined,
  });
}
