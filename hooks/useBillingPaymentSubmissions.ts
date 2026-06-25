import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchBillingPaymentSubmissions,
  reviewBillingPaymentSubmission,
  type BillingPaymentSubmissionDto,
} from "@/lib/api/billing";
import { LIVE_QUERY_OPTIONS } from "@/lib/sync/constants";

const submissionsKey = ["billing-payment-submissions"] as const;

export function useBillingPaymentSubmissions(
  status: "PENDING" | "RECEIVED" | "NOT_RECEIVED" | "ALL" = "PENDING",
) {
  return useQuery({
    queryKey: [...submissionsKey, status],
    queryFn: () => fetchBillingPaymentSubmissions({ status }),
    ...LIVE_QUERY_OPTIONS,
  });
}

export function useReviewBillingPaymentSubmission() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { id: string; status: "RECEIVED" | "NOT_RECEIVED" }) =>
      reviewBillingPaymentSubmission(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: submissionsKey });
      void queryClient.invalidateQueries({ queryKey: ["billing-summaries"] });
      void queryClient.invalidateQueries({ queryKey: ["analytics", "admin", "overview"] });
    },
  });
}

export type { BillingPaymentSubmissionDto };
