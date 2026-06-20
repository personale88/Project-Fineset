import {
  BUSINESS_OWNER_DASHBOARD_PATH,
  STORE_MANAGER_DASHBOARD_PATH,
} from "@/lib/auth/routes";

const SELECTED_STORE_STORAGE_KEY = "fineset-manager-selected-store-id";

export { SELECTED_STORE_STORAGE_KEY };
export { BUSINESS_OWNER_DASHBOARD_PATH, STORE_MANAGER_DASHBOARD_PATH };

export function appendStoreQuery(
  path: string,
  storeId?: string | null,
): string {
  if (!storeId) return path;
  const [base, search = ""] = path.split("?");
  const params = new URLSearchParams(search);
  params.set("storeId", storeId);
  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
}

export function portalDashboardPath(
  role: "STORE_MANAGER" | "BUSINESS_OWNER",
): string {
  return role === "STORE_MANAGER"
    ? STORE_MANAGER_DASHBOARD_PATH
    : BUSINESS_OWNER_DASHBOARD_PATH;
}

export function storeDetailPath(storeId: string): string {
  return `${BUSINESS_OWNER_DASHBOARD_PATH}/stores/${storeId}`;
}

export function storeManagerDetailPath(storeId: string): string {
  return `${STORE_MANAGER_DASHBOARD_PATH}/stores/${storeId}`;
}

export function storeDetailPathForRole(
  storeId: string,
  role: "STORE_MANAGER" | "BUSINESS_OWNER",
): string {
  return role === "STORE_MANAGER"
    ? storeManagerDetailPath(storeId)
    : storeDetailPath(storeId);
}

export function storeDetailHref(storeId: string, period?: string): string {
  const path = storeDetailPath(storeId);
  if (!period) return path;
  return `${path}?period=${encodeURIComponent(period)}`;
}

export function storeDetailHrefForRole(
  storeId: string,
  role: "STORE_MANAGER" | "BUSINESS_OWNER",
  period?: string,
): string {
  const path = storeDetailPathForRole(storeId, role);
  if (!period) return path;
  return `${path}?period=${encodeURIComponent(period)}`;
}

export function portalSectionPath(
  section:
    | "visits"
    | "calls"
    | "field-sales"
    | "staff"
    | "follow-ups"
    | "audit"
    | "activity",
  role: "STORE_MANAGER" | "BUSINESS_OWNER",
  storeId?: string | null,
): string {
  const base = `${portalDashboardPath(role)}/${section}`;
  return appendStoreQuery(base, storeId);
}

export function storeManagerDashboardHref(): string {
  return STORE_MANAGER_DASHBOARD_PATH;
}

export type ManagerHomeHub = "team" | "my-work";

export function storeManagerHomeHubHref(hub: ManagerHomeHub): string {
  return `${STORE_MANAGER_DASHBOARD_PATH}?hub=${hub}`;
}

export function storeManagerMyWorkHubHref(): string {
  return storeManagerHomeHubHref("my-work");
}

export function storeManagerTeamHubHref(): string {
  return storeManagerHomeHubHref("team");
}

export function portalListBackHref(
  role: "STORE_MANAGER" | "BUSINESS_OWNER",
  storeId: string,
): string {
  return role === "STORE_MANAGER"
    ? storeManagerTeamHubHref()
    : storeDetailPathForRole(storeId, role);
}

export function storeDetailBackLabel(
  role: "STORE_MANAGER" | "BUSINESS_OWNER",
  labels: { backToPortal: string; backToPortfolio: string },
): string {
  return role === "STORE_MANAGER" ? labels.backToPortal : labels.backToPortfolio;
}

export function parseStoreIdFromPath(pathname: string): string | null {
  const match = pathname.match(
    /^\/(?:business-owner\/dashboard|store-manager\/dashboard)\/stores\/([^/]+)/,
  );
  return match?.[1] ?? null;
}
