export interface PlatformSettingsGeneral {
  platformName: string;
  supportEmail: string;
  supportPhone: string;
  paymentUpiVpa: string;
  defaultTimezone: string;
}

export interface PlatformSettingsBilling {
  gstRatePercent: number;
  tier1MaxStaff: number;
  tier2MaxStaff: number;
  tier3MaxStaff: number;
  tier4MaxStaff: number;
  tier1MonthlyPrice: number;
  tier2MonthlyPrice: number;
  tier3MonthlyPrice: number;
  tier4MonthlyPrice: number;
  restrictPortalOnOverdue: boolean;
}

export interface PlatformSettingsSecurity {
  /** null = follow ALLOW_ADMIN_IMPERSONATION env / dev default */
  impersonationOverride: boolean | null;
  auditLogRetentionDays: number;
}

export interface PlatformSettingsAnalytics {
  enabled: boolean;
  tokensPerCredit: number;
  lowBalanceThreshold: number;
  welcomeCreditsForNewAdmins: number;
}

export interface PlatformSettingsOnboarding {
  defaultDataExpiryMonths: number;
  defaultRenewalMonths: number;
}

export interface PlatformSettings {
  general: PlatformSettingsGeneral;
  billing: PlatformSettingsBilling;
  security: PlatformSettingsSecurity;
  analytics: PlatformSettingsAnalytics;
  onboarding: PlatformSettingsOnboarding;
}

export interface PlatformIntegrationStatus {
  smtp: { configured: boolean; host: string | null };
  whatsapp: { configured: boolean; mode: "api" | "deep_links" };
  redis: { configured: boolean };
  gemini: { configured: boolean };
  paymentProvider: { provider: string; configured: boolean };
  cron: { secretConfigured: boolean };
  database: { connected: boolean };
  impersonationEnvDefault: boolean;
}

export interface PlatformSettingsMeta {
  updatedAt: string | null;
  updatedByEmail: string | null;
  integrations: PlatformIntegrationStatus;
}

export interface PlatformSettingsResponse {
  settings: PlatformSettings;
  meta: PlatformSettingsMeta;
}

export interface StoreCategoryOptionDto {
  name: string;
  label: string;
  storeCount: number;
  isBuiltin: boolean;
  hiddenFromPicker: boolean;
}

export type { StoreCategoryChoice } from "@/lib/store-category/catalog";
