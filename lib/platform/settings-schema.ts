import { z } from "zod";

const generalSchema = z.object({
  platformName: z.string().trim().min(1).max(80),
  supportEmail: z.string().trim().email().max(120),
  supportPhone: z.string().trim().max(20),
  defaultTimezone: z.string().trim().min(1).max(64),
});

const billingFieldsSchema = z.object({
  gstRatePercent: z.number().min(0).max(100),
  tier1MaxStaff: z.number().int().min(1).max(500),
  tier2MaxStaff: z.number().int().min(1).max(500),
  tier1MonthlyPrice: z.number().int().min(0).max(10_000_000),
  tier2MonthlyPrice: z.number().int().min(0).max(10_000_000),
  tier3MonthlyPrice: z.number().int().min(0).max(10_000_000),
  restrictPortalOnOverdue: z.boolean(),
});

const billingSchema = billingFieldsSchema.refine(
  (value) => value.tier1MaxStaff < value.tier2MaxStaff,
  {
    message: "Tier 1 staff limit must be less than tier 2.",
    path: ["tier2MaxStaff"],
  },
);

const securitySchema = z.object({
  impersonationOverride: z.boolean().nullable(),
  auditLogRetentionDays: z.number().int().min(30).max(3650),
});

const analyticsSchema = z.object({
  enabled: z.boolean(),
  tokensPerCredit: z.number().int().min(100).max(100_000),
  lowBalanceThreshold: z.number().int().min(0).max(10_000),
  welcomeCreditsForNewAdmins: z.number().int().min(0).max(100_000),
});

const onboardingSchema = z.object({
  defaultDataExpiryMonths: z.number().int().min(1).max(120),
  defaultRenewalMonths: z.number().int().min(1).max(120),
});

export const platformSettingsSchema = z.object({
  general: generalSchema,
  billing: billingSchema,
  security: securitySchema,
  analytics: analyticsSchema,
  onboarding: onboardingSchema,
});

export const platformSettingsPatchSchema = z
  .object({
    general: generalSchema.partial().optional(),
    billing: billingFieldsSchema.partial().optional(),
    security: securitySchema.partial().optional(),
    analytics: analyticsSchema.partial().optional(),
    onboarding: onboardingSchema.partial().optional(),
  })
  .refine(
    (value) =>
      value.general !== undefined ||
      value.billing !== undefined ||
      value.security !== undefined ||
      value.analytics !== undefined ||
      value.onboarding !== undefined,
    { message: "At least one settings section must be provided." },
  );

export type PlatformSettingsPatchInput = z.infer<typeof platformSettingsPatchSchema>;

export const storeCategoryCreateSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2)
    .max(48)
    .regex(/^[a-zA-Z0-9][a-zA-Z0-9\s&\-/'.]*$/, {
      message: "Use letters, numbers, spaces, and common punctuation only.",
    }),
});

export const storeCategoryDeleteSchema = z.object({
  name: z.string().trim().min(1).max(48),
});

export const storeCategoryUpdateSchema = z
  .object({
    name: z.string().trim().min(1).max(48),
    label: z
      .string()
      .trim()
      .min(2)
      .max(48)
      .regex(/^[a-zA-Z0-9][a-zA-Z0-9\s&\-/'.]*$/, {
        message: "Use letters, numbers, spaces, and common punctuation only.",
      })
      .optional(),
    newName: z
      .string()
      .trim()
      .min(2)
      .max(48)
      .regex(/^[a-zA-Z0-9][a-zA-Z0-9\s&\-/'.]*$/, {
        message: "Use letters, numbers, spaces, and common punctuation only.",
      })
      .optional(),
  })
  .refine((value) => value.label !== undefined || value.newName !== undefined, {
    message: "Provide a label or new name to update.",
  });

export const storeCategoryRestoreSchema = z.object({
  name: z.string().trim().min(1).max(48),
});
