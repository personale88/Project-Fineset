import { getAutomationConfig } from "@/lib/services/automation-config";
import { toBillingCycleSettings } from "@/lib/automation/merge-config";
import type { BillingCycleSettings } from "@/lib/utils/billing-cycle";
import { DEFAULT_BILLING_CYCLE_SETTINGS } from "@/lib/utils/billing-cycle";

export async function getBillingCycleSettings(): Promise<BillingCycleSettings> {
  try {
    const config = await getAutomationConfig();
    return toBillingCycleSettings(config);
  } catch {
    return DEFAULT_BILLING_CYCLE_SETTINGS;
  }
}

export function billingCycleMonthKey(reference: Date): string {
  return `${reference.getFullYear()}-${String(reference.getMonth() + 1).padStart(2, "0")}`;
}
