import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createStoreCategory,
  deleteStoreCategory,
  fetchPlatformSettings,
  fetchStoreCategories,
  updatePlatformSettings,
  updateStoreCategory,
  restoreStoreCategory,
} from "@/lib/api/platform-settings";
import type { PlatformSettingsPatchInput } from "@/lib/platform/settings-schema";

export function usePlatformSettings() {
  return useQuery({
    queryKey: ["admin", "settings"],
    queryFn: fetchPlatformSettings,
  });
}

export function useUpdatePlatformSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (patch: PlatformSettingsPatchInput) => updatePlatformSettings(patch),
    onSuccess: (data) => {
      queryClient.setQueryData(["admin", "settings"], data);
    },
  });
}

export function useStoreCategories() {
  return useQuery({
    queryKey: ["admin", "settings", "categories"],
    queryFn: fetchStoreCategories,
  });
}

function invalidateCategoryQueries(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.invalidateQueries({ queryKey: ["admin", "settings", "categories"] });
  void queryClient.invalidateQueries({ queryKey: ["store-categories", "choices"] });
}

export function useCreateStoreCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => createStoreCategory(name),
    onSuccess: () => {
      invalidateCategoryQueries(queryClient);
    },
  });
}

export function useUpdateStoreCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { name: string; label?: string; newName?: string }) =>
      updateStoreCategory(input),
    onSuccess: () => {
      invalidateCategoryQueries(queryClient);
    },
  });
}

export function useDeleteStoreCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => deleteStoreCategory(name),
    onSuccess: () => {
      invalidateCategoryQueries(queryClient);
    },
  });
}

export function useRestoreStoreCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => restoreStoreCategory(name),
    onSuccess: () => {
      invalidateCategoryQueries(queryClient);
    },
  });
}
