"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { assignCustomer } from "@/lib/api/assignments";
import { invalidateEntities } from "@/lib/sync/invalidate-portal-data";
import type { AssignCustomerInput } from "@/lib/validations/customer-assignment.schema";

interface AssignCustomerVariables {
  payload: AssignCustomerInput;
  storeId?: string;
}

export function useAssignCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ payload, storeId }: AssignCustomerVariables) =>
      assignCustomer(payload, storeId),
    onSuccess: async () => {
      await invalidateEntities(queryClient, [
        "visits",
        "fieldSales",
        "followUps",
        "callLogs",
        "staff",
      ]);
    },
  });
}
