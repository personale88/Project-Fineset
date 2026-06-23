import { z } from "zod";
import { passwordPolicySchema } from "@/lib/auth/password-policy";
import { phoneSchema } from "@/lib/validations/common.schema";
import { ADMIN_PERMISSION_KEYS } from "@/lib/auth/admin-permissions";
import type { AdminPermissions } from "@/types";

const adminPermissionsSchema = z
  .object(
    Object.fromEntries(
      ADMIN_PERMISSION_KEYS.map((key) => [key, z.boolean().optional()]),
    ),
  )
  .optional();

const internalTeamRoleSchema = z.enum(["MASTER_ADMIN", "PLATFORM_ADMIN"]);

const permissionsRefine = (
  data: {
    role?: z.infer<typeof internalTeamRoleSchema>;
    permissions?: z.infer<typeof adminPermissionsSchema>;
  },
  ctx: z.RefinementCtx,
) => {
  if (data.role === "MASTER_ADMIN") return;

  const permissions = data.permissions ?? {};
  const hasAny = ADMIN_PERMISSION_KEYS.some((key) => permissions[key] === true);
  if (!hasAny) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Select at least one portal permission",
      path: ["permissions"],
    });
  }
};

export const platformAdminInviteSchema = z
  .object({
    name: z.string().min(1).max(100),
    email: z.string().email().max(255),
    phone: phoneSchema,
    password: passwordPolicySchema.optional(),
    role: internalTeamRoleSchema.default("PLATFORM_ADMIN"),
    permissions: adminPermissionsSchema,
  })
  .superRefine(permissionsRefine);

export const addInternalTeamFormSchema = z
  .object({
    name: z.string().min(1).max(100),
    email: z.string().email().max(255),
    phone: phoneSchema,
    password: passwordPolicySchema,
    role: internalTeamRoleSchema,
    permissions: adminPermissionsSchema,
  })
  .superRefine(permissionsRefine);

export type AddInternalTeamFormInput = z.infer<typeof addInternalTeamFormSchema>;

export type PlatformAdminInviteInput = z.infer<typeof platformAdminInviteSchema>;

export const platformAdminUpdateSchema = z.object({
  isActive: z.boolean().optional(),
  permissions: adminPermissionsSchema,
  name: z.string().min(1).max(100).optional(),
});

export type PlatformAdminUpdateInput = z.infer<typeof platformAdminUpdateSchema>;

export type PlatformAdminRow = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: "MASTER_ADMIN" | "PLATFORM_ADMIN";
  isActive: boolean;
  permissions: AdminPermissions;
  lastLoginAt: string | null;
  createdAt: string;
};

export type PlatformAdminInviteResult = {
  member: PlatformAdminRow;
  emailSent: boolean;
};
