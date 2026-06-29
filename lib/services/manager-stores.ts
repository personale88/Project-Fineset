import { mergeStoreWhere } from "@/lib/db/store-scope";
import { prisma } from "@/lib/db/prisma";
import { unstable_cache } from "next/cache";
import { requestCache } from "@/lib/utils/request-cache";
import type { AppSession, BusinessOwnerSession, StoreSession } from "@/types";
import type { ManagerStoreOption } from "@/types";

export type StorePortalSession = StoreSession | BusinessOwnerSession;

export function normalizeManagerEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isStorePortalSession(
  session: AppSession,
): session is StorePortalSession {
  return session.role === "STORE_MANAGER" || session.role === "BUSINESS_OWNER";
}

/** True when a business-owner AppUser already exists for this email. */
export async function hasExistingBusinessOwnerLogin(email: string): Promise<boolean> {
  const normalized = normalizeManagerEmail(email);
  if (!normalized) return false;

  const user = await prisma.appUser.findUnique({
    where: { email: normalized },
    select: { role: true },
  });

  return user?.role === "BUSINESS_OWNER";
}

export async function findExistingBusinessOwnerByEmail(email: string) {
  const normalized = normalizeManagerEmail(email);
  if (!normalized) return null;

  return prisma.appUser.findFirst({
    where: { email: normalized, role: "BUSINESS_OWNER" },
    select: { id: true, email: true },
  });
}

export const listOwnedStoresForBusinessOwner = unstable_cache(
  async (email: string, primaryStoreId: string): Promise<ManagerStoreOption[]> => {
    const normalized = normalizeManagerEmail(email);
    if (!normalized) return [];

    return prisma.store.findMany({
      where: mergeStoreWhere({
        isActive: true,
        OR: [
          { businessOwnerEmail: { equals: normalized, mode: "insensitive" } },
          { id: primaryStoreId },
        ],
      }),
      select: { id: true, name: true, city: true, state: true },
      orderBy: { name: "asc" },
    });
  },
  ["listOwnedStoresForBusinessOwner"],
  { revalidate: 30, tags: ["store-list"] },
);

export async function listAssignedStoreForManager(
  storeId: string,
): Promise<ManagerStoreOption[]> {
  const store = await prisma.store.findFirst({
    where: mergeStoreWhere({ id: storeId, isActive: true }),
    select: { id: true, name: true, city: true, state: true },
  });

  return store ? [store] : [];
}

export const listAccessibleStores = requestCache(
  async (session: StorePortalSession): Promise<ManagerStoreOption[]> => {
    if (session.role === "STORE_MANAGER") {
      return listAssignedStoreForManager(session.storeId);
    }

    return listOwnedStoresForBusinessOwner(session.email, session.storeId);
  },
);

export async function isStoreAllowedForSession(
  session: StorePortalSession,
  storeId: string,
): Promise<boolean> {
  const stores = await listAccessibleStores(session);
  return stores.some((store) => store.id === storeId);
}

export async function resolveAccessibleStoreId(
  session: StorePortalSession,
  requestedStoreId?: string,
): Promise<string> {
  if (session.role === "STORE_MANAGER") {
    if (requestedStoreId && requestedStoreId !== session.storeId) {
      throw new Error("STORE_ACCESS_DENIED");
    }
    return session.storeId;
  }

  const allowed = await listOwnedStoresForBusinessOwner(
    session.email,
    session.storeId,
  );
  if (allowed.length === 0) {
    return session.storeId;
  }

  const allowedIds = new Set(allowed.map((s) => s.id));
  if (requestedStoreId) {
    if (!allowedIds.has(requestedStoreId)) {
      throw new Error("STORE_ACCESS_DENIED");
    }
    return requestedStoreId;
  }

  if (allowedIds.has(session.storeId)) {
    return session.storeId;
  }

  return allowed[0]!.id;
}
