import { staffCallListQuerySchema } from "@/lib/validations/staff-calls.schema";
import { defaultStaffCallsParams } from "@/lib/query/initial-data";
import type { GetStaffCallsParams } from "@/types";

export function parseStaffCallsSearchParams(
  searchParams: Record<string, string | string[] | undefined>,
): GetStaffCallsParams {
  const raw: Record<string, string> = {};
  for (const [key, value] of Object.entries(searchParams)) {
    if (typeof value === "string") raw[key] = value;
  }

  const parsed = staffCallListQuerySchema.safeParse(raw);
  return parsed.success ? parsed.data : defaultStaffCallsParams();
}

export function buildStaffCallsSearchParams(params: GetStaffCallsParams): string {
  const defaults = defaultStaffCallsParams();
  const qs = new URLSearchParams();

  if (params.year != null && params.year !== defaults.year) {
    qs.set("year", String(params.year));
  }
  if (params.month != null && params.month !== defaults.month) {
    qs.set("month", String(params.month));
  }
  if (params.segment && params.segment !== defaults.segment) {
    qs.set("segment", params.segment);
  }
  if (params.valueTier && params.valueTier !== defaults.valueTier) {
    qs.set("valueTier", params.valueTier);
  }
  if (params.queue && params.queue !== defaults.queue) {
    qs.set("queue", params.queue);
  }
  if (params.master && params.master !== defaults.master) {
    qs.set("master", params.master);
  }
  if (params.birthday && params.birthday !== defaults.birthday) {
    qs.set("birthday", params.birthday);
  }
  if (params.anniversary && params.anniversary !== defaults.anniversary) {
    qs.set("anniversary", params.anniversary);
  }
  if (params.page != null && params.page !== defaults.page) {
    qs.set("page", String(params.page));
  }
  if (params.storeId) {
    qs.set("storeId", params.storeId);
  }

  return qs.toString();
}
