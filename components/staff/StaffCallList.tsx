"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Plus, Upload } from "lucide-react";
import {
  useRevealStaffCallPhone,
  useStaffCallFilterCounts,
  useStaffCalls,
  useSubmitManualStaffCall,
  useSubmitStaffCallOutcome,
} from "@/hooks/useStaffCalls";
import { useStaffCallFilters } from "@/hooks/useStaffCallFilters";
import { toast } from "@/hooks/useToast";
import { CallFeedbackDialog } from "@/components/staff/CallFeedbackDialog";
import { ManualCallDialog } from "@/components/staff/ManualCallDialog";
import { ImportHistoryPanel, ImportModal } from "@/components/import";
import { CallLogList, StaffCallCard, StaffCallFilterPanel } from "@/components/shared/calls";
import { Button } from "@/components/ui/button";
import { STAFF_DASHBOARD_PATH } from "@/lib/auth/routes";
import { content } from "@/content/en";
import { invalidatePortalData } from "@/lib/sync/invalidate-portal-data";
import { getPortalErrorMessage } from "@/lib/utils/api-error-message";
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
  backLabel?: string;
  pageTitle?: string;
  pageSubtitle?: string;
  showImport?: boolean;
  canAssign?: boolean;
  personalScope?: boolean;
}

export function StaffCallList({
  copy,
  emptyMessage,
  storeId,
  initialCallsParams,
  initialData,
  initialParams,
  backHref = STAFF_DASHBOARD_PATH,
  backLabel,
  pageTitle,
  pageSubtitle,
  showImport = false,
  canAssign: canAssignProp,
  personalScope = false,
}: StaffCallListProps) {
  const queryClient = useQueryClient();
  const canAssign = canAssignProp ?? Boolean(storeId && !personalScope);
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
    fixedPersonalScope: personalScope,
  });

  const { data, isLoading, isError, error, refetch } = useStaffCalls(queryParams, {
    initialData,
    initialParams,
  });
  const { data: filterCounts } = useStaffCallFilterCounts(queryParams);
  const revealPhone = useRevealStaffCallPhone();
  const submitOutcome = useSubmitStaffCallOutcome();
  const submitManualCall = useSubmitManualStaffCall(storeId);

  const [activeItem, setActiveItem] = useState<StaffCallListItem | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [manualDialogOpen, setManualDialogOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

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
    try {
      await revealPhone.mutateAsync({
        recordId: item.recordId,
        masterSource: item.masterSource,
        storeId,
        ...(personalScope ? { personalScope: true } : {}),
      });
    } catch (error) {
      handleCloseDialog(false);
      toast({
        title: getPortalErrorMessage(error, content.errors),
      });
    }
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
          ...(personalScope ? { personalScope: true } : {}),
        },
        payload,
      },
      {
        onSuccess: () => {
          toast({ title: copy.calls.dialog.feedbackSaved });
          handleCloseDialog(false);
        },
        onError: (error) => {
          toast({
            title: getPortalErrorMessage(error, content.errors),
          });
        },
      },
    );
  }

  function handleSubmitManualCall(
    payload: Parameters<typeof submitManualCall.mutate>[0],
  ) {
    submitManualCall.mutate(payload, {
      onSuccess: () => {
        toast({ title: copy.calls.manualCall.saved });
        setManualDialogOpen(false);
      },
      onError: (error) => {
        toast({
          title: getPortalErrorMessage(error, content.errors),
        });
      },
    });
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
          {backLabel ?? copy.calls.back}
        </Link>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold text-text-primary">
              {pageTitle ?? copy.calls.title}
            </h1>
            <p className="text-sm text-text-secondary">{pageSubtitle ?? copy.calls.subtitle}</p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            {showImport && storeId ? (
              <Button
                type="button"
                variant="outline"
                className="gap-2"
                onClick={() => setImportOpen(true)}
              >
                <Upload className="h-4 w-4" aria-hidden />
                {copy.calls.importSpreadsheet}
              </Button>
            ) : null}
            <Button
              type="button"
              variant="outline"
              className="shrink-0 gap-2"
              onClick={() => setManualDialogOpen(true)}
            >
              <Plus className="h-4 w-4" aria-hidden />
              {copy.calls.logManualCall}
            </Button>
          </div>
        </div>
      </div>

      <StaffCallFilterPanel
        copy={copy.calls}
        scopeHint={copy.calls.scopeHint}
        queuePriorityHint={copy.calls.queuePriorityHint}
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
            canAssign={canAssign}
            storeId={storeId}
            onAssigned={() => void refetch()}
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

      <ManualCallDialog
        copy={copy.calls}
        open={manualDialogOpen}
        onOpenChange={setManualDialogOpen}
        isSubmitting={submitManualCall.isPending}
        onSubmit={handleSubmitManualCall}
      />

      {showImport && storeId ? (
        <>
          <ImportModal
            featureKey="call_log"
            storeId={storeId}
            open={importOpen}
            onClose={() => setImportOpen(false)}
            onImportComplete={() => {
              toast({ title: copy.calls.importSpreadsheet });
              void invalidatePortalData(queryClient);
              void refetch();
            }}
          />
          <ImportHistoryPanel storeId={storeId} featureKey="call_log" />
        </>
      ) : null}
    </div>
  );
}
