import type { BillingPaymentStatus } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { getBillingCycleSettings } from "@/lib/automation/billing-cycle-settings";
import { getPlatformSettings } from "@/lib/services/platform-settings";
import { businessGroupKey } from "@/lib/utils/group-stores-by-business";
import {
  resolvePortalBillingAccess,
  type PortalBillingAccessResult,
} from "@/lib/utils/portal-billing-access";

export interface PortalBillingAccessDto extends PortalBillingAccessResult {
  businessKey: string;
  businessName: string | null;
  paymentStatus: BillingPaymentStatus;
  paidAt: string | null;
}

async function resolveBusinessKeyForStore(storeId: string): Promise<{
  businessKey: string;
  businessName: string;
  businessOwnerEmail: string | null;
} | null> {
  const store = await prisma.store.findUnique({
    where: { id: storeId },
    select: {
      id: true,
      name: true,
      businessOwnerEmail: true,
      businessOwnerName: true,
    },
  });
  if (!store) return null;

  return {
    businessKey: businessGroupKey({
      storeId: store.id,
      businessOwnerEmail: store.businessOwnerEmail,
    }),
    businessName: store.businessOwnerName?.trim() || store.name,
    businessOwnerEmail: store.businessOwnerEmail?.trim().toLowerCase() ?? null,
  };
}

export async function getPortalBillingAccessForStore(
  storeId: string,
  reference = new Date(),
): Promise<PortalBillingAccessDto | null> {
  const business = await resolveBusinessKeyForStore(storeId);
  if (!business) return null;

  const account = await prisma.billingBusinessAccount.findUnique({
    where: { businessKey: business.businessKey },
    select: {
      paymentStatus: true,
      paidAt: true,
      businessName: true,
    },
  });

  const cycleSettings = await getBillingCycleSettings();
  const platformSettings = await getPlatformSettings();

  const access = resolvePortalBillingAccess(
    {
      paymentStatus: account?.paymentStatus ?? "UNPAID",
      paidAt: account?.paidAt ?? null,
      restrictPortalOnOverdue: platformSettings.billing.restrictPortalOnOverdue,
    },
    reference,
    cycleSettings,
  );

  return {
    ...access,
    businessKey: business.businessKey,
    businessName: account?.businessName ?? business.businessName,
    paymentStatus: account?.paymentStatus ?? "UNPAID",
    paidAt: account?.paidAt?.toISOString() ?? null,
  };
}

export async function getPortalBillingAccessForBusinessKey(
  businessKey: string,
  reference = new Date(),
): Promise<PortalBillingAccessDto | null> {
  const account = await prisma.billingBusinessAccount.findUnique({
    where: { businessKey },
    select: {
      paymentStatus: true,
      paidAt: true,
      businessName: true,
    },
  });

  const cycleSettings = await getBillingCycleSettings();
  const platformSettings = await getPlatformSettings();

  const access = resolvePortalBillingAccess(
    {
      paymentStatus: account?.paymentStatus ?? "UNPAID",
      paidAt: account?.paidAt ?? null,
      restrictPortalOnOverdue: platformSettings.billing.restrictPortalOnOverdue,
    },
    reference,
    cycleSettings,
  );

  return {
    ...access,
    businessKey,
    businessName: account?.businessName ?? null,
    paymentStatus: account?.paymentStatus ?? "UNPAID",
    paidAt: account?.paidAt?.toISOString() ?? null,
  };
}
