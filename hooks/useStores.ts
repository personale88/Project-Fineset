import {
  keepPreviousData,
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import {
  createStore,
  deleteStore,
  getStores,
  restoreStore,
  updateStore,
  updateStoreManagerPassword,
} from "@/lib/api/stores";
import { storesParamsMatch } from "@/lib/query/initial-data";
import { invalidatePortalData } from "@/lib/sync/invalidate-portal-data";
import { LIVE_QUERY_OPTIONS, queryOptionsForHydration } from "@/lib/sync/constants";
import type { SoftDeleteStorePayload } from "@/lib/api/stores";
import type { CreateStoreInput, UpdateStoreInput } from "@/lib/validations/store.schema";
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
}>;

interface UseStoresOptions {
  initialData?: StoreListResponse;
  initialParams?: UseStoresParams;
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

export function useCreateStore() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateStoreInput) => createStore(payload),
    onSuccess: () => {
      void invalidatePortalData(queryClient);
    },
  });
}

export function useUpdateStore() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      storeId,
      payload,
    }: {
      storeId: string;
      payload: UpdateStoreInput;
    }) => updateStore(storeId, payload),
    onSuccess: () => {
      void invalidatePortalData(queryClient);
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
      payload: SoftDeleteStorePayload;
    }) => deleteStore(storeId, payload),
    onMutate: async ({ storeId }) => {
      await queryClient.cancelQueries({ queryKey: ["stores"] });
      const snapshots = queryClient.getQueriesData<StoreListResponse>({
        queryKey: ["stores"],
      });
      for (const [key, data] of snapshots) {
        if (!data) continue;
        queryClient.setQueryData<StoreListResponse>(key, {
          ...data,
          data: data.data.filter((row) => row.id !== storeId),
          total: Math.max(0, data.total - 1),
        });
      }
      return { snapshots };
    },
    onError: (_error, _vars, context) => {
      context?.snapshots.forEach(([key, data]) => {
        queryClient.setQueryData(key, data);
      });
    },
    onSettled: () => {
      void invalidatePortalData(queryClient);
    },
  });
}

export function useRestoreStore() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (storeId: string) => restoreStore(storeId),
    onSuccess: () => {
      void invalidatePortalData(queryClient);
    },
  });
}

export function useUpdateStoreManagerPassword() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      storeId,
      password,
    }: {
      storeId: string;
      password: string;
    }) => updateStoreManagerPassword(storeId, password),
    onSuccess: () => {
      void invalidatePortalData(queryClient);
    },
  });
}
