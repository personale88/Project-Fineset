import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";

export type AuthAuditEvent =
  | "LOGIN_SUCCESS"
  | "LOGIN_FAILED"
  | "LOGOUT"
  | "INVITE_SENT"
  | "INVITE_FAILED"
  | "USER_CREATED_WITH_PASSWORD"
  | "USER_ACTIVATED"
  | "AUTH_ID_LINKED"
  | "USER_DEACTIVATED"
  | "PASSWORD_RESET_REQUESTED"
  | "PASSWORD_RESET_COMPLETED"
  | "INVITE_COMPLETED"
  | "UNAUTHORIZED_ACCESS"
  | "STORE_SOFT_DELETED"
  | "STORE_RESTORED"
  | "STAFF_CREATED"
  | "VISIT_IMPORT"
  | "CUSTOMER_MERGED"
  | "STAFF_RECORD_AMENDED"
  | "STAFF_CORRECTION_REQUEST";

interface LogAuthEventParams {
  event: AuthAuditEvent;
  authId?: string | null;
  email?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, unknown>;
}

export async function logAuthEvent(params: LogAuthEventParams): Promise<void> {
  try {
    await prisma.authAuditLog.create({
      data: {
        event: params.event,
        authId: params.authId ?? undefined,
        email: params.email ?? undefined,
        ip: params.ip ?? undefined,
        userAgent: params.userAgent ?? undefined,
        metadata: (params.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
      },
    });
  } catch (error) {
    console.error("[auth-audit]", params.event, error);
  }
}
