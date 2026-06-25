import type { PlatformSettings } from "@/lib/platform/types";

export const DEFAULT_PLATFORM_SETTINGS: PlatformSettings = {
  general: {
    platformName: "FineSet",
    supportEmail: "connect@tribly.ai",
    supportPhone: "",
    paymentUpiVpa: "fineset@paytm",
    defaultTimezone: "Asia/Kolkata",
  },
  billing: {
    gstRatePercent: 18,
    tier1MaxStaff: 10,
    tier2MaxStaff: 20,
    tier3MaxStaff: 30,
    tier4MaxStaff: 40,
    tier1MonthlyPrice: 4999,
    tier2MonthlyPrice: 8999,
    tier3MonthlyPrice: 12999,
    tier4MonthlyPrice: 19999,
    restrictPortalOnOverdue: true,
  },
  security: {
    impersonationOverride: null,
    auditLogRetentionDays: 365,
  },
  analytics: {
    enabled: true,
    tokensPerCredit: 1000,
    lowBalanceThreshold: 5,
    welcomeCreditsForNewAdmins: 50,
  },
  onboarding: {
    defaultDataExpiryMonths: 12,
    defaultRenewalMonths: 12,
  },
};
