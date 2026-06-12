"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import {
  useRevealStaffCallPhone,
  useStaffCallFilterCounts,
  useStaffCalls,
  useSubmitStaffCallOutcome,
} from "@/hooks/useStaffCalls";
import { useStaffCallFilters } from "@/hooks/useStaffCallFilters";
import { toast } from "@/hooks/useToast";
import { CallFeedbackDialog } from "@/components/staff/CallFeedbackDialog";
import { CallLogList, StaffCallCard, StaffCallFilterPanel } from "@/components/shared/calls";
import { STAFF_DASHBOARD_PATH } from "@/lib/auth/routes";
import { content } from "@/content/en";
import { getStaffCallsErrorMessage } from "@/lib/utils/staff-calls-errors";
import type { Content } from "@/content/en";
import type { GetStaffCallsParams, StaffCallListItem, StaffCallListResponse } from "@/types";

type StaffContent = Content["staff"];

interface StaffCallListProps {
  copy: StaffContent;
  emptyMessage: string;
  storeId?: string;
  initialCallsParams?: GetStaffCallsParams;
  initialData?: StaffCallListResponse;
  initialParams?: GetStaffCallsParams;
  backHref?: string;
}

export function StaffCallList({
  copy,
  emptyMessage,
  storeId,
  initialCallsParams,
  initialData,
  initialParams,
  backHref = STAFF_DASHBOARD_PATH,
}: StaffCallListProps) {
  const {
    filters,
    ui,
    queryParams,
    pagination,
    handlers,
    bindFilterCounts,
  } = useStaffCallFilters({
    initialParams: initialCallsParams,
    fixedStoreId: storeId,
  });

  const { data, isLoading, isError, error, refetch } = useStaffCalls(queryParams, {
    initialData,
    initialParams,
  });
  const { data: filterCounts } = useStaffCallFilterCounts(queryParams);
  const revealPhone = useRevealStaffCallPhone();
  const submitOutcome = useSubmitStaffCallOutcome();

  const [activeItem, setActiveItem] = useState<StaffCallListItem | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const { yearOptions, getMonthCount, getFilterCount } = bindFilterCounts(filterCounts);

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;
  const customersCountLabel = data
    ? copy.calls.customersCount.replace("{count}", String(data.total))
    : null;

  const cardLabels = useMemo(
    () => ({
      valueTierLabels: copy.calls.valueTierLabels,
      queueStatusLabels: copy.calls.queueStatusLabels,
      masterSourceLabels: copy.calls.masterSourceLabels,
      callOutcomeLabels: copy.calls.callOutcomeLabels,
      purchaseStatusLabels: copy.calls.purchaseStatusLabels,
      customerTypeLabels: copy.calls.customerTypeLabels,
      notesLabel: copy.calls.notesLabel,
      due: copy.calls.due,
      call: copy.calls.call,
      noPhone: copy.calls.noPhone,
    }),
    [copy.calls],
  );

  async function handleOpenCall(item: StaffCallListItem) {
    setActiveItem(item);
    setDialogOpen(true);
    revealPhone.reset();
    await revealPhone.mutateAsync({
      recordId: item.recordId,
      masterSource: item.masterSource,
      storeId,
    });
  }

  function handleCloseDialog(open: boolean) {
    setDialogOpen(open);
    if (!open) {
      setActiveItem(null);
      revealPhone.reset();
    }
  }

  function handleSubmitOutcome(payload: Parameters<typeof submitOutcome.mutate>[0]["payload"]) {
    if (!activeItem) return;

    submitOutcome.mutate(
      {
        ref: {
          recordId: activeItem.recordId,
          masterSource: activeItem.masterSource,
          storeId,
        },
        payload,
      },
      {
        onSuccess: () => {
          toast({ title: copy.calls.dialog.feedbackSaved });
          handleCloseDialog(false);
        },
        onError: () => {
          toast({ title: content.errors.generic, description: copy.calls.loadError });
        },
      },
    );
  }

  const listEmptyMessage =
    ui.isDefaultFilters && (!data || data.data.length === 0)
      ? copy.calls.noCustomersYet
      : emptyMessage;

  const errorLabel = isError
    ? getStaffCallsErrorMessage(error, copy.calls)
    : copy.calls.loadErrorGeneric;

  return (
    <div className="min-w-0 space-y-4 lg:space-y-5">
      <div className="space-y-3">
        <Link
          href={backHref}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-text-secondary transition-colors hover:text-brand-gold"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          {copy.calls.back}
        </Link>
        <div>
          <h1 className="font-display text-2xl font-bold text-text-primary">
            {copy.calls.title}
          </h1>
          <p className="text-sm text-text-secondary">{copy.calls.subtitle}</p>
        </div>
      </div>

      <StaffCallFilterPanel
        copy={copy.calls}
        year={filters.year}
        month={filters.month}
        segment={filters.segment}
        valueTier={filters.valueTier}
        queue={filters.queue}
        master={filters.master}
        birthday={filters.birthday}
        anniversary={filters.anniversary}
        showAdvancedFilters={ui.showAdvancedFilters}
        hasAdvancedFilters={ui.hasAdvancedFilters}
        activeAdvancedCount={ui.activeAdvancedCount}
        customersCountLabel={customersCountLabel}
        yearOptions={yearOptions}
        getMonthCount={getMonthCount}
        getFilterCount={getFilterCount}
        onYearChange={handlers.handleYearChange}
        onMonthChange={handlers.handleMonthChange}
        onMasterChange={(value) => handlers.setFilter("master", value)}
        onQueueChange={(value) => handlers.setFilter("queue", value)}
        onSegmentChange={(value) => handlers.setFilter("segment", value)}
        onValueTierChange={(value) => handlers.setFilter("valueTier", value)}
        onBirthdayChange={(value) => handlers.setFilter("birthday", value)}
        onAnniversaryChange={(value) => handlers.setFilter("anniversary", value)}
        onToggleAdvancedFilters={() => ui.setShowAdvancedFilters((open) => !open)}
        onClearAdvancedFilters={handlers.clearAdvancedFilters}
      />

      <CallLogList
        isLoading={isLoading}
        isError={isError}
        loadingLabel={content.common.loading}
        errorLabel={errorLabel}
        retryLabel={content.errors.tryAgain}
        onRetry={() => void refetch()}
        items={data?.data ?? []}
        emptyMessage={listEmptyMessage}
        renderItem={(item) => (
          <StaffCallCard
            key={`${item.masterSource}:${item.recordId}`}
            item={item}
            labels={cardLabels}
            onCall={(callItem) => void handleOpenCall(callItem)}
          />
        )}
        page={pagination.page}
        totalPages={totalPages}
        showingLabel={customersCountLabel ?? ""}
        pageLabel={copy.calls.pageLabel
          .replace("{page}", String(pagination.page))
          .replace("{total}", String(totalPages))}
        previousLabel={copy.calls.previousPage}
        nextLabel={copy.calls.nextPage}
        onPageChange={pagination.setPage}
      />

      <CallFeedbackDialog
        copy={copy.calls}
        item={activeItem}
        open={dialogOpen}
        onOpenChange={handleCloseDialog}
        dialInfo={revealPhone.data ?? null}
        isDialLoading={revealPhone.isPending}
        isSubmitting={submitOutcome.isPending}
        onSubmit={handleSubmitOutcome}
      />
    </div>
  );
}
