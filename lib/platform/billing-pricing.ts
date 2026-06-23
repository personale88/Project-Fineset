import { getPlatformSettings } from "@/lib/services/platform-settings";
import { billingPricingFromSettings } from "@/lib/utils/store-billing-pricing";

export async function getActiveBillingPricingConfig() {
  const settings = await getPlatformSettings();
  return billingPricingFromSettings(settings.billing);
}
