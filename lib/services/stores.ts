import { logAuthEvent } from "@/lib/auth/audit";
import { InviteError, inviteUser } from "@/lib/auth/invite-user";
import {
  findExistingBusinessOwnerByEmail,
  listOwnedStoresForBusinessOwner,
} from "@/lib/services/manager-stores";
import { validatePassword } from "@/lib/auth/password-policy";
import { ensureProductionStoreSchema } from "@/lib/db/ensure-production-store-schema";
import { computeOnboardingDefaultDates } from "@/lib/platform/onboarding-dates";
import { getPlatformSettings } from "@/lib/services/platform-settings";
import { prisma } from "@/lib/db/prisma";
import {
  mergeDeletedStoreWhere,
  mergeStoreWhere,
  purgeAtFromNow,
  storeNotDeletedWhere,
} from "@/lib/db/store-scope";
import { StoreServiceError } from "@/lib/services/store-service-error";
import {
  findSiblingBusinessDates,
  syncBusinessDatesForEmail,
} from "@/lib/services/store-business-dates";
import {
  normalizeStoreManagerEmail,
  syncStoreManagerEmail,
} from "@/lib/services/sync-store-manager-email";
import { hashCredential } from "@/lib/auth/credentials";
import { deleteAllSessionsForUser } from "@/lib/auth/session-store";
import { invalidateStoreDerivedCaches } from "@/lib/sync/store-cache";

export { StoreServiceError } from "@/lib/services/store-service-error";
import type { CreateStoreInput, UpdateStoreInput } from "@/lib/validations/store.schema";
import { parseStoreDateField } from "@/lib/validations/store.schema";
import type { Store } from "@prisma/client";
import type { AdminStorePortfolioRow, AnalyticsPeriodLabel, StorePerformanceRow } from "@/types";
import type { Prisma, PurchaseStatus } from "@prisma/client";
import {
  calculateAvgTransaction,
  calculateConversionRate,
  calculateDelta,
  calculateTotalRevenue,
  getPeriodRange,
  getPreviousPeriodRange,
} from "@/lib/utils/analytics";

export async function listStores(params: {
  page: number;
  pageSize: number;
  search?: string;
  activeOnly?: boolean;
  includeDeleted?: boolean;
  period?: AnalyticsPeriodLabel;
}) {
  const period = params.period ?? "month";
  const { start, end } = getPeriodRange(period);
  const filters: Prisma.StoreWhereInput = {};

  // Soft-deleted stores are always inactive; skip activeOnly when listing trash.
  if (params.activeOnly && !params.includeDeleted) {
    filters.isActive = true;
  }

  if (params.search?.trim()) {
    const term = params.search.trim();
    filters.OR = [
      { name: { contains: term, mode: "insensitive" } },
      { city: { contains: term, mode: "insensitive" } },
      { state: { contains: term, mode: "insensitive" } },
      { businessOwnerName: { contains: term, mode: "insensitive" } },
      { businessOwnerEmail: { contains: term, mode: "insensitive" } },
    ];
  }

  const where = params.includeDeleted
    ? mergeDeletedStoreWhere(filters)
    : mergeStoreWhere(filters);

  // Run sequentially to avoid pool saturation on low connection limits.
  const stores = await prisma.store.findMany({
    where,
    orderBy: { name: "asc" },
    skip: (params.page - 1) * params.pageSize,
    take: params.pageSize,
    include: {
      _count: { select: { staff: true } },
      visits: {
        where: { visitDate: { gte: start, lte: end } },
        select: { purchaseStatus: true, transactionAmount: true },
      },
    },
  });
  const total = await prisma.store.count({ where });

  const mapped = stores.map((store) => ({
      id: store.id,
      name: store.name,
      category: store.category,
      customCategory: store.customCategory,
      city: store.city,
      state: store.state,
      pincode: store.pincode,
      businessOwnerName: store.businessOwnerName,
      businessOwnerEmail: store.businessOwnerEmail,
      isActive: store.isActive,
      deletedAt: store.deletedAt?.toISOString() ?? null,
      purgeAt: store.purgeAt?.toISOString() ?? null,
      staffCount: store._count.staff,
      visits: store.visits.length,
      revenue: calculateTotalRevenue(store.visits),
      conversionRate: calculateConversionRate(store.visits),
      createdAt: store.createdAt.toISOString(),
      dataExpiryAt: store.dataExpiryAt?.toISOString() ?? null,
      renewalDueAt: store.renewalDueAt?.toISOString() ?? null,
    }));

  return {
    data: mapped,
    total,
  };
}

