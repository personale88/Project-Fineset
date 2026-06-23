import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createBillingFollowUp,
  fetchBillingAccountDetail,
  fetchBillingSummaries,
  updateBillingAccount,
  type BillingAccountDetailDto,
  type BillingAccountSummaryDto,
} from "@/lib/api/billing";
import type {
  BillingFollowUpChannel,
  BillingFollowUpOutcome,
  BillingPaymentStatus,
} from "@prisma/client";
import { LIVE_QUERY_OPTIONS } from "@/lib/sync/constants";

const summariesKey = ["billing-summaries"] as const;

export function useBillingSummaries() {
  return useQuery<BillingAccountSummaryDto[]>({
    queryKey: summariesKey,
    queryFn: fetchBillingSummaries,
    ...LIVE_QUERY_OPTIONS,
  });
}

export function useBillingAccountDetail(businessKey: string | null) {
  return useQuery<BillingAccountDetailDto>({
    queryKey: ["billing-account", businessKey],
    queryFn: () => fetchBillingAccountDetail(businessKey!),
    enabled: Boolean(businessKey),
    ...LIVE_QUERY_OPTIONS,
  });
}

function invalidateBillingQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  businessKey?: string,
) {
  void queryClient.invalidateQueries({ queryKey: summariesKey });
  if (businessKey) {
    void queryClient.invalidateQueries({ queryKey: ["billing-account", businessKey] });
  }
}

export function useCreateBillingFollowUp(businessKey: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: {
      channel: BillingFollowUpChannel;
      outcome: BillingFollowUpOutcome;
      notes: string;
      nextFollowUpAt?: string | null;
    }) =>
      createBillingFollowUp({
        businessKey,
        ...input,
      }),
    onSuccess: () => invalidateBillingQueries(queryClient, businessKey),
  });
}

export function useUpdateBillingPaymentStatus(businessKey: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { paymentStatus: BillingPaymentStatus; notes?: string }) =>
      updateBillingAccount({ businessKey, ...input }),
    onSuccess: () => invalidateBillingQueries(queryClient, businessKey),
  });
}
