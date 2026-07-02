"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createLocationException,
  getActiveLocationException,
  type CreateLocationExceptionInput,
} from "@/lib/api/location-exceptions";
import { LIVE_QUERY_OPTIONS } from "@/lib/sync/constants";

export function useActiveLocationException(recordType: "FIELD_SALE" | "VISIT") {
  return useQuery({
    queryKey: ["location-exception", "active", recordType],
    queryFn: () => getActiveLocationException(recordType),
    ...LIVE_QUERY_OPTIONS,
  });
}

export function useCreateLocationException() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateLocationExceptionInput) => createLocationException(payload),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: ["location-exception", "active", variables.recordType],
      });
    },
  });
}