export type CreateStoreResult = {
  store: Store;
  manager?: {
    email: string;
    appUserId: string;
    /** Store linked to an existing manager login; no new password was created. */
    linkedExistingLogin?: boolean;
  };
};

export async function createStore(input: CreateStoreInput): Promise<CreateStoreResult> {
  await ensureProductionStoreSchema();
  const { password, ...storeFields } = input;
  const normalizedCustomCategory =
    storeFields.category === "OTHER" ? storeFields.customCategory?.trim() : undefined;
  const managerEmail = storeFields.businessOwnerEmail?.trim().toLowerCase();

  let dataExpiryAt = storeFields.dataExpiryAt
    ? parseStoreDateField(storeFields.dataExpiryAt) ?? null
    : null;
  let renewalDueAt = storeFields.renewalDueAt
    ? parseStoreDateField(storeFields.renewalDueAt) ?? null
    : null;
  if (
    managerEmail &&
    dataExpiryAt == null &&
    renewalDueAt == null
  ) {
    const siblingDates = await findSiblingBusinessDates(managerEmail);
    if (siblingDates) {
      dataExpiryAt = siblingDates.dataExpiryAt;
      renewalDueAt = siblingDates.renewalDueAt;
    }
  }

  if (dataExpiryAt == null && renewalDueAt == null) {
    const settings = await getPlatformSettings();
    const defaults = computeOnboardingDefaultDates(settings.onboarding);
    dataExpiryAt = parseStoreDateField(defaults.dataExpiryAt) ?? null;
    renewalDueAt = parseStoreDateField(defaults.renewalDueAt) ?? null;
  }

  let store: Store | undefined;
  try {
    store = await prisma.store.create({
      data: {
        name: storeFields.name.trim(),
        category: storeFields.category,
        customCategory: normalizedCustomCategory ?? null,
        city: storeFields.city.trim(),
        state: storeFields.state.trim(),
        pincode: storeFields.pincode ?? null,
        businessOwnerName: storeFields.businessOwnerName ?? null,
        businessOwnerEmail: managerEmail ?? null,
        dataExpiryAt,
        renewalDueAt,
      },
    });

    if (normalizedCustomCategory) {
      await prisma.storeCategoryOption.upsert({
        where: { name: normalizedCustomCategory },
        update: {},
        create: {
          name: normalizedCustomCategory,
          label: normalizedCustomCategory,
          isBuiltin: false,
        },
      });
    }

    let manager: CreateStoreResult["manager"];
    if (managerEmail) {
      const existingManager = await findExistingBusinessOwnerByEmail(managerEmail);
      if (existingManager) {
        manager = {
          email: existingManager.email,
          appUserId: existingManager.id,
          linkedExistingLogin: true,
        };
      } else if (password) {
        const invited = await inviteUser({
          name: storeFields.businessOwnerName?.trim() || store.name,
          email: managerEmail,
          password,
          role: "BUSINESS_OWNER",
          storeId: store.id,
        });
        manager = { email: invited.email, appUserId: invited.appUserId };
      }
    }

    const result = { store: store!, manager };
    if (managerEmail && (dataExpiryAt != null || renewalDueAt != null)) {
      await syncBusinessDatesForEmail(managerEmail, { dataExpiryAt, renewalDueAt });
    }
    invalidateStoreDerivedCaches({
      storeId: store!.id,
      businessOwnerEmail: store!.businessOwnerEmail,
    });
    return result;
  } catch (error) {
    if (store) {
      await prisma.store.delete({ where: { id: store.id } }).catch(() => undefined);
    }
    if (error instanceof InviteError) {
      throw error;
    }
    throw error;
  }
}

