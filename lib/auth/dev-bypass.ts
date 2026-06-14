import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import {
  appSessionFromProfile,
  type AppUserWithRelations,
} from "@/lib/auth/app-session-from-profile";
import { loadAppUserProfileByEmail } from "@/lib/auth/load-app-user-profile";
import { shouldPromoteToBusinessOwner } from "@/lib/auth/resolve-effective-role";
import { prisma } from "@/lib/db/prisma";
import { shouldUseSecureAuthCookies } from "@/lib/supabase/cookie-options";
import type { AppSession, UserRole } from "@/types";

export const DEV_SESSION_COOKIE = "fineset-dev-session";

const DEV_EMAIL_ROLES: Record<string, UserRole> = {
  "admin@fineset.local": "MASTER_ADMIN",
  "manager@store-alpha.local": "BUSINESS_OWNER",
  "store-manager@store-alpha.local": "STORE_MANAGER",
  "staff-a@store-alpha.local": "STAFF",
};

/** Preferred seeded employee IDs for dev-bypass staff logins. */
const DEV_STAFF_EMPLOYEE_IDS: Record<string, string> = {
  "staff-a@store-alpha.local": "EMP001",
};

const DEV_STORE_MANAGER_EMPLOYEE_IDS: Record<string, string> = {
  "store-manager@store-alpha.local": "MGR001",
};

function getDevEmailRoles(): Record<string, UserRole> {
  const roles = { ...DEV_EMAIL_ROLES };
  const masterEmail = process.env.MASTER_ADMIN_EMAIL?.trim().toLowerCase();
  if (masterEmail) {
    roles[masterEmail] = "MASTER_ADMIN";
  }
  return roles;
}

/** Dev-only auth bypass — never enabled in production. */
export function isDevAuthBypassEnabled(): boolean {
  return (
    process.env.NODE_ENV !== "production" &&
    process.env.DEV_AUTH_BYPASS === "true"
  );
}

/**
 * Role for seeded dev accounts only. Real AppUser emails must resolve via the database.
 * Never defaults unknown emails to MASTER_ADMIN.
 */
export function inferDevRole(email: string): UserRole | null {
  const normalized = email.trim().toLowerCase();
  const mapped = getDevEmailRoles()[normalized];
  if (mapped) return mapped;

  const configured = process.env.DEV_AUTH_ROLE?.trim();
  if (
    configured === "STAFF" ||
    configured === "STORE_MANAGER" ||
    configured === "BUSINESS_OWNER" ||
    configured === "MASTER_ADMIN"
  ) {
    return configured;
  }

  return null;
}

export type DevSessionCookie = {
  email: string;
  role: UserRole;
};

export function parseDevSessionCookie(value: string | undefined): DevSessionCookie | null {
  if (!value) return null;

  try {
    const parsed = JSON.parse(value) as DevSessionCookie;
    if (
      typeof parsed.email === "string" &&
      (parsed.role === "STAFF" ||
        parsed.role === "STORE_MANAGER" ||
        parsed.role === "BUSINESS_OWNER" ||
        parsed.role === "MASTER_ADMIN")
    ) {
      return {
        email: parsed.email.toLowerCase(),
        role: parsed.role,
      };
    }
  } catch {
    return null;
  }

  return null;
}

export function serializeDevSessionCookie(session: DevSessionCookie): string {
  return JSON.stringify({
    email: session.email.toLowerCase(),
    role: session.role,
  });
}

export function getDevSessionFromRequest(request: NextRequest): DevSessionCookie | null {
  if (!isDevAuthBypassEnabled()) return null;
  return parseDevSessionCookie(request.cookies.get(DEV_SESSION_COOKIE)?.value);
}

export async function getDevSessionFromCookies(): Promise<DevSessionCookie | null> {
  if (!isDevAuthBypassEnabled()) return null;
  const cookieStore = await cookies();
  return parseDevSessionCookie(cookieStore.get(DEV_SESSION_COOKIE)?.value);
}

