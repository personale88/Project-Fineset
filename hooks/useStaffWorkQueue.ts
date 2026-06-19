import { useQuery } from "@tanstack/react-query";
import { getStaffDigest, getStaffWorkQueue } from "@/lib/api/staff-portal";
import { LIVE_QUERY_OPTIONS } from "@/lib/sync/constants";

export function useStaffWorkQueue(limit = 15) {
  return useQuery({
    queryKey: ["staff-work-queue", limit],
    queryFn: () => getStaffWorkQueue(limit),
    ...LIVE_QUERY_OPTIONS,
  });
}

export function useStaffDigest() {
  return useQuery({
    queryKey: ["staff-digest"],
    queryFn: getStaffDigest,
    ...LIVE_QUERY_OPTIONS,
  });
}