export async function updateStore(storeId: string, input: UpdateStoreInput) {
  const normalizedCustomCategory =
    input.category === "OTHER" ? input.customCategory?.trim() : undefined;
  const shouldClearCustomCategory = input.category && input.category !== "OTHER";

  const existing = await prisma.store.findFirst({
    where: mergeStoreWhere({ id: storeId }),
    select: { name: true },
  });
  if (!existing) {
    throw new StoreServiceError("Store not found", 404);
  }

  const { businessOwnerEmail: emailInput, ...rest } = input;

  if (emailInput !== undefined) {
    await syncStoreManagerEmail(storeId, emailInput);
  }

  const store = await prisma.store.update({
    where: { id: storeId },
    data: {
      ...rest,
      ...(emailInput !== undefined
        ? { businessOwnerEmail: normalizeStoreManagerEmail(emailInput) }
        : {}),
      customCategory: shouldClearCustomCategory ? null : normalizedCustomCategory,
    },
  });

  if (normalizedCustomCategory) {
    await prisma.storeCategoryOption.upsert({
      where: { name: normalizedCustomCategory },
      update: {},
      create: {
        name: normalizedCustomCategory,
        label: normalizedCustomCategory,
        isBuiltin: false,
      },
    });
  }

  invalidateStoreDerivedCaches({
    storeId: store.id,
    businessOwnerEmail: store.businessOwnerEmail,
  });

  if (input.dataExpiryAt !== undefined || input.renewalDueAt !== undefined) {
    await syncBusinessDatesForEmail(store.businessOwnerEmail, {
      dataExpiryAt: store.dataExpiryAt,
      renewalDueAt: store.renewalDueAt,
    });
    const refreshed = await prisma.store.findUniqueOrThrow({ where: { id: storeId } });
    return refreshed;
  }

  return store;
}

export async function updateStoreManagerPassword(storeId: string, password: string) {
  const passwordCheck = validatePassword(password);
  if (!passwordCheck.success) {
    throw new StoreServiceError(passwordCheck.error ?? "Invalid password", 400);
  }

  const store = await prisma.store.findFirst({
    where: mergeStoreWhere({ id: storeId }),
  });
  if (!store) {
    throw new StoreServiceError("Store not found", 404);
  }

  const manager = await prisma.appUser.findFirst({
    where: { storeId, role: "BUSINESS_OWNER" },
    orderBy: { createdAt: "asc" },
    select: { id: true, authId: true, email: true },
  });

  if (!manager) {
    throw new StoreServiceError(
      "No store manager login exists for this store. Add a business owner email and password when creating the store.",
      404,
    );
  }

  const passwordHash = await hashCredential(password);
  await prisma.appUser.update({
    where: { id: manager.id },
    data: { passwordHash },
  });
  await deleteAllSessionsForUser(manager.id);

  return { appUserId: manager.id, email: manager.email };
}

export type SoftDeleteStoreResult = {
  id: string;
  name: string;
  deletedAt: string;
  purgeAt: string;
};

