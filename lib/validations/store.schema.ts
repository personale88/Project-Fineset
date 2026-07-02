import { z } from "zod";
import { passwordPolicySchema } from "@/lib/auth/password-policy";
import { formatCalendarDate, isCalendarDateString, parseCalendarDate } from "@/lib/utils/calendar-date";
import { paginationQuerySchema, periodQuerySchema } from "./common.schema";

const storeCategorySchema = z.enum(["JEWELRY", "HANDBAGS", "WATCHES", "OTHER"]);

function parseOptionalCalendarDate(value: string): Date | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (isCalendarDateString(trimmed)) return parseCalendarDate(trimmed);
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error("Invalid date");
  }
  return parseCalendarDate(formatCalendarDate(parsed));
}

const optionalCalendarDateField = z
  .string()
  .optional()
  .transform((value) => {
    if (value === undefined || value.trim() === "") return undefined;
    try {
      return parseOptionalCalendarDate(value) ?? undefined;
    } catch {
      return undefined;
    }
  });

const nullableCalendarDateField = z
  .union([z.string(), z.null()])
  .optional()
  .transform((value) => {
    if (value === undefined) return undefined;
    if (value === null) return null;
    try {
      return parseOptionalCalendarDate(value);
    } catch {
      return null;
    }
  });

export const createStoreSchema = z
  .object({
    name: z.string().min(1).max(100),
    category: storeCategorySchema.default("JEWELRY"),
    customCategory: z.string().min(1).max(100).optional(),
    city: z.string().min(1).max(100),
    state: z.string().min(1).max(100),
    pincode: z
      .string()
      .transform((v) => v.trim())
      .refine((v) => v === "" || /^\d{6}$/.test(v), {
        message: "Pincode must be a 6-digit number",
      })
      .transform((v) => (v === "" ? undefined : v)),
    businessOwnerName: z.string().min(1).max(100).transform((v) => v.trim()),
    businessOwnerEmail: z
      .string()
      .transform((v) => v.trim())
      .refine((v) => v === "" || z.string().email().safeParse(v).success, {
        message: "Enter a valid email address",
      })
      .transform((v) => (v === "" ? undefined : v)),
    password: z
      .string()
      .transform((v) => v.trim())
      .transform((v) => (v === "" ? undefined : v))
      .optional(),
    dataExpiryAt: z.string().optional().transform((value) => value?.trim() ?? ""),
    renewalDueAt: z.string().optional().transform((value) => value?.trim() ?? ""),
  })
  .superRefine((data, ctx) => {
    if (data.password) {
      const passwordCheck = passwordPolicySchema.safeParse(data.password);
      if (!passwordCheck.success) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: passwordCheck.error.issues[0]?.message ?? "Invalid password",
          path: ["password"],
        });
      }
      if (!data.businessOwnerEmail) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Business owner email is required when setting a password",
          path: ["businessOwnerEmail"],
        });
      }
    }
  });

export const editStoreSchema = z.object({
  name: z.string().min(1).max(100),
  category: storeCategorySchema,
  customCategory: z.string().min(1).max(100).optional(),
  city: z.string().min(1).max(100),
  state: z.string().min(1).max(100),
  pincode: z
    .string()
    .transform((v) => v.trim())
    .refine((v) => v === "" || /^\d{6}$/.test(v), {
      message: "Pincode must be a 6-digit number",
    })
    .transform((v) => (v === "" ? undefined : v)),
  businessOwnerName: z.string().min(1).max(100).transform((v) => v.trim()),
  businessOwnerEmail: z
    .string()
    .transform((v) => v.trim())
    .refine((v) => v === "" || z.string().email().safeParse(v).success, {
      message: "Enter a valid email address",
    })
    .transform((v) => (v === "" ? undefined : v)),
  dataExpiryAt: z.string().optional().transform((value) => value?.trim() ?? ""),
  renewalDueAt: z.string().optional().transform((value) => value?.trim() ?? ""),
  latitude: z.string().optional(),
  longitude: z.string().optional(),
  geofenceRadiusMeters: z.string().optional(),
});

export type EditStoreInput = z.infer<typeof editStoreSchema>;

export function parseStoreDateField(value: string | undefined): Date | null | undefined {
  if (value === undefined) return undefined;
  try {
    return parseOptionalCalendarDate(value);
  } catch {
    return null;
  }
}

export const updateStoreSchema = z.object({
  isActive: z.boolean().optional(),
  name: z.string().min(1).max(100).optional(),
  category: storeCategorySchema.optional(),
  customCategory: z.string().min(1).max(100).nullable().optional(),
  city: z.string().min(1).max(100).optional(),
  state: z.string().min(1).max(100).optional(),
  pincode: z
    .string()
    .regex(/^\d{6}$/, "Pincode must be a 6-digit number")
    .nullable()
    .optional(),
  businessOwnerName: z.string().min(1).max(100).nullable().optional(),
  businessOwnerEmail: z.string().email().max(255).nullable().optional(),
  dataExpiryAt: nullableCalendarDateField,
  renewalDueAt: nullableCalendarDateField,
  latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional(),
  geofenceRadiusMeters: z.number().int().min(50).max(100_000).nullable().optional(),
});

export const getStoresQuerySchema = paginationQuerySchema.extend({
  search: z.string().optional(),
  period: periodQuerySchema.optional(),
  activeOnly: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => v !== "false"),
  includeDeleted: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => v === "true"),
});

export type CreateStoreInput = z.infer<typeof createStoreSchema>;
export type UpdateStoreInput = z.infer<typeof updateStoreSchema>;
export type GetStoresQuery = z.infer<typeof getStoresQuerySchema>;
