import { ADMIN_DASHBOARD_PATH } from "@/lib/auth/routes";
import { appendStoreQuery } from "@/lib/utils/store-dashboard-url";

export function adminStoreDetailPath(storeId: string): string {
  return `${ADMIN_DASHBOARD_PATH}/accounts/${storeId}`;
}

export function adminStoreDetailHref(storeId: string, period?: string): string {
  const path = adminStoreDetailPath(storeId);
  if (!period) return path;
  return `${path}?period=${encodeURIComponent(period)}`;
}

export function adminSectionPath(
  section: "visits" | "calls" | "field-sales",
  storeId: string,
): string {
  return appendStoreQuery(`${ADMIN_DASHBOARD_PATH}/${section}`, storeId);
}
