"use client";

import { useState } from "react";
import { CalendarClock, ChevronDown, Loader2 } from "lucide-react";
import { content } from "@/content/en";
import { useUpdateFollowUp } from "@/hooks/useFollowUps";
import { toast } from "@/hooks/useToast";
import { getPortalErrorMessage } from "@/lib/utils/api-error-message";
import { formatDate } from "@/lib/utils/formatters";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DatePicker } from "@/components/shared/DatePicker";
import type { FollowUpAction } from "@/lib/validations/follow-ups.schema";
import type { FollowUpListItem } from "@/types";
import type { FollowUpQuery } from "@/hooks/useFollowUps";

interface FollowUpStatusMenuProps {
  item: FollowUpListItem;
  storeId?: string;
  listParams?: FollowUpQuery;
  onUpdated?: () => void;
}

export function FollowUpStatusMenu({
  item,
  storeId,
  listParams,
  onUpdated,
}: FollowUpStatusMenuProps) {
  const copy = content.staff.followUps;
  const updateFollowUp = useUpdateFollowUp(listParams ?? { overdue: true, storeId });

  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduleDate, setScheduleDate] = useState<Date | undefined>(() =>
    item.followUpDate ? new Date(item.followUpDate) : undefined,
  );
  const [pendingAction, setPendingAction] = useState<FollowUpAction | null>(null);

  const statusLabel =
    copy.statusLabels[item.status] ?? item.status;
  const isPending = updateFollowUp.isPending;

  async function runAction(action: FollowUpAction, followUpDate?: Date) {
    setPendingAction(action);

    try {
      await updateFollowUp.mutateAsync({
        followUpId: item.id,
        storeId,
        payload: {
          action,
          ...(action === "schedule" && followUpDate ? { followUpDate } : {}),
        },
      });

      const successMessage =
        action === "open"
          ? copy.actions.successOpen
          : action === "close"
            ? copy.actions.successClose
            : copy.actions.successSchedule;

      toast({ title: successMessage });
      onUpdated?.();
    } catch (error) {
      toast({
        title: getPortalErrorMessage(error, content.errors),
      });
    } finally {
      setPendingAction(null);
    }
  }

  function handleScheduleConfirm() {
    if (!scheduleDate) return;
    setScheduleOpen(false);
    void runAction("schedule", scheduleDate);
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5"
            disabled={isPending}
            aria-label={copy.actions.menuLabel}
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : null}
            <span>{statusLabel}</span>
            <ChevronDown className="h-4 w-4 opacity-70" aria-hidden />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-[12rem]">
          <DropdownMenuItem
            disabled={isPending || item.status === "OPEN"}
            onSelect={() => void runAction("open")}
          >
            {pendingAction === "open" && isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
            ) : null}
            {copy.actions.open}
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={isPending || item.status === "CLOSED"}
            onSelect={() => void runAction("close")}
          >
            {pendingAction === "close" && isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
            ) : null}
            {copy.actions.close}
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={isPending}
            onSelect={(event) => {
              event.preventDefault();
              setScheduleDate(
                item.followUpDate ? new Date(item.followUpDate) : new Date(),
              );
              setScheduleOpen(true);
            }}
          >
            <CalendarClock className="mr-2 h-4 w-4" aria-hidden />
            {copy.actions.schedule}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={scheduleOpen} onOpenChange={setScheduleOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{copy.scheduleDialog.title}</DialogTitle>
            <DialogDescription>{copy.scheduleDialog.description}</DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <p className="text-sm font-medium text-text-primary">{item.customerName}</p>
            <p className="text-xs text-text-muted">
              {copy.dueLabel}: {formatDate(item.followUpDate)}
            </p>
            <DatePicker
              value={scheduleDate}
              onChange={setScheduleDate}
              fromDate={new Date()}
              placeholder={copy.scheduleDialog.dateLabel}
            />
          </div>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => setScheduleOpen(false)}
              disabled={isPending}
            >
              {copy.scheduleDialog.cancel}
            </Button>
            <Button
              type="button"
              disabled={!scheduleDate || isPending}
              onClick={handleScheduleConfirm}
            >
              {isPending && pendingAction === "schedule"
                ? copy.actions.saving
                : copy.scheduleDialog.confirm}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
