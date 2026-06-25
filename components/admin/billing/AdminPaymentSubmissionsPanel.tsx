"use client";

import { useMemo, useState, useTransition } from "react";
import { Search } from "lucide-react";
import {
  useBillingPaymentSubmissions,
  useReviewBillingPaymentSubmission,
} from "@/hooks/useBillingPaymentSubmissions";
import { AdminPaymentSubmissionCard } from "@/components/admin/billing/AdminPaymentSubmissionCard";
import { AdminPaymentReceivedConfirmDialog } from "@/components/admin/billing/AdminPaymentReceivedConfirmDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/useToast";
import { cn } from "@/lib/utils";
import type { BillingPaymentSubmissionDto } from "@/lib/api/billing";
import type { Content } from "@/content/en";
import { ApiError } from "@/types";
import {
  simpleTabListClassName,
  simpleTabTriggerClassName,
} from "@/components/admin/billing/simple-tab-styles";

type AdminBillingCopy = Content["admin"]["billing"];
type MainTab = "PENDING" | "ALL";
type AllStatusFilter = "ALL" | "PENDING" | "RECEIVED" | "NOT_RECEIVED";

interface AdminPaymentSubmissionsPanelProps {
  copy: AdminBillingCopy;
}

const allStatusFilters: AllStatusFilter[] = [
  "ALL",
  "PENDING",
  "RECEIVED",
  "NOT_RECEIVED",
];

function allStatusFilterLabel(filter: AllStatusFilter, copy: AdminBillingCopy["payments"]): string {
  switch (filter) {
    case "PENDING":
      return copy.filterStatusPending;
    case "RECEIVED":
      return copy.filterStatusReceived;
    case "NOT_RECEIVED":
      return copy.filterStatusNotReceived;
    default:
      return copy.filterStatusAll;
  }
}

function buildNotReceivedNotificationToastDescription(
  notifications: { emailSent: boolean; whatsAppSent: boolean; whatsAppQueued: boolean } | undefined,
  copy: AdminBillingCopy["payments"],
): string | undefined {
  if (!notifications) return undefined;

  const emailLine = notifications.emailSent
    ? copy.notReceivedToastEmailSent
    : copy.notReceivedToastEmailNotSent;
  const whatsAppLine = notifications.whatsAppSent
    ? copy.notReceivedToastWhatsAppSent
    : notifications.whatsAppQueued
      ? copy.notReceivedToastWhatsAppQueued
      : copy.notReceivedToastWhatsAppNotSent;

  return `${emailLine} · ${whatsAppLine}`;
}

