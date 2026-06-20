import { STAFF_DASHBOARD_PATH } from "@/lib/auth/routes";
import { buildFollowUpsHref } from "@/lib/utils/follow-ups-url";

export interface PortalFormSuccessPaths {
  myVisits: string;
  myFieldSales: string;
  calls: string;
  followUps: string;
}

/** Success links after logging a visit or field sale in a portal. */
export function buildPortalFormSuccessPaths(
  basePath: string = STAFF_DASHBOARD_PATH,
  options?: { managerPersonalRoutes?: boolean },
): PortalFormSuccessPaths {
  const managerPersonal = options?.managerPersonalRoutes ?? false;
  const callsSegment = managerPersonal ? "my-calls" : "calls";
  const followUpsSegment = managerPersonal ? "my-follow-ups" : "follow-ups";

  return {
    myVisits: `${basePath}/my-visits`,
    myFieldSales: `${basePath}/my-field-sales`,
    calls: `${basePath}/${callsSegment}`,
    followUps: buildFollowUpsHref(`${basePath}/${followUpsSegment}`, "open"),
  };
}
