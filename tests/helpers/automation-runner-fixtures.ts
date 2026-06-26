import type { AdminStorePortfolioRow } from "@/types";

const now = new Date().toISOString();

export function makeAutomationStore(
  overrides: Partial<AdminStorePortfolioRow> & {
    storeId: string;
    businessOwnerEmail?: string | null;
  },
): AdminStorePortfolioRow {
  const email =
    overrides.businessOwnerEmail === undefined
      ? `owner-${overrides.storeId}@automation.test`
      : overrides.businessOwnerEmail;
  return {
    storeId: overrides.storeId,
    storeName: overrides.storeName ?? `Store ${overrides.storeId}`,
    category: overrides.category ?? "JEWELRY",
    customCategory: overrides.customCategory ?? null,
    city: overrides.city ?? "Chennai",
    state: overrides.state ?? "TN",
    pincode: overrides.pincode ?? "600001",
    isActive: overrides.isActive ?? true,
    businessOwnerName: overrides.businessOwnerName ?? "Test Owner",
    businessOwnerEmail: email,
    storeManagerName: overrides.storeManagerName ?? "Manager",
    storeManagerPhone: overrides.storeManagerPhone ?? "9876543210",
    staffCount: overrides.staffCount ?? 2,
    createdAt: overrides.createdAt ?? now,
    updatedAt: overrides.updatedAt ?? now,
    deletedAt: overrides.deletedAt ?? null,
    purgeAt: overrides.purgeAt ?? null,
    dataExpiryAt: overrides.dataExpiryAt ?? null,
    renewalDueAt: overrides.renewalDueAt ?? null,
    ownerLastLoginAt: overrides.ownerLastLoginAt ?? null,
  };
}

export function emptyRunSummary() {
  return {
    invoicesSent: 0,
    invoicesSkipped: 0,
    paymentRemindersSent: 0,
    whatsAppQueued: 0,
    whatsAppSent: 0,
    followUpsScheduled: 0,
    renewalRemindersSent: 0,
    expiryWarningsSent: 0,
    monthlyReportsSent: 0,
    paymentConfirmationsSent: 0,
    details: [],
  };
}
