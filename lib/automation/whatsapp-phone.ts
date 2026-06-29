import { DEFAULT_PLATFORM_AUTOMATION_CONFIG } from "@/lib/automation/default-config";
import { normalizeWhatsAppPhone } from "@/lib/utils/whatsapp-link";
import { resolveBusinessPhone } from "@/lib/utils/group-stores-by-business";
import type { BusinessPortfolioRow } from "@/types";

export function resolveWhatsAppPhoneForBusiness(
  business: Pick<BusinessPortfolioRow, "stores">,
  countryCode: string = DEFAULT_PLATFORM_AUTOMATION_CONFIG.whatsApp.defaultCountryCode,
): { raw: string; normalized: string } | null {
  const raw = resolveBusinessPhone(business.stores);
  if (!raw) return null;

  const normalized = normalizeWhatsAppPhone(raw, countryCode);
  if (!normalized) return null;

  return { raw, normalized };
}

export function formatNormalizedWhatsAppPhone(normalized: string): string {
  return `+${normalized}`;
}