export async function softDeleteStore(
  storeId: string,
  deletedByEmail: string,
): Promise<SoftDeleteStoreResult> {
  const store = await prisma.store.findFirst({
    where: mergeStoreWhere({ id: storeId }),
    include: {
      appUsers: {
        select: {
          id: true,
          authId: true,
          email: true,
          role: true,
          storeId: true,
          staffId: true,
          name: true,
          isActive: true,
        },
      },
    },
  });

  if (!store) {
    throw new StoreServiceError("Store not found", 404);
  }

  const now = new Date();
  const purgeAt = purgeAtFromNow(now);

  await prisma.$transaction([
    prisma.store.update({
      where: { id: storeId },
      data: {
        deletedAt: now,
        purgeAt,
        deletedByEmail: deletedByEmail.trim().toLowerCase(),
        isActive: false,
      },
    }),
    prisma.staff.updateMany({
      where: { storeId },
      data: { isActive: false },
    }),
    prisma.appUser.updateMany({
      where: { storeId },
      data: { isActive: false },
    }),
  ]);

  for (const manager of store.appUsers) {
    await deleteAllSessionsForUser(manager.id);
  }

  void logAuthEvent({
    event: "STORE_SOFT_DELETED",
    email: deletedByEmail,
    metadata: {
      storeId,
      storeName: store.name,
      purgeAt: purgeAt.toISOString(),
      staffDeactivated: true,
      managersDeactivated: store.appUsers.length,
    },
  });

  invalidateStoreDerivedCaches({
    storeId,
    businessOwnerEmail: store.businessOwnerEmail,
  });

  return {
    id: store.id,
    name: store.name,
    deletedAt: now.toISOString(),
    purgeAt: purgeAt.toISOString(),
  };
}

export async function restoreStore(
  storeId: string,
  restoredByEmail: string,
): Promise<Store> {
  const store = await prisma.store.findFirst({
    where: {
      id: storeId,
      deletedAt: { not: null },
      purgeAt: { gt: new Date() },
    },
    include: {
      appUsers: {
        select: {
          id: true,
          authId: true,
          email: true,
          role: true,
          storeId: true,
          staffId: true,
          name: true,
        },
      },
    },
  });

  if (!store) {
    throw new StoreServiceError(
      "Store not found, not deleted, or past the 90-day recovery window",
      404,
    );
  }

  const restored = await prisma.$transaction(async (tx) => {
    const updated = await tx.store.update({
      where: { id: storeId },
      data: {
        deletedAt: null,
        purgeAt: null,
        deletedByEmail: null,
        isActive: true,
      },
    });
    await tx.staff.updateMany({
      where: { storeId },
      data: { isActive: true },
    });
    await tx.appUser.updateMany({
      where: { storeId },
      data: { isActive: true },
    });
    return updated;
  });

  void logAuthEvent({
    event: "STORE_RESTORED",
    email: restoredByEmail.trim().toLowerCase(),
    metadata: {
      storeId,
      storeName: store.name,
      previouslyDeletedBy: store.deletedByEmail,
    },
  });

  invalidateStoreDerivedCaches({
    storeId,
    businessOwnerEmail: restored.businessOwnerEmail,
  });

  return restored;
}

export async function getStoreById(storeId: string) {
  return prisma.store.findFirst({
    where: mergeStoreWhere({ id: storeId }),
    include: {
      _count: { select: { staff: true, visits: true, customers: true } },
    },
  });
}

export async function getManagerStorePerformanceRows(
  email: string,
  primaryStoreId: string,
  period: AnalyticsPeriodLabel,
): Promise<StorePerformanceRow[]> {
  const allowed = await listOwnedStoresForBusinessOwner(email, primaryStoreId);
  const allowedIds = new Set(allowed.map((store) => store.id));
  if (allowedIds.size === 0) return [];

  return getStorePerformanceRows(period, [...allowedIds]);
}

