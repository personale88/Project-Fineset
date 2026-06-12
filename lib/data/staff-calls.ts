import { cache } from "react";
import { getServerSession, requireRole } from "@/lib/auth/session";
import {
  requirePortalActorContext,
  requireStaffContext,
  requireStaffCallsContext,
} from "@/lib/auth/resolve-staff";
import { listStaffCalls } from "@/lib/services/staff-calls";
import { defaultStaffCallsParams } from "@/lib/query/initial-data";
import type { GetStaffCallsParams, StaffCallListResponse } from "@/types";

export interface InitialStaffCallsPayload {
  params: GetStaffCallsParams;
  data: StaffCallListResponse;
}

export const fetchInitialStaffCalls = cache(
  async (
    overrides: GetStaffCallsParams = {},
  ): Promise<InitialStaffCallsPayload | null> => {
    const session = await getServerSession();
    if (!requireRole(session, ["STAFF"])) return null;

    const staff = await requireStaffContext(session);
    if (!staff) return null;

    const params = defaultStaffCallsParams();
    const merged: GetStaffCallsParams = { ...params, ...overrides };

    const data = await listStaffCalls({
      staffId: staff.staffId,
      storeId: staff.storeId,
      master: merged.master ?? "ALL",
      segment: merged.segment ?? "ALL",
      valueTier: merged.valueTier ?? "ALL",
      queue: merged.queue ?? "ALL",
      birthday: merged.birthday ?? "ALL",
      anniversary: merged.anniversary ?? "ALL",
      year: merged.year ?? new Date().getFullYear(),
      month: merged.month ?? new Date().getMonth() + 1,
      page: merged.page ?? 1,
      pageSize: merged.pageSize ?? 15,
    });

    return { params: merged, data };
  },
);

export const fetchInitialStoreManagerCalls = cache(
  async (
    overrides: GetStaffCallsParams = {},
  ): Promise<InitialStaffCallsPayload | null> => {
    const session = await getServerSession();
    if (!requireRole(session, ["STORE_MANAGER"])) return null;

    const staff = await requirePortalActorContext(session);
    if (!staff) return null;

    const params = defaultStaffCallsParams();
    const merged: GetStaffCallsParams = { ...params, ...overrides };

    const data = await listStaffCalls({
      staffId: staff.staffId,
      storeId: staff.storeId,
      master: merged.master ?? "ALL",
      segment: merged.segment ?? "ALL",
      valueTier: merged.valueTier ?? "ALL",
      queue: merged.queue ?? "ALL",
      birthday: merged.birthday ?? "ALL",
      anniversary: merged.anniversary ?? "ALL",
      year: merged.year ?? new Date().getFullYear(),
      month: merged.month ?? new Date().getMonth() + 1,
      page: merged.page ?? 1,
      pageSize: merged.pageSize ?? 15,
    });

    return { params: merged, data };
  },
);

async function listStaffCallsForContext(
  staff: { staffId: string; storeId: string },
  merged: GetStaffCallsParams,
) {
  return listStaffCalls({
    staffId: staff.staffId,
    storeId: staff.storeId,
    master: merged.master ?? "ALL",
    segment: merged.segment ?? "ALL",
    valueTier: merged.valueTier ?? "ALL",
    queue: merged.queue ?? "ALL",
    birthday: merged.birthday ?? "ALL",
    anniversary: merged.anniversary ?? "ALL",
    year: merged.year ?? new Date().getFullYear(),
    month: merged.month ?? new Date().getMonth() + 1,
    page: merged.page ?? 1,
    pageSize: merged.pageSize ?? 15,
  });
}

export const fetchInitialAdminCalls = cache(
  async (
    storeId: string,
    overrides: GetStaffCallsParams = {},
  ): Promise<InitialStaffCallsPayload | null> => {
    const session = await getServerSession();
    if (!requireRole(session, ["MASTER_ADMIN"])) return null;

    const staff = await requireStaffCallsContext(session, storeId);
    if (!staff) return null;

    const params = defaultStaffCallsParams();
    const merged: GetStaffCallsParams = { ...params, ...overrides, storeId };
    const data = await listStaffCallsForContext(staff, merged);

    return { params: merged, data };
  },
);

export const fetchInitialBusinessOwnerCalls = cache(
  async (
    storeId: string,
    overrides: GetStaffCallsParams = {},
  ): Promise<InitialStaffCallsPayload | null> => {
    const session = await getServerSession();
    if (!requireRole(session, ["BUSINESS_OWNER"])) return null;

    const staff = await requireStaffCallsContext(session, storeId);
    if (!staff) return null;

    const params = defaultStaffCallsParams();
    const merged: GetStaffCallsParams = { ...params, ...overrides, storeId };
    const data = await listStaffCallsForContext(staff, merged);

    return { params: merged, data };
  },
);
