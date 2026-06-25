import { apiFetch, buildQueryString } from "@/lib/api/client";
import type { AnalyticsCreditsSnapshot } from "@/lib/services/analytics-credits";
import type { BillingPaymentSubmissionDto } from "@/lib/services/billing-payment-submissions";
import type { PortalPayNowDto } from "@/lib/services/portal-billing-details";
import type { AnalyticsCreditPack } from "@/lib/analytics/credit-units";

export type { AnalyticsCreditsSnapshot };

export interface AnalyticsCreditRechargePreview {
  pack: AnalyticsCreditPack;
  payNow: PortalPayNowDto;
}

export interface AnalyticsCreditRechargeSubmitResult {
  submission: BillingPaymentSubmissionDto;
  snapshot: AnalyticsCreditsSnapshot;
}

export async function fetchAnalyticsCredits(): Promise<AnalyticsCreditsSnapshot> {
  return apiFetch<AnalyticsCreditsSnapshot>("/api/analytics/admin/credits");
}

export async function fetchAnalyticsCreditRechargePreview(
  packId: string,
): Promise<AnalyticsCreditRechargePreview> {
  return apiFetch<AnalyticsCreditRechargePreview>(
    `/api/analytics/admin/credits/recharge${buildQueryString({ packId })}`,
  );
}

export async function submitAnalyticsCreditRecharge(
  packId: string,
): Promise<AnalyticsCreditRechargeSubmitResult> {
  return apiFetch<AnalyticsCreditRechargeSubmitResult>("/api/analytics/admin/credits/recharge", {
    method: "POST",
    body: JSON.stringify({ packId }),
  });
}

export async function grantAnalyticsCredits(input: {
  credits: number;
  description?: string;
}): Promise<AnalyticsCreditsSnapshot> {
  return apiFetch<AnalyticsCreditsSnapshot>("/api/analytics/admin/credits/grant", {
    method: "POST",
    body: JSON.stringify(input),
  });
}