export async function getStorePerformanceRows(
  period: AnalyticsPeriodLabel,
  storeIds?: string[],
): Promise<StorePerformanceRow[]> {
  const { start, end } = getPeriodRange(period);
  const previousRange = getPreviousPeriodRange(period);

  const scopedStoreWhere: Prisma.StoreWhereInput = storeIds?.length
    ? { ...storeNotDeletedWhere, id: { in: storeIds } }
    : storeNotDeletedWhere;
  const scopedVisitStore = { store: scopedStoreWhere };

  const [
    stores,
    currentVisits,
    previousVisits,
    currentFieldSales,
    previousFieldSales,
    currentCallLogs,
    previousCallLogs,
  ] = await Promise.all([
    prisma.store.findMany({
      where: scopedStoreWhere,
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        category: true,
        city: true,
        state: true,
        isActive: true,
        businessOwnerName: true,
        businessOwnerEmail: true,
        staff: {
          where: { role: "STORE_MANAGER" },
          orderBy: [{ isActive: "desc" }, { name: "asc" }],
          take: 1,
          select: { name: true, phone: true },
        },
        _count: { select: { staff: { where: { isActive: true } } } },
      },
    }),
    prisma.visit.findMany({
      where: { visitDate: { gte: start, lte: end }, ...scopedVisitStore },
      select: {
        storeId: true,
        purchaseStatus: true,
        transactionAmount: true,
        schemeEnrolled: true,
      },
    }),
    prisma.visit.findMany({
      where: {
        visitDate: { gte: previousRange.start, lte: previousRange.end },
        ...scopedVisitStore,
      },
      select: {
        storeId: true,
        purchaseStatus: true,
        transactionAmount: true,
        schemeEnrolled: true,
      },
    }),
    prisma.fieldSale.findMany({
      where: {
        activityDate: { gte: start, lte: end },
        ...scopedVisitStore,
      },
      select: { storeId: true },
    }),
    prisma.fieldSale.findMany({
      where: {
        activityDate: { gte: previousRange.start, lte: previousRange.end },
        ...scopedVisitStore,
      },
      select: { storeId: true },
    }),
    prisma.staffCallLog.findMany({
      where: {
        createdAt: { gte: start, lte: end },
        visit: scopedVisitStore,
      },
      select: { visit: { select: { storeId: true } } },
    }),
    prisma.staffCallLog.findMany({
      where: {
        createdAt: { gte: previousRange.start, lte: previousRange.end },
        visit: scopedVisitStore,
      },
      select: { visit: { select: { storeId: true } } },
    }),
  ]);

  const bucketVisits = (
    rows: Array<{
      storeId: string;
      purchaseStatus: PurchaseStatus;
      transactionAmount: number | null;
      schemeEnrolled: boolean;
    }>,
  ) => {
    const map = new Map<
      string,
      Array<{
        purchaseStatus: PurchaseStatus;
        transactionAmount: number | null;
        schemeEnrolled: boolean;
      }>
    >();
    for (const row of rows) {
      const list = map.get(row.storeId) ?? [];
      list.push(row);
      map.set(row.storeId, list);
    }
    return map;
  };

  const countByStoreId = (rows: Array<{ storeId: string }>) => {
    const map = new Map<string, number>();
    for (const row of rows) {
      map.set(row.storeId, (map.get(row.storeId) ?? 0) + 1);
    }
    return map;
  };

  const countCallsByStore = (
    rows: Array<{ visit: { storeId: string } | null }>,
  ) => {
    const map = new Map<string, number>();
    for (const row of rows) {
      if (!row.visit) continue;
      const storeId = row.visit.storeId;
      map.set(storeId, (map.get(storeId) ?? 0) + 1);
    }
    return map;
  };

  const currentByStore = bucketVisits(currentVisits);
  const previousByStore = bucketVisits(previousVisits);
  const currentFieldSalesByStore = countByStoreId(currentFieldSales);
  const previousFieldSalesByStore = countByStoreId(previousFieldSales);
  const currentCallsByStore = countCallsByStore(currentCallLogs);
  const previousCallsByStore = countCallsByStore(previousCallLogs);

  return stores.map((store) => {
    const current = currentByStore.get(store.id) ?? [];
    const previous = previousByStore.get(store.id) ?? [];
    const visits = current.length;
    const revenue = calculateTotalRevenue(current);
    const conversionRate = calculateConversionRate(current);
    const avgTicketSize = calculateAvgTransaction(current);
    const schemesEnrolled = current.filter((visit) => visit.schemeEnrolled).length;
    const previousVisits = previous.length;
    const previousRevenue = calculateTotalRevenue(previous);
    const previousConversion = calculateConversionRate(previous);
    const previousAvgTicketSize = calculateAvgTransaction(previous);
    const previousSchemesEnrolled = previous.filter((visit) => visit.schemeEnrolled).length;
    const fieldSales = currentFieldSalesByStore.get(store.id) ?? 0;
    const previousFieldSales = previousFieldSalesByStore.get(store.id) ?? 0;
    const userCalls = currentCallsByStore.get(store.id) ?? 0;
    const previousUserCalls = previousCallsByStore.get(store.id) ?? 0;

    return {
      storeId: store.id,
      storeName: store.name,
      category: store.category,
      city: store.city,
      state: store.state,
      isActive: store.isActive,
      businessOwnerName: store.businessOwnerName,
      businessOwnerEmail: store.businessOwnerEmail,
      storeManagerName: store.staff[0]?.name ?? null,
      storeManagerPhone: store.staff[0]?.phone ?? null,
      visits,
      revenue,
      conversionRate,
      avgTicketSize,
      schemesEnrolled,
      staffCount: store._count.staff,
      fieldSales,
      userCalls,
      deltas: {
        visits: calculateDelta(visits, previousVisits),
        revenue: calculateDelta(revenue, previousRevenue),
        conversionRate: calculateDelta(conversionRate, previousConversion),
        avgTicketSize: calculateDelta(avgTicketSize, previousAvgTicketSize),
        schemesEnrolled: calculateDelta(schemesEnrolled, previousSchemesEnrolled),
        fieldSales: calculateDelta(fieldSales, previousFieldSales),
        userCalls: calculateDelta(userCalls, previousUserCalls),
      },
    };
  });
}