export async function setDevSessionCookie(session: DevSessionCookie): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(DEV_SESSION_COOKIE, serializeDevSessionCookie(session), {
    httpOnly: true,
    sameSite: "lax",
    secure: shouldUseSecureAuthCookies(),
    path: "/",
    maxAge: 60 * 60 * 24 * 400,
  });
}

export async function clearDevSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(DEV_SESSION_COOKIE);
}

async function buildDevStaffSession(email: string): Promise<AppSession> {
  const normalized = email.trim().toLowerCase();
  const preferredEmployeeId = DEV_STAFF_EMPLOYEE_IDS[normalized] ?? "EMP001";

  try {
    const staff =
      (await prisma.staff.findFirst({
        where: {
          employeeId: preferredEmployeeId,
          isActive: true,
          role: "STAFF",
        },
        select: {
          id: true,
          storeId: true,
          name: true,
          employeeId: true,
        },
      })) ??
      (await prisma.staff.findFirst({
        where: { isActive: true, role: "STAFF" },
        select: {
          id: true,
          storeId: true,
          name: true,
          employeeId: true,
        },
        orderBy: { createdAt: "asc" },
      }));

    if (staff) {
      return {
        userId: `dev-staff-${staff.employeeId.toLowerCase()}`,
        email: normalized,
        role: "STAFF",
        staffId: staff.id,
        storeId: staff.storeId,
        name: staff.name,
        employeeId: staff.employeeId,
      };
    }
  } catch (error) {
    console.warn("[dev-bypass] staff session DB lookup skipped", error);
  }

  return buildStaticDevSession(normalized, "STAFF");
}

async function buildDevStoreManagerSession(email: string): Promise<AppSession> {
  const normalized = email.trim().toLowerCase();
  const preferredEmployeeId = DEV_STORE_MANAGER_EMPLOYEE_IDS[normalized];

  try {
    const profile = await loadAppUserProfileByEmail(normalized);
    if (profile?.isActive && profile.role === "STORE_MANAGER" && profile.staffId) {
      const assignedStore =
        profile.staff?.store ?? profile.store;
      const assignedStoreId = profile.staff?.storeId ?? profile.storeId;
      if (assignedStoreId && assignedStore) {
        return {
          userId: profile.id,
          email: normalized,
          role: "STORE_MANAGER",
          storeId: assignedStoreId,
          storeName: assignedStore.name,
        };
      }
    }

    const staff =
      (preferredEmployeeId
        ? await prisma.staff.findFirst({
            where: {
              employeeId: preferredEmployeeId,
              isActive: true,
              role: "STORE_MANAGER",
            },
            select: {
              id: true,
              storeId: true,
              store: { select: { name: true } },
            },
          })
        : null) ??
      (await prisma.staff.findFirst({
        where: {
          isActive: true,
          role: "STORE_MANAGER",
        },
        select: {
          id: true,
          storeId: true,
          store: { select: { name: true } },
        },
        orderBy: { createdAt: "asc" },
      }));

    if (staff?.store) {
      return {
        userId: profile?.id ?? "dev-store-manager",
        email: normalized,
        role: "STORE_MANAGER",
        storeId: staff.storeId,
        storeName: staff.store.name,
      };
    }
  } catch (error) {
    console.warn("[dev-bypass] store manager session DB lookup skipped", error);
  }

  return buildStaticDevSession(normalized, "STORE_MANAGER");
}

/** Static session that never touches the database. */
export function buildStaticDevSession(email: string, role: UserRole): AppSession {
  const normalized = email.trim().toLowerCase();

  switch (role) {
    case "STAFF":
      return {
        userId: "dev-staff-a",
        email: normalized,
        role: "STAFF",
        staffId: "dev-staff-emp001",
        storeId: "dev-store-alpha",
        name: "Vamsi",
        employeeId: "EMP001",
      };
    case "STORE_MANAGER":
      return {
        userId: "dev-store-manager",
        email: normalized,
        role: "STORE_MANAGER",
        storeId: "dev-store-alpha",
        storeName: "Store Alpha",
      };
    case "BUSINESS_OWNER":
      return {
        userId: "dev-business-owner",
        email: normalized,
        role: "BUSINESS_OWNER",
        storeId: "dev-store-alpha",
        storeName: "Store Alpha",
      };
    case "MASTER_ADMIN":
      return {
        userId: "dev-master-admin",
        email: normalized,
        role: "MASTER_ADMIN",
      };
  }
}

