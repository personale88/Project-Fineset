import { apiFetch } from "@/lib/api/client";
import type { AnalyticsCreditsSnapshot } from "@/lib/services/analytics-credits";

export type { AnalyticsCreditsSnapshot };

export async function fetchAnalyticsCredits(): Promise<AnalyticsCreditsSnapshot> {
  return apiFetch<AnalyticsCreditsSnapshot>("/api/analytics/admin/credits");
}

export async function rechargeAnalyticsCredits(
  packId: string,
): Promise<AnalyticsCreditsSnapshot> {
  return apiFetch<AnalyticsCreditsSnapshot>("/api/analytics/admin/credits/recharge", {
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