export function AdminPaymentSubmissionsPanel({ copy }: AdminPaymentSubmissionsPanelProps) {
  const paymentsCopy = copy.payments;
  const [mainTab, setMainTab] = useState<MainTab>("PENDING");
  const [allStatusFilter, setAllStatusFilter] = useState<AllStatusFilter>("ALL");
  const [search, setSearch] = useState("");
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [confirmReceivedSubmission, setConfirmReceivedSubmission] =
    useState<BillingPaymentSubmissionDto | null>(null);
  const [, startReviewTransition] = useTransition();
  const queryStatus = mainTab === "PENDING" ? "PENDING" : allStatusFilter;
  const { data, isLoading, isError, refetch } = useBillingPaymentSubmissions(queryStatus);
  const reviewMutation = useReviewBillingPaymentSubmission();

  function handleReview(id: string, status: "RECEIVED" | "NOT_RECEIVED") {
    setReviewingId(id);
    startReviewTransition(async () => {
      try {
        const result = await reviewMutation.mutateAsync({ id, status });
        if (status === "RECEIVED") {
          toast({ title: paymentsCopy.receivedSuccess });
        } else {
          toast({
            title: paymentsCopy.notReceivedSuccess,
            description: buildNotReceivedNotificationToastDescription(
              result.notifications,
              paymentsCopy,
            ),
          });
        }
      } catch (error) {
        let message = paymentsCopy.reviewFailed;
        if (error instanceof ApiError) {
          const bodyMessage = error.body.message?.trim();
          if (bodyMessage) message = bodyMessage;
        }
        toast({ title: message });
      } finally {
        setReviewingId(null);
      }
    });
  }

  function handleConfirmReceived() {
    if (!confirmReceivedSubmission) return;
    const submissionId = confirmReceivedSubmission.id;
    setConfirmReceivedSubmission(null);
    handleReview(submissionId, "RECEIVED");
  }

  const allSubmissions = data?.data ?? [];
  const filteredAllSubmissions = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return allSubmissions;

    return allSubmissions.filter((submission) => {
      const haystack = [
        submission.businessName,
        submission.businessEmail,
        submission.invoiceNumber,
        submission.submittedByEmail,
        submission.upiVpa,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [allSubmissions, search]);

  const hasActiveAllFilters = allStatusFilter !== "ALL" || search.trim().length > 0;

  function renderSubmissionsList(
    rows: typeof allSubmissions,
    options?: { useFilteredEmptyState?: boolean },
  ) {
    if (isLoading) {
      return (
        <div className="overflow-hidden rounded-input border border-border bg-surface-card divide-y divide-border">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-28 rounded-none" />
          ))}
        </div>
      );
    }

    if (isError) {
      return (
        <div className="rounded-input border border-border bg-surface-card p-6 text-center">
          <p className="text-sm text-text-secondary">{paymentsCopy.loadFailed}</p>
          <Button type="button" variant="outline" size="sm" className="mt-3" onClick={() => void refetch()}>
            {paymentsCopy.retry}
          </Button>
        </div>
      );
    }

    if (rows.length === 0) {
      return (
        <div className="rounded-input border border-border bg-surface-card p-6 text-center">
          <p className="text-sm text-text-secondary">
            {options?.useFilteredEmptyState && hasActiveAllFilters
              ? paymentsCopy.emptyFiltered
              : paymentsCopy.empty}
          </p>
        </div>
      );
    }

    return (
      <div className="overflow-hidden rounded-input border border-border bg-surface-card divide-y divide-border">
        {rows.map((submission) => (
          <AdminPaymentSubmissionCard
            key={submission.id}
            submission={submission}
            copy={paymentsCopy}
            isReviewing={reviewingId === submission.id}
            onNotReceivedClick={() => handleReview(submission.id, "NOT_RECEIVED")}
            onReceivedClick={() => setConfirmReceivedSubmission(submission)}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <p className="text-sm text-text-secondary">
        {paymentsCopy.subtitle}
        {data?.pendingCount ? (
          <span className="mt-1 block text-status-warning">
            {paymentsCopy.pendingCount.replace("{count}", String(data.pendingCount))}
          </span>
        ) : null}
      </p>

      <Tabs
        value={mainTab}
        onValueChange={(value) => setMainTab(value as MainTab)}
        className="space-y-4"
      >
        <TabsList className={simpleTabListClassName}>
          <TabsTrigger value="PENDING" className={simpleTabTriggerClassName}>
            {paymentsCopy.filterPending}
          </TabsTrigger>
          <TabsTrigger value="ALL" className={simpleTabTriggerClassName}>
            {paymentsCopy.filterAll}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="PENDING" className="mt-0">
          {mainTab === "PENDING" ? renderSubmissionsList(allSubmissions) : null}
        </TabsContent>

        <TabsContent value="ALL" className="mt-0 space-y-3">
          {mainTab === "ALL" ? (
            <>
              <div className="space-y-3 rounded-input border border-border bg-surface-card p-3 sm:p-4">
                <div
                  className="flex flex-wrap gap-2"
                  role="tablist"
                  aria-label={paymentsCopy.filterAll}
                >
                  {allStatusFilters.map((statusFilter) => {
                    const isActive = allStatusFilter === statusFilter;

                    return (
                      <button
                        key={statusFilter}
                        type="button"
                        role="tab"
                        aria-selected={isActive}
                        onClick={() => setAllStatusFilter(statusFilter)}
                        className={cn(
                          "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                          isActive
                            ? "border-text-primary bg-text-primary text-surface-card"
                            : "border-border bg-surface-secondary/40 text-text-secondary hover:border-border hover:bg-surface-secondary",
                        )}
                      >
                        {allStatusFilterLabel(statusFilter, paymentsCopy)}
                      </button>
                    );
                  })}
                </div>

                <div className="relative">
                  <Search
                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted"
                    aria-hidden
                  />
                  <Input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder={paymentsCopy.searchPlaceholder}
                    className="pl-9"
                    aria-label={paymentsCopy.searchPlaceholder}
                  />
                </div>

                {!isLoading && !isError && allSubmissions.length > 0 ? (
                  <p className="text-xs text-text-muted">
                    {paymentsCopy.showingSubmissions
                      .replace("{shown}", String(filteredAllSubmissions.length))
                      .replace("{total}", String(allSubmissions.length))}
                  </p>
                ) : null}
              </div>

              {renderSubmissionsList(filteredAllSubmissions, { useFilteredEmptyState: true })}
            </>
          ) : null}
        </TabsContent>
      </Tabs>

      <AdminPaymentReceivedConfirmDialog
        open={confirmReceivedSubmission !== null}
        onOpenChange={(open) => {
          if (!open && !reviewingId) {
            setConfirmReceivedSubmission(null);
          }
        }}
        submission={confirmReceivedSubmission}
        copy={paymentsCopy}
        isLoading={Boolean(reviewingId && confirmReceivedSubmission?.id === reviewingId)}
        onConfirm={handleConfirmReceived}
      />
    </div>
  );
}
