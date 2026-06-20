"use client";

import Link from "next/link";
import { ClipboardList, ExternalLink } from "lucide-react";
import { content } from "@/content/en";
import {
  useCorrectionRequests,
  useResolveCorrectionRequest,
} from "@/hooks/useCorrectionRequests";
import { portalSectionPath } from "@/lib/utils/store-dashboard-url";
import { getPortalErrorMessage } from "@/lib/utils/api-error-message";
import { formatDate } from "@/lib/utils/formatters";
import { QueryLoadState } from "@/components/shared/QueryLoadState";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { CorrectionRequestItem } from "@/lib/api/correction-requests";

interface StoreCorrectionRequestsProps {
  storeId: string;
}

function correctionRecordHref(
  request: CorrectionRequestItem,
  storeId: string,
): string | null {
  if (request.visit) {
    return `${portalSectionPath("visits", "STORE_MANAGER", storeId)}?highlight=${request.visit.id}`;
  }
  if (request.fieldSale) {
    return `${portalSectionPath("field-sales", "STORE_MANAGER", storeId)}?highlight=${request.fieldSale.id}`;
  }
  return null;
}

export function StoreCorrectionRequests({ storeId }: StoreCorrectionRequestsProps) {
  const copy = content.store.correctionRequests;
  const { data, isLoading, isError, error, refetch } = useCorrectionRequests(storeId);
  const resolveMutation = useResolveCorrectionRequest(storeId);

  return (
    <Card>
      <CardHeader className="space-y-1">
        <div className="flex items-center gap-2">
          <ClipboardList className="h-5 w-5 text-brand-gold" aria-hidden />
          <CardTitle className="text-lg">{copy.title}</CardTitle>
        </div>
        <CardDescription>{copy.subtitle}</CardDescription>
      </CardHeader>
      <CardContent>
        <QueryLoadState
          isLoading={isLoading}
          isError={isError}
          errorLabel={getPortalErrorMessage(error, content.errors)}
          retryLabel={content.errors.tryAgain}
          onRetry={() => void refetch()}
        >
          {!data?.length ? (
            <p className="text-sm text-text-secondary">{copy.empty}</p>
          ) : (
            <ul className="space-y-3">
              {data.map((request) => {
                const customerName =
                  request.visit?.customerName ?? request.fieldSale?.customerName ?? copy.unknownCustomer;
                const recordType = request.visit ? copy.visitRecord : copy.fieldSaleRecord;

                const recordHref = correctionRecordHref(request, storeId);

                return (
                  <li
                    key={request.id}
                    className="rounded-card border border-border bg-surface-card p-4 shadow-card"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 space-y-1">
                        <p className="font-medium text-text-primary">{customerName}</p>
                        <p className="text-sm text-text-secondary">
                          {recordType} · {request.staff.name} · {formatDate(request.createdAt)}
                        </p>
                        <p className="text-sm text-text-primary">{request.message}</p>
                        {recordHref ? (
                          <Link
                            href={recordHref}
                            className="inline-flex items-center gap-1 text-sm font-medium text-brand-gold hover:underline"
                          >
                            {copy.viewRecord}
                            <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                          </Link>
                        ) : null}
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={resolveMutation.isPending}
                        onClick={() => resolveMutation.mutate(request.id)}
                      >
                        {resolveMutation.isPending ? copy.resolving : copy.resolve}
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </QueryLoadState>
      </CardContent>
    </Card>
  );
}
