import type { AdminStorePortfolioRow, BusinessPortfolioRow } from "@/types";
import { earliestDate, latestDate } from "@/lib/utils/business-date-aggregate";

export function normalizeBusinessEmail(
  email: string | null | undefined,
): string | null {
  const trimmed = email?.trim().toLowerCase();
  return trimmed ? trimmed : null;
}

type GroupableStore = Pick<
  AdminStorePortfolioRow,
  | "storeId"
  | "storeName"
  | "businessOwnerName"
  | "businessOwnerEmail"
  | "isActive"
  | "createdAt"
  | "dataExpiryAt"
  | "renewalDueAt"
  | "ownerLastLoginAt"
  | "storeManagerPhone"
>;

export function businessGroupKey(
  store: Pick<GroupableStore, "storeId" | "businessOwnerEmail">,
): string {
  const email = normalizeBusinessEmail(store.businessOwnerEmail);
  return email ?? `store:${store.storeId}`;
}

function resolveOwnerName(stores: GroupableStore[]): string | null {
  const ownerName = stores
    .map((store) => store.businessOwnerName?.trim())
    .find(Boolean);
  return ownerName ?? null;
}

export function resolveBusinessPhone(
  stores: Pick<AdminStorePortfolioRow, "storeManagerPhone">[],
): string | null {
  for (const store of stores) {
    const phone = store.storeManagerPhone?.trim();
    if (phone) return phone;
  }
  return null;
}

function deriveBusinessDisplayName(stores: GroupableStore[]): string {
  const names = stores.map((store) => store.storeName.trim()).filter(Boolean);
  if (names.length === 0) return "Unnamed business";
  if (names.length === 1) return names[0]!;

  const wordLists = names.map((name) => name.split(/\s+/).filter(Boolean));
  const minLength = Math.min(...wordLists.map((words) => words.length));
  const sharedWords: string[] = [];

  for (let index = 0; index < minLength; index += 1) {
    const word = wordLists[0]![index]!.toLowerCase();
    if (wordLists.every((words) => words[index]!.toLowerCase() === word)) {
      sharedWords.push(wordLists[0]![index]!);
    } else {
      break;
    }
  }

  const sharedName = sharedWords.join(" ").trim();
  if (sharedWords.length >= 2 || sharedName.length >= 6) {
    return sharedName;
  }

  return names[0]!;
}

function resolveBusinessName(
  stores: GroupableStore[],
  businessEmail: string | null,
): string {
  const displayName = deriveBusinessDisplayName(stores);
  if (displayName !== "Unnamed business") return displayName;

  if (businessEmail) {
    const localPart = businessEmail.split("@")[0]?.trim();
    if (localPart) {
      return localPart
        .split(/[._-]+/)
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ");
    }
    return businessEmail;
  }

  return "Unassigned stores";
}

function aggregateBusinessDates(stores: AdminStorePortfolioRow[]) {
  const dataExpiry = earliestDate(stores.map((store) => store.dataExpiryAt));
  const renewalDue = earliestDate(stores.map((store) => store.renewalDueAt));
  const ownerLastLogin = latestDate(stores.map((store) => store.ownerLastLoginAt));

  return {
    dataExpiryAt: dataExpiry?.toISOString() ?? null,
    renewalDueAt: renewalDue?.toISOString() ?? null,
    ownerLastLoginAt: ownerLastLogin?.toISOString() ?? null,
  };
}

export function groupStoresByBusiness(
  stores: AdminStorePortfolioRow[],
): BusinessPortfolioRow[] {
  const groups = new Map<string, AdminStorePortfolioRow[]>();

  for (const store of stores) {
    const key = businessGroupKey(store);
    const list = groups.get(key) ?? [];
    list.push(store);
    groups.set(key, list);
  }

  const businesses: BusinessPortfolioRow[] = [];

  for (const [businessKey, groupedStores] of groups) {
    const sortedStores = [...groupedStores].sort((a, b) =>
      a.storeName.localeCompare(b.storeName),
    );
    const businessEmail = normalizeBusinessEmail(
      sortedStores[0]?.businessOwnerEmail,
    );

    businesses.push({
      businessKey,
      businessName: resolveBusinessName(sortedStores, businessEmail),
      ownerName: resolveOwnerName(sortedStores),
      businessEmail,
      businessPhone: resolveBusinessPhone(sortedStores),
      hasBusinessEmail: businessEmail !== null,
      storeCount: sortedStores.length,
      activeStoreCount: sortedStores.filter((store) => store.isActive).length,
      inactiveStoreCount: sortedStores.filter((store) => !store.isActive).length,
      ...aggregateBusinessDates(sortedStores),
      stores: sortedStores,
    });
  }

  return businesses.sort((a, b) => {
    const aRenewal = a.renewalDueAt ? new Date(a.renewalDueAt).getTime() : Number.MAX_SAFE_INTEGER;
    const bRenewal = b.renewalDueAt ? new Date(b.renewalDueAt).getTime() : Number.MAX_SAFE_INTEGER;
    if (aRenewal !== bRenewal) return aRenewal - bRenewal;

    const aCreated = Math.max(
      ...a.stores.map((store) => new Date(store.createdAt).getTime()),
    );
    const bCreated = Math.max(
      ...b.stores.map((store) => new Date(store.createdAt).getTime()),
    );
    if (bCreated !== aCreated) return bCreated - aCreated;

    return a.businessName.localeCompare(b.businessName);
  });
}
