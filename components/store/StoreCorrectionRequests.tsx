"use client";

import { ClipboardList } from "lucide-react";
import { content } from "@/content/en";
import {
  useCorrectionRequests,
  useResolveCorrectionRequest,
} from "@/hooks/useCorrectionRequests";
import { getPortalErrorMessage } from "@/lib/utils/api-error-message";
import { formatDate } from "@/lib/utils/formatters";
import { QueryLoadState } from "@/components/shared/QueryLoadState";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface StoreCorrectionRequestsProps {
  storeId: string;
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
