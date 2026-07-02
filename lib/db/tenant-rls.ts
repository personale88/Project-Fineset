import { AsyncLocalStorage } from "node:async_hooks";
import type { PrismaClient } from "@prisma/client";
import type { AppSession } from "@/types";

export type TenantRlsContext = {
  bypassRls: boolean;
  storeIds: string[];
};

const tenantRlsStorage = new AsyncLocalStorage<TenantRlsContext>();

export function isTenantRlsEnabled(): boolean {
  return process.env.ENABLE_TENANT_RLS?.trim().toLowerCase() === "true";
}

export function getTenantRlsContext(): TenantRlsContext | undefined {
  return tenantRlsStorage.getStore();
}

export function runWithTenantRlsContext<T>(
  context: TenantRlsContext,
  fn: () => T | Promise<T>,
): T | Promise<T> {
  return tenantRlsStorage.run(context, fn);
}

export function tenantRlsContextFromSession(session: AppSession): TenantRlsContext {
  if (session.role === "MASTER_ADMIN" || session.role === "PLATFORM_ADMIN") {
    return { bypassRls: true, storeIds: [] };
  }

  if ("storeId" in session && session.storeId) {
    return { bypassRls: false, storeIds: [session.storeId] };
  }

  return { bypassRls: true, storeIds: [] };
}

export function resolveTenantRlsContext(): TenantRlsContext {
  const explicit = getTenantRlsContext();
  if (explicit) return explicit;
  // Cron jobs, migrations, and seeds run without a portal session.
  return { bypassRls: true, storeIds: [] };
}

export async function applyTenantRlsSessionSettings(
  client: Pick<PrismaClient, "$executeRaw">,
  context: TenantRlsContext,
): Promise<void> {
  const bypass = context.bypassRls ? "true" : "false";
  const storeIds = context.storeIds.filter(Boolean).join(",");
  await client.$executeRaw`SELECT set_config('app.bypass_rls', ${bypass}, true)`;
  await client.$executeRaw`SELECT set_config('app.store_ids', ${storeIds}, true)`;
}
