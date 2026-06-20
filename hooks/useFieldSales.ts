import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFieldSale } from "@/lib/api/field-sales";
import { invalidateEntities } from "@/lib/sync/invalidate-portal-data";
import type { CreateFieldSaleInput } from "@/lib/validations/field-sale.schema";

export function useCreateFieldSale() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateFieldSaleInput) => createFieldSale(payload),
    onSuccess: () => {
      void invalidateEntities(queryClient, ["fieldSales", "followUps"]);
    },
  });
}
