import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createStaff, deleteStaff, getStaff, importStaffCsv, updateStaff } from "@/lib/api/staff";
import { invalidatePortalData } from "@/lib/sync/invalidate-portal-data";
import { LIVE_QUERY_OPTIONS, queryOptionsForHydration } from "@/lib/sync/constants";
import type { CreateStaffInput, UpdateStaffInput } from "@/lib/validations/staff.schema";

type StoreStaffList = Awaited<ReturnType<typeof getStaff>>;

interface UseStoreStaffOptions {
  initialData?: StoreStaffList;
}

export function useStoreStaff(
  storeId?: string,
  options?: UseStoreStaffOptions,
) {
  const isHydrated = options?.initialData !== undefined;

  return useQuery({
    queryKey: ["staff", "store", storeId],
    queryFn: () => getStaff(storeId),
    enabled: Boolean(storeId),
    initialData: options?.initialData,
    ...LIVE_QUERY_OPTIONS,
    ...queryOptionsForHydration(isHydrated),
  });
}

export function useCreateStaff(storeId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateStaffInput) => createStaff(payload, storeId),
    onSuccess: () => {
      void invalidatePortalData(queryClient);
    },
  });
}

export function useUpdateStaff(storeId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      staffId,
      payload,
    }: {
      staffId: string;
      payload: UpdateStaffInput;
    }) => updateStaff(staffId, payload, storeId),
    onSuccess: () => {
      void invalidatePortalData(queryClient);
    },
  });
}

export function useDeleteStaff(storeId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (staffId: string) => deleteStaff(staffId, storeId),
    onSuccess: () => {
      void invalidatePortalData(queryClient);
    },
  });
}

export function useImportStaffCsv(storeId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (file: File) => importStaffCsv(file, storeId),
    onSuccess: () => {
      void invalidatePortalData(queryClient);
    },
  });
}
