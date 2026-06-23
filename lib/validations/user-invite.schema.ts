import { passwordPolicySchema } from "@/lib/auth/password-policy";
import { phoneSchema } from "@/lib/validations/common.schema";
import { z } from "zod";

const appRoleSchema = z.enum([
  "MASTER_ADMIN",
  "PLATFORM_ADMIN",
  "BUSINESS_OWNER",
  "STORE_MANAGER",
  "STAFF",
]);

export const inviteUserSchema = z
  .object({
    name: z.string().min(1).max(100),
    email: z.string().email().max(255),
    role: appRoleSchema,
    storeId: z.string().cuid().optional(),
    employeeId: z
      .string()
      .min(3)
      .max(20)
      .regex(/^[A-Z0-9]+$/)
      .optional(),
    password: passwordPolicySchema.optional(),
    phone: phoneSchema.optional(),
    permissions: z
      .object({
        portfolio: z.boolean().optional(),
        accounts: z.boolean().optional(),
        analytics: z.boolean().optional(),
        billing: z.boolean().optional(),
      })
      .optional(),
  })
  .superRefine((data, ctx) => {
    if (data.role === "STAFF" && !data.employeeId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Employee ID is required for staff invites",
        path: ["employeeId"],
      });
    }
    if (
      (data.role === "STAFF" ||
        data.role === "STORE_MANAGER" ||
        data.role === "BUSINESS_OWNER") &&
      !data.storeId
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Store is required for this role",
        path: ["storeId"],
      });
    }
    if (data.role === "MASTER_ADMIN" && data.storeId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Admin users cannot be assigned to a store",
        path: ["storeId"],
      });
    }
    if (data.role === "PLATFORM_ADMIN" && data.storeId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Platform admin users cannot be assigned to a store",
        path: ["storeId"],
      });
    }
  });

export type InviteUserInput = z.infer<typeof inviteUserSchema>;

export const storeInviteUserSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email().max(255),
  employeeId: z
    .string()
    .min(3)
    .max(20)
    .regex(/^[A-Z0-9]+$/, "Employee ID must be uppercase alphanumeric"),
  password: passwordPolicySchema,
});

export type StoreInviteUserInput = z.infer<typeof storeInviteUserSchema>;
