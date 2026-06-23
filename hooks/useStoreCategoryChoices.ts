import { useQuery } from "@tanstack/react-query";
import { fetchStoreCategoryChoices } from "@/lib/api/store-categories";

export function useStoreCategoryChoices() {
  return useQuery({
    queryKey: ["store-categories", "choices"],
    queryFn: fetchStoreCategoryChoices,
    staleTime: 60_000,
  });
}
