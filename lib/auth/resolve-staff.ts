import { cache } from "react";
import { prisma } from "@/lib/db/prisma";
import { assertStoreExists } from "@/lib/services/analytics";
import {
  isStorePortalSession,
  resolveAccessibleStoreId,
} from "@/lib/services/manager-stores";
import type { AppSession, StaffSession } from "@/types";

export interface ResolvedStaffContext {
  staffId: string;
  storeId: string;
}

export const PORTAL_ACTOR_ROLES = ["STAFF", "STORE_MANAGER"] as const;

export const STAFF_CALLS_ROLES = [
  "STAFF",
  "STORE_MANAGER",
  "BUSINESS_OWNER",
  "MASTER_ADMIN",
] as const;

export async function resolveStoreManagerStaffForStore(
  storeId: string,
): Promise<ResolvedStaffContext | null> {
  const staff = await prisma.staff.findFirst({
    where: {
      storeId,
      role: "STORE_MANAGER",
      isActive: true,
    },
    select: { id: true, storeId: true },
    orderBy: { createdAt: "asc" },
  });

  return staff ? { staffId: staff.id, storeId: staff.storeId } : null;
}

/** Resolves staff/store context for the shared staff call-users list. */
export async function requireStaffCallsContext(
  session: AppSession | null,
  requestedStoreId?: string,
): Promise<ResolvedStaffContext | null> {
  if (!session) return null;

  if (session.role === "STAFF" || session.role === "STORE_MANAGER") {
    return requirePortalActorContext(session);
  }

  if (session.role === "MASTER_ADMIN") {
    if (!requestedStoreId) return null;
    const exists = await assertStoreExists(requestedStoreId);
    if (!exists) return null;
    return resolveStoreManagerStaffForStore(requestedStoreId);
  }

  if (session.role === "BUSINESS_OWNER") {
    if (!isStorePortalSession(session)) return null;
    try {
      const storeId = await resolveAccessibleStoreId(session, requestedStoreId);
      return resolveStoreManagerStaffForStore(storeId);
    } catch {
      return null;
    }
  }

  return null;
}

export async function requireStaffContext(
  session: AppSession | null,
): Promise<ResolvedStaffContext | null> {
  if (!session || session.role !== "STAFF") return null;
  return resolveStaffContext(session);
}

async function resolveStoreManagerStaffContext(
  session: AppSession & { role: "STORE_MANAGER"; storeId: string },
): Promise<ResolvedStaffContext | null> {
  if (session.userId.startsWith("dev-")) {
    try {
      const staff = await prisma.staff.findFirst({
        where: {
          isActive: true,
          role: "STORE_MANAGER",
          ...(isPlaceholderDevId(session.storeId)
            ? {}
            : { storeId: session.storeId }),
        },
        select: { id: true, storeId: true },
        orderBy: { createdAt: "asc" },
      });
      if (staff) {
        return { staffId: staff.id, storeId: staff.storeId };
      }
    } catch {
      return null;
    }
    return null;
  }

  const appUser = await prisma.appUser.findUnique({
    where: { id: session.userId },
    select: {
      staff: {
        select: { id: true, storeId: true, isActive: true },
      },
    },
  });

  if (!appUser?.staff?.isActive || appUser.staff.storeId !== session.storeId) {
    return null;
  }

  return { staffId: appUser.staff.id, storeId: appUser.staff.storeId };
}

/** Staff and per-store managers who log visits, calls, and field sales. */
export async function requirePortalActorContext(
  session: AppSession | null,
): Promise<ResolvedStaffContext | null> {
  if (!session) return null;

  if (session.role === "STAFF") {
    return resolveStaffContext(session);
  }

  if (session.role === "STORE_MANAGER") {
    return resolveStoreManagerStaffContext(session);
  }

  return null;
}

function isPlaceholderDevId(value: string): boolean {
  return value.startsWith("dev-");
}

async function resolveStaffContextFromDb(
  session: StaffSession,
): Promise<ResolvedStaffContext | null> {
  if (session.employeeId) {
    const byEmployeeId = await prisma.staff.findFirst({
      where: {
        employeeId: session.employeeId,
        isActive: true,
        role: "STAFF",
      },
      select: { id: true, storeId: true },
    });

    if (byEmployeeId) {
      return { staffId: byEmployeeId.id, storeId: byEmployeeId.storeId };
    }
  }

  if (!isPlaceholderDevId(session.staffId)) {
    const byId = await prisma.staff.findFirst({
      where: {
        id: session.staffId,
        isActive: true,
        role: "STAFF",
      },
      select: { id: true, storeId: true },
    });

    if (byId) {
      return { staffId: byId.id, storeId: byId.storeId };
    }
  }

  const byNameWhere: {
    name: { equals: string; mode: "insensitive" };
    storeId?: string;
    isActive: true;
    role: "STAFF";
  } = {
    name: { equals: session.name, mode: "insensitive" },
    isActive: true,
    role: "STAFF",
  };

  if (!isPlaceholderDevId(session.storeId)) {
    byNameWhere.storeId = session.storeId;
  }

  const byName = await prisma.staff.findFirst({
    where: byNameWhere,
    select: { id: true, storeId: true },
  });

  if (byName) {
    return { staffId: byName.id, storeId: byName.storeId };
  }

  return null;
}

/** Request-scoped; skips DB when the session already carries seeded staff/store ids. */
export const resolveStaffContext = cache(
  async (session: StaffSession): Promise<ResolvedStaffContext | null> => {
    if (
      session.staffId &&
      session.storeId &&
      !isPlaceholderDevId(session.staffId) &&
      !isPlaceholderDevId(session.storeId)
    ) {
      return { staffId: session.staffId, storeId: session.storeId };
    }

    return resolveStaffContextFromDb(session);
  },
);
