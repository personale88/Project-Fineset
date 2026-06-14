import { cache } from "react";
import { getServerSession, requireRole } from "@/lib/auth/session";
import { resolveAccessibleStoreId } from "@/lib/services/manager-stores";
import { listVisits } from "@/lib/services/visits";
import { DEFAULT_VISITS_PARAMS } from "@/lib/query/initial-data";
import type { GetVisitsParams, PaginatedResponse, VisitListItem } from "@/types";

export interface InitialVisitsPayload {
  params: GetVisitsParams;
  data: PaginatedResponse<VisitListItem>;
}

export const fetchInitialVisits = cache(async function fetchInitialVisits(
  storeIdOverride?: string,
  overrides: GetVisitsParams = {},
): Promise<InitialVisitsPayload | null> {
  const session = await getServerSession();
  if (!requireRole(session, ["STORE_MANAGER", "BUSINESS_OWNER", "MASTER_ADMIN"])) {
    return null;
  }

  const params: GetVisitsParams = { ...DEFAULT_VISITS_PARAMS, ...overrides };
  const page = Number(params.page ?? 1);
  const pageSize = Number(params.pageSize ?? 20);

  let storeId: string | undefined;
  if (session.role === "STORE_MANAGER" || session.role === "BUSINESS_OWNER") {
    storeId = await resolveAccessibleStoreId(
      session,
      storeIdOverride ?? params.storeId,
    );
  } else {
    storeId = storeIdOverride ?? params.storeId;
  }

  const { data, total } = await listVisits({
    storeId,
    page,
    pageSize,
    search: params.search,
    startDate: params.startDate,
    endDate: params.endDate,
    sortBy: params.sortBy ?? "visitDate",
    sortOrder: params.sortOrder ?? "desc",
    followUpOnly: params.followUpOnly === "true",
  });

  return {
    params: { ...params, storeId },
    data: { data, total, page, pageSize },
  };
});
