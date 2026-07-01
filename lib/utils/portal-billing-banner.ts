import type { AppSession } from "@/types";
import type { PortalBillingRestrictionTier } from "@/lib/utils/portal-billing-access";
import { formatCurrency } from "@/lib/utils/formatters";

export interface PortalBillingBannerCopy {
  showRestrictionBanner: boolean;
  showStaffInfoBanner: boolean;
  tone: "warning" | "error" | "info";
  title: string;
  body: string;
  hint: string | null;
}

interface ResolvePortalBillingBannerParams {
  role: AppSession["role"];
  metricsBlurred: boolean;
  restrictionTier: PortalBillingRestrictionTier;
  consecutiveUnpaidPeriods: number;
  paymentDeadlineLabel: string;
  outstandingGrandTotal: number;
  unpaidPeriodCount: number;
  copy: {
    restrictedTitle: string;
    restrictedBodyOnePeriod: string;
    restrictedBodyMultiPeriod: string;
    restrictedEntryHintOnePeriod: string;
    restrictedEntryHintMultiPeriod: string;
    restrictedCriticalTitle: string;
    restrictedCriticalBody: string;
    staffOverdueInfoTitle: string;
    staffOverdueInfoBody: string;
  };
}

export function resolvePortalBillingBanner(
  params: ResolvePortalBillingBannerParams,
): PortalBillingBannerCopy {
  const {
    role,
    metricsBlurred,
    restrictionTier,
    consecutiveUnpaidPeriods,
    paymentDeadlineLabel,
    outstandingGrandTotal,
    unpaidPeriodCount,
    copy,
  } = params;

  if (
    !metricsBlurred &&
    restrictionTier === "LEADERS_RESTRICTED_STAFF_OK" &&
    role === "STAFF"
  ) {
    return {
      showRestrictionBanner: false,
      showStaffInfoBanner: true,
      tone: "info",
      title: copy.staffOverdueInfoTitle,
      body: copy.staffOverdueInfoBody,
      hint: null,
    };
  }

  if (!metricsBlurred) {
    return {
      showRestrictionBanner: false,
      showStaffInfoBanner: false,
      tone: "info",
      title: "",
      body: "",
      hint: null,
    };
  }

  const amountLabel = formatCurrency(outstandingGrandTotal);
  const periodCount = Math.max(unpaidPeriodCount, consecutiveUnpaidPeriods, 1);
  const isCritical = consecutiveUnpaidPeriods >= 2;

  if (isCritical) {
    return {
      showRestrictionBanner: true,
      showStaffInfoBanner: false,
      tone: "error",
      title: copy.restrictedCriticalTitle,
      body: copy.restrictedCriticalBody
        .replace("{count}", String(periodCount))
        .replace("{amount}", amountLabel),
      hint: copy.restrictedEntryHintMultiPeriod,
    };
  }

  return {
    showRestrictionBanner: true,
    showStaffInfoBanner: false,
    tone: "warning",
    title: copy.restrictedTitle,
    body:
      periodCount > 1
        ? copy.restrictedBodyMultiPeriod
            .replace("{count}", String(periodCount))
            .replace("{amount}", amountLabel)
            .replace("{deadline}", paymentDeadlineLabel)
        : copy.restrictedBodyOnePeriod.replace("{deadline}", paymentDeadlineLabel),
    hint:
      periodCount > 1
        ? copy.restrictedEntryHintMultiPeriod
        : copy.restrictedEntryHintOnePeriod,
  };
}
