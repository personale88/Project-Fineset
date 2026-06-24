export interface PortalBillingAccessState {
  storeId: string;
  businessName: string | null;
  canReadData: boolean;
  isGracePeriod: boolean;
  billingRestricted: boolean;
  metricsBlurred: boolean;
  paymentStatus: string;
  reason: string;
  paymentDeadline: string;
  paymentDeadlineFallback: string;
  billingCycleStart: string;
  billingAnchorAt: string | null;
  consecutiveUnpaidPeriods: number;
  restrictionTier: string;
  viewerRole: "STAFF" | "STORE_MANAGER" | "BUSINESS_OWNER" | "MASTER_ADMIN";
  outstandingGrandTotal: number;
  unpaidPeriodCount: number;
}

export async function fetchPortalBillingAccess(
  storeId?: string,
): Promise<PortalBillingAccessState> {
  const params = storeId ? `?storeId=${encodeURIComponent(storeId)}` : "";
  const res = await fetch(`/api/billing/portal-access${params}`, {
    credentials: "include",
  });
  if (!res.ok) {
    throw new Error("Failed to load billing access");
  }
  return res.json() as Promise<PortalBillingAccessState>;
}