export async function getAdminPortfolioStoreRows(): Promise<AdminStorePortfolioRow[]> {
  await ensureProductionStoreSchema();

  const stores = await prisma.store.findMany({
    where: storeNotDeletedWhere,
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      category: true,
      customCategory: true,
      city: true,
      state: true,
      pincode: true,
      businessOwnerName: true,
      businessOwnerEmail: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
      deletedAt: true,
      purgeAt: true,
      dataExpiryAt: true,
      renewalDueAt: true,
      staff: {
        where: { isActive: true },
        select: { name: true, phone: true, role: true },
      },
      _count: { select: { staff: { where: { isActive: true } } } },
    },
  });

  const ownerEmails = [
    ...new Set(
      stores
        .map((store) => store.businessOwnerEmail?.trim().toLowerCase())
        .filter((email): email is string => Boolean(email)),
    ),
  ];

  const owners =
    ownerEmails.length > 0
      ? await prisma.appUser.findMany({
          where: {
            role: "BUSINESS_OWNER",
            email: { in: ownerEmails },
          },
          select: { email: true, lastLoginAt: true },
        })
      : [];

  const lastLoginByEmail = new Map(
    owners.map((owner) => [owner.email.toLowerCase(), owner.lastLoginAt?.toISOString() ?? null]),
  );

  return stores.map((store) => {
    const manager = store.staff.find((member) => member.role === "STORE_MANAGER");
    const staffWithPhone = store.staff.find((member) => member.phone?.trim());
    const contactPhone =
      manager?.phone?.trim() || staffWithPhone?.phone?.trim() || null;

    return {
    storeId: store.id,
    storeName: store.name,
    category: store.category,
    customCategory: store.customCategory,
    city: store.city,
    state: store.state,
    pincode: store.pincode,
    isActive: store.isActive,
    businessOwnerName: store.businessOwnerName,
    businessOwnerEmail: store.businessOwnerEmail,
    storeManagerName: manager?.name ?? staffWithPhone?.name ?? null,
    storeManagerPhone: contactPhone,
    staffCount: store._count.staff,
    createdAt: store.createdAt.toISOString(),
    updatedAt: store.updatedAt.toISOString(),
    deletedAt: store.deletedAt?.toISOString() ?? null,
    purgeAt: store.purgeAt?.toISOString() ?? null,
    dataExpiryAt: store.dataExpiryAt?.toISOString() ?? null,
    renewalDueAt: store.renewalDueAt?.toISOString() ?? null,
    ownerLastLoginAt: store.businessOwnerEmail
      ? lastLoginByEmail.get(store.businessOwnerEmail.trim().toLowerCase()) ?? null
      : null,
  };
  });
}