async function maybePromoteOwnerProfile(
  profile: AppUserWithRelations,
): Promise<AppUserWithRelations> {
  if (!shouldPromoteToBusinessOwner(profile.role, profile.staffId)) {
    return profile;
  }

  try {
    await prisma.appUser.update({
      where: { id: profile.id },
      data: { role: "BUSINESS_OWNER" },
    });
    return { ...profile, role: "BUSINESS_OWNER" };
  } catch (error) {
    console.warn(
      "[dev-bypass] BUSINESS_OWNER promotion skipped — run prisma migrate deploy",
      profile.id,
      error,
    );
    return profile;
  }
}

/**
 * Process-level cache for resolved dev sessions.
 * A seeded DB doesn't change while the dev server is running, so we can safely
 * keep resolved sessions in memory for the process lifetime.
 * This eliminates repeated DB round-trips to Supabase on every request.
 */
const devSessionCache = new Map<string, AppSession>();

function isPoolTimeoutError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "P2024"
  );
}

async function loadDevSessionFromDb(email: string): Promise<AppSession | null> {
  const databaseUrl = process.env.DATABASE_URL?.trim() ?? "";
  if (
    !databaseUrl.startsWith("postgresql://") &&
    !databaseUrl.startsWith("postgres://")
  ) {
    return null;
  }

  const lookup = async (): Promise<AppSession | null> => {
    const profile = await loadAppUserProfileByEmail(email);

    if (!profile?.isActive) {
      return null;
    }

    const normalizedProfile = await maybePromoteOwnerProfile(profile);
    return appSessionFromProfile(normalizedProfile, email);
  };

  try {
    return await lookup();
  } catch (err) {
    if (isPoolTimeoutError(err)) {
      try {
        await new Promise((resolve) => setTimeout(resolve, 250));
        return await lookup();
      } catch (retryErr) {
        console.warn("[dev-bypass] DB session load retry failed", retryErr);
        return null;
      }
    }
    console.warn("[dev-bypass] DB session load skipped", err);
    return null;
  }
}

async function resolveDevAppSessionInternal(
  email: string,
): Promise<AppSession | null> {
  const normalized = email.trim().toLowerCase();

  const cached = devSessionCache.get(normalized);
  if (cached) return cached;

  let session: AppSession | null = null;

  const devRole = inferDevRole(normalized);
  if (devRole === "STAFF") {
    // Build from DB so we get real staffId/storeId (cached across requests after first hit).
    session = await buildDevStaffSession(normalized);
  } else if (devRole === "STORE_MANAGER") {
    session = await buildDevStoreManagerSession(normalized);
  } else if (devRole) {
    // Non-staff roles use static data — no DB needed.
    session = buildStaticDevSession(normalized, devRole);
  } else {
    // Unknown email — try loading the full AppUser profile from DB.
    session = await loadDevSessionFromDb(normalized);
  }

  if (session) {
    devSessionCache.set(normalized, session);
  }

  return session;
}

export async function resolveDevAppSession(
  cookie: DevSessionCookie,
): Promise<AppSession | null> {
  return resolveDevAppSessionInternal(cookie.email);
}

export async function createDevSessionForEmail(
  email: string,
): Promise<AppSession | null> {
  return resolveDevAppSessionInternal(email.trim().toLowerCase());
}

/** Clears the in-process dev session cache (tests only). */
export function resetDevSessionCacheForTests(): void {
  devSessionCache.clear();
}
