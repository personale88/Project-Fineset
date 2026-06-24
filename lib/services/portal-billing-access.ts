import type { BillingPaymentStatus } from "@prisma/client";
import type { AppSession } from "@/types";
import { prisma } from "@/lib/db/prisma";
import { getPlatformSettings } from "@/lib/services/platform-settings";
import { resolveBillingAnchorForBusinessKey } from "@/lib/services/billing-anchor";
import { businessGroupKey } from "@/lib/utils/group-stores-by-business";
import {
  applyPortalBillingAccessForRole,
  resolvePortalBillingAccess,
  type PortalBillingAccessForRole,
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

async function loadBillingAccessBase(
  businessKey: string,
  reference: Date,
): Promise<PortalBillingAccessResult | null> {
  const account = await prisma.billingBusinessAccount.findUnique({
    where: { businessKey },
    select: {
      paymentStatus: true,
      paidAt: true,
      paidThroughPeriodEnd: true,
      billingAnchorAt: true,
    },
  });

  const platformSettings = await getPlatformSettings();
  const billingAnchorAt = await resolveBillingAnchorForBusinessKey(
    businessKey,
    account?.billingAnchorAt,
  );

  return resolvePortalBillingAccess(
    {
      paymentStatus: account?.paymentStatus ?? "UNPAID",
      paidAt: account?.paidAt ?? null,
      paidThroughPeriodEnd: account?.paidThroughPeriodEnd ?? null,
      billingAnchorAt,
      restrictPortalOnOverdue: platformSettings.billing.restrictPortalOnOverdue,
    },
    reference,
  );
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

  const access = await loadBillingAccessBase(business.businessKey, reference);
  if (!access) return null;

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

  const access = await loadBillingAccessBase(businessKey, reference);
  if (!access) return null;

  return {
    ...access,
    businessKey,
    businessName: account?.businessName ?? null,
    paymentStatus: account?.paymentStatus ?? "UNPAID",
    paidAt: account?.paidAt?.toISOString() ?? null,
  };
}

export async function getPortalBillingAccessForRole(
  storeId: string,
  role: AppSession["role"],
  reference = new Date(),
): Promise<(PortalBillingAccessForRole & PortalBillingAccessDto) | null> {
  const access = await getPortalBillingAccessForStore(storeId, reference);
  if (!access) return null;
  return {
    ...access,
    ...applyPortalBillingAccessForRole(access, role),
  };
}
