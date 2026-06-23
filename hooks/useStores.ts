import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  createStore,
  deleteStore,
  getStoreById,
  getStores,
  restoreStore,
  updateStore,
  updateStoreManagerPassword,
} from "@/lib/api/stores";
import { storesParamsMatch } from "@/lib/query/initial-data";
import { invalidatePortalData } from "@/lib/sync/invalidate-portal-data";
import { LIVE_QUERY_OPTIONS, queryOptionsForHydration } from "@/lib/sync/constants";
import type { CreateStoreInput, UpdateStoreInput } from "@/lib/validations/store.schema";
import type { SoftDeleteStoreInput } from "@/lib/validations/store-delete.schema";
import type { RestoreStoreInput } from "@/lib/validations/store-restore.schema";
import type { UpdateStoreManagerPasswordInput } from "@/lib/validations/store-password.schema";
import type { PaginatedResponse } from "@/types";

interface UseStoresParams {
  page?: number;
  pageSize?: number;
  search?: string;
  includeDeleted?: boolean;
}

type StoreListResponse = PaginatedResponse<{
  id: string;
  name: string;
  category: string;
  customCategory?: string | null;
  city: string;
  state: string;
  pincode?: string | null;
  businessOwnerName?: string | null;
  businessOwnerEmail?: string | null;
  isActive: boolean;
  deletedAt?: string | null;
  purgeAt?: string | null;
  staffCount: number;
  visits: number;
  revenue: number;
  conversionRate: number;
  createdAt: string;
  dataExpiryAt?: string | null;
  renewalDueAt?: string | null;
}>;

interface UseStoresOptions {
  initialData?: StoreListResponse;
  initialParams?: UseStoresParams;
}

function invalidateAdminStoreQueries(queryClient: ReturnType<typeof useQueryClient>) {
  void invalidatePortalData(queryClient);
  void queryClient.invalidateQueries({ queryKey: ["analytics", "admin", "overview"] });
  void queryClient.invalidateQueries({ queryKey: ["portfolio-growth-kpis"] });
  void queryClient.invalidateQueries({ queryKey: ["billing-summaries"] });
}

export function useStores(params: UseStoresParams = {}, options?: UseStoresOptions) {
  const useInitialData =
    options?.initialData &&
    options.initialParams &&
    storesParamsMatch(params, options.initialParams);

  return useQuery({
    queryKey: ["stores", params],
    queryFn: () => getStores(params),
    initialData: useInitialData ? options.initialData : undefined,
    placeholderData: keepPreviousData,
    ...LIVE_QUERY_OPTIONS,
    ...queryOptionsForHydration(Boolean(useInitialData)),
  });
}

export function useStoreDetail(storeId: string | null, enabled = true) {
  return useQuery({
    queryKey: ["stores", "detail", storeId],
    queryFn: () => getStoreById(storeId!),
    enabled: Boolean(storeId) && enabled,
    ...LIVE_QUERY_OPTIONS,
  });
}

export function useCreateStore() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateStoreInput) => createStore(payload),
    onSuccess: () => {
      invalidateAdminStoreQueries(queryClient);
    },
  });
}

export function useUpdateStore() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ storeId, payload }: { storeId: string; payload: UpdateStoreInput }) =>
      updateStore(storeId, payload),
    onSuccess: (_data, variables) => {
      invalidateAdminStoreQueries(queryClient);
      void queryClient.invalidateQueries({
        queryKey: ["stores", "detail", variables.storeId],
      });
    },
  });
}

export function useDeleteStore() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      storeId,
      payload,
    }: {
      storeId: string;
      payload: SoftDeleteStoreInput;
    }) => deleteStore(storeId, payload),
    onSuccess: () => {
      invalidateAdminStoreQueries(queryClient);
    },
  });
}

export function useRestoreStore() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      storeId,
      payload,
    }: {
      storeId: string;
      payload: RestoreStoreInput;
    }) => restoreStore(storeId, payload),
    onSuccess: (_data, variables) => {
      invalidateAdminStoreQueries(queryClient);
      void queryClient.invalidateQueries({
        queryKey: ["stores", "detail", variables.storeId],
      });
    },
  });
}

export function useResetStoreManagerPassword() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      storeId,
      payload,
    }: {
      storeId: string;
      payload: UpdateStoreManagerPasswordInput;
    }) => updateStoreManagerPassword(storeId, payload),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: ["stores", "detail", variables.storeId],
      });
    },
  });
}
