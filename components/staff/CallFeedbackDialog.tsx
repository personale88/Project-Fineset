"use client";

import { useState } from "react";
import { Phone } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { FollowUpScheduleFields } from "@/components/shared/FollowUpScheduleFields";
import { resolveFollowUpDateTime } from "@/lib/utils/follow-up-datetime";
import { cn } from "@/lib/utils";
import { modalFooterSafeClassName } from "@/lib/utils/modal-safe-area";
import type { Content } from "@/content/en";
import type { StaffCallDialResult, StaffCallListItem } from "@/types";
import type { StaffCallOutcomeInput } from "@/lib/validations/staff-calls.schema";

type StaffCallsCopy = Content["staff"]["calls"];

interface CallFeedbackDialogProps {
  copy: StaffCallsCopy;
  item: StaffCallListItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dialInfo: StaffCallDialResult | null;
  isDialLoading: boolean;
  isSubmitting: boolean;
  onSubmit: (payload: StaffCallOutcomeInput) => void;
}

export function CallFeedbackDialog({
  copy,
  item,
  open,
  onOpenChange,
  dialInfo,
  isDialLoading,
  isSubmitting,
  onSubmit,
}: CallFeedbackDialogProps) {
  const [answered, setAnswered] = useState<"ANSWERED" | "NOT_ANSWERED" | null>(null);
  const [feedback, setFeedback] = useState("");
  const [scheduleFollowUp, setScheduleFollowUp] = useState(false);
  const [followUpDate, setFollowUpDate] = useState<Date | undefined>(undefined);
  const [followUpPreferredTime, setFollowUpPreferredTime] = useState("");

  function resetForm() {
    setAnswered(null);
    setFeedback("");
    setScheduleFollowUp(false);
    setFollowUpDate(undefined);
    setFollowUpPreferredTime("");
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      resetForm();
    }
    onOpenChange(nextOpen);
  }

  function handleSubmit() {
    if (!answered) return;

    onSubmit({
      answered,
      feedback: feedback.trim() || undefined,
      scheduleFollowUp: answered === "ANSWERED" ? scheduleFollowUp : false,
      followUpDate:
        answered === "ANSWERED" && scheduleFollowUp && followUpDate
          ? resolveFollowUpDateTime(followUpDate, followUpPreferredTime)
          : undefined,
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="flex max-h-[90vh] max-w-md flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="space-y-1 border-b border-border px-6 py-4">
          <DialogTitle>{copy.dialog.title}</DialogTitle>
          <DialogDescription>
            {item
              ? copy.dialog.description.replace("{name}", item.displayName)
              : copy.dialog.descriptionGeneric}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 overflow-y-auto px-6 py-4">
          <div className="rounded-input border border-border bg-surface-secondary p-4">
            {isDialLoading ? (
              <p className="text-sm text-text-secondary">{copy.dialog.revealingPhone}</p>
            ) : dialInfo ? (
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-text-primary">{dialInfo.displayName}</p>
                  <p className="text-lg font-semibold tracking-wide text-text-primary">
                    {dialInfo.phone}
                  </p>
                </div>
                <Button asChild className="h-12 w-full gap-2 text-base">
                  <a href={dialInfo.dialUrl}>
                    <Phone className="h-5 w-5" aria-hidden />
                    {copy.call}
                  </a>
                </Button>
              </div>
            ) : (
              <p className="text-sm text-text-secondary">{copy.noPhone}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>{copy.dialog.outcomeLabel}</Label>
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  { value: "ANSWERED", label: copy.dialog.answered },
                  { value: "NOT_ANSWERED", label: copy.dialog.notAnswered },
                ] as const
              ).map((option) => (
                <Button
                  key={option.value}
                  type="button"
                  variant={answered === option.value ? "default" : "outline"}
                  className={cn(
                    "h-12",
                    answered === option.value && "ring-2 ring-brand-gold ring-offset-2",
                  )}
                  aria-pressed={answered === option.value}
                  onClick={() => setAnswered(option.value)}
                >
                  {option.label}
                </Button>
              ))}
            </div>
          </div>

          {answered === "ANSWERED" && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="call-feedback">{copy.dialog.feedbackLabel}</Label>
                <Textarea
                  id="call-feedback"
                  value={feedback}
                  onChange={(event) => setFeedback(event.target.value)}
                  placeholder={copy.dialog.feedbackPlaceholder}
                  rows={3}
                  maxLength={500}
                />
              </div>

              <div className="flex items-center justify-between gap-4 rounded-input border border-border px-4 py-3">
                <Label htmlFor="schedule-follow-up" className="mt-0">
                  {copy.dialog.scheduleFollowUp}
                </Label>
                <Switch
                  id="schedule-follow-up"
                  checked={scheduleFollowUp}
                  onCheckedChange={setScheduleFollowUp}
                />
              </div>

              {scheduleFollowUp && (
                <FollowUpScheduleFields
                  date={followUpDate}
                  onDateChange={setFollowUpDate}
                  preferredTime={followUpPreferredTime}
                  onPreferredTimeChange={setFollowUpPreferredTime}
                  dateLabel={copy.dialog.followUpDateLabel}
                  timeLabel={copy.dialog.followUpTimeLabel}
                  timeOptionalHint={copy.dialog.followUpTimeHint}
                  dateId="follow-up-date"
                  timeId="follow-up-time"
                />
              )}
            </div>
          )}

          {answered === "NOT_ANSWERED" && (
            <div className="space-y-2">
              <Label htmlFor="not-answered-note">{copy.dialog.notAnsweredNoteLabel}</Label>
              <Textarea
                id="not-answered-note"
                value={feedback}
                onChange={(event) => setFeedback(event.target.value)}
                placeholder={copy.dialog.notAnsweredNotePlaceholder}
                rows={3}
                maxLength={500}
              />
              <p className="text-xs text-text-muted">{copy.dialog.notAnsweredHint}</p>
            </div>
          )}
        </div>

        <div className={cn("border-t border-border px-6 pt-4", modalFooterSafeClassName)}>
          <Button
            type="button"
            className="h-12 w-full"
            disabled={
              !answered ||
              isSubmitting ||
              isDialLoading ||
              (answered === "ANSWERED" && scheduleFollowUp && !followUpDate)
            }
            onClick={handleSubmit}
          >
            {isSubmitting ? copy.dialog.saving : copy.dialog.saveOutcome}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
