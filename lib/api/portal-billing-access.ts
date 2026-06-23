export interface PortalBillingAccessState {
  storeId: string;
  businessName: string | null;
  canReadData: boolean;
  isGracePeriod: boolean;
  billingRestricted: boolean;
  paymentStatus: string;
  reason: string;
  paymentDeadline: string;
  paymentDeadlineFallback: string;
  billingCycleStart: string;
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
