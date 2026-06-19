import { cookies } from "next/headers";
import { logAuthEvent } from "@/lib/auth/audit";
import type { AppSession } from "@/types";

export const IMPERSONATION_COOKIE = "fineset-impersonate-store";

export function isImpersonationAllowed(): boolean {
  if (process.env.ALLOW_ADMIN_IMPERSONATION === "true") return true;
  return process.env.NODE_ENV !== "production";
}

export async function startStoreImpersonation(params: {
  adminSession: AppSession;
  storeId: string;
  storeName: string;
}): Promise<void> {
  if (!isImpersonationAllowed()) {
    throw new Error("Impersonation is disabled");
  }
  if (params.adminSession.role !== "MASTER_ADMIN") {
    throw new Error("Only admins can impersonate");
  }

  const cookieStore = await cookies();
  cookieStore.set(IMPERSONATION_COOKIE, params.storeId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60,
  });

  await logAuthEvent({
    event: "UNAUTHORIZED_ACCESS",
    email: params.adminSession.email,
    metadata: {
      action: "IMPERSONATE_STORE_START",
      storeId: params.storeId,
      storeName: params.storeName,
    },
  });
}

export async function stopStoreImpersonation(adminEmail: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(IMPERSONATION_COOKIE);
  await logAuthEvent({
    event: "LOGOUT",
    email: adminEmail,
    metadata: { action: "IMPERSONATE_STORE_STOP" },
  });
}
