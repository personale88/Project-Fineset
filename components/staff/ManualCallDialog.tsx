"use client";

import { useMemo, useState } from "react";
import { Phone } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FollowUpScheduleFields } from "@/components/shared/FollowUpScheduleFields";
import { resolveFollowUpDateTime } from "@/lib/utils/follow-up-datetime";
import { cn } from "@/lib/utils";
import { modalFooterSafeClassName } from "@/lib/utils/modal-safe-area";
import type { Content } from "@/content/en";
import type { ManualStaffCallInput } from "@/lib/validations/staff-calls.schema";

type StaffCallsCopy = Content["staff"]["calls"];

interface ManualCallDialogProps {
  copy: StaffCallsCopy;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isSubmitting: boolean;
  onSubmit: (payload: ManualStaffCallInput) => void;
}

function normalizePhone(value: string): string {
  return value.replace(/\D/g, "").slice(-10);
}

export function ManualCallDialog({
  copy,
  open,
  onOpenChange,
  isSubmitting,
  onSubmit,
}: ManualCallDialogProps) {
  const manualCopy = copy.manualCall;

  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerType, setCustomerType] =
    useState<ManualStaffCallInput["customerType"]>("NEW");
  const [staffNotes, setStaffNotes] = useState("");
  const [answered, setAnswered] = useState<"ANSWERED" | "NOT_ANSWERED" | null>(null);
  const [feedback, setFeedback] = useState("");
  const [scheduleFollowUp, setScheduleFollowUp] = useState(false);
  const [followUpDate, setFollowUpDate] = useState<Date | undefined>(undefined);
  const [followUpPreferredTime, setFollowUpPreferredTime] = useState("");
  const [phoneError, setPhoneError] = useState<string | null>(null);

  const normalizedPhone = useMemo(() => normalizePhone(customerPhone), [customerPhone]);
  const dialUrl =
    normalizedPhone.length === 10 ? `tel:+91${normalizedPhone}` : null;

  function resetForm() {
    setCustomerName("");
    setCustomerPhone("");
    setCustomerType("NEW");
    setStaffNotes("");
    setAnswered(null);
    setFeedback("");
    setScheduleFollowUp(false);
    setFollowUpDate(undefined);
    setFollowUpPreferredTime("");
    setPhoneError(null);
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      resetForm();
    }
    onOpenChange(nextOpen);
  }

  function handleSubmit() {
    if (!answered || !customerName.trim()) return;

    if (normalizedPhone.length !== 10) {
      setPhoneError(manualCopy.phoneInvalid);
      return;
    }

    setPhoneError(null);

    onSubmit({
      customerName: customerName.trim(),
      customerPhone: normalizedPhone,
      customerType,
      staffNotes: staffNotes.trim() || undefined,
      answered,
      feedback: feedback.trim() || undefined,
      scheduleFollowUp: answered === "ANSWERED" ? scheduleFollowUp : false,
      followUpDate:
        answered === "ANSWERED" && scheduleFollowUp && followUpDate
          ? resolveFollowUpDateTime(followUpDate, followUpPreferredTime)
          : undefined,
    });
  }

  const canSubmit =
    Boolean(customerName.trim()) &&
    normalizedPhone.length === 10 &&
    Boolean(answered) &&
    !isSubmitting &&
    !(answered === "ANSWERED" && scheduleFollowUp && !followUpDate);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="flex max-h-[90vh] max-w-md flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="space-y-1 border-b border-border px-6 py-4">
          <DialogTitle>{manualCopy.title}</DialogTitle>
          <DialogDescription>{manualCopy.description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 overflow-y-auto px-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="manual-call-name">{manualCopy.nameLabel}</Label>
            <Input
              id="manual-call-name"
              value={customerName}
              onChange={(event) => setCustomerName(event.target.value)}
              placeholder={manualCopy.namePlaceholder}
              maxLength={100}
              autoComplete="name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="manual-call-phone">{manualCopy.phoneLabel}</Label>
            <Input
              id="manual-call-phone"
              value={customerPhone}
              onChange={(event) => {
                setCustomerPhone(event.target.value);
                if (phoneError) setPhoneError(null);
              }}
              placeholder={manualCopy.phonePlaceholder}
              inputMode="numeric"
              maxLength={15}
              autoComplete="tel"
            />
            {phoneError ? (
              <p className="text-xs text-status-error">{phoneError}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="manual-call-type">{manualCopy.customerTypeLabel}</Label>
            <Select
              value={customerType}
              onValueChange={(value) =>
                setCustomerType(value as ManualStaffCallInput["customerType"])
              }
            >
              <SelectTrigger id="manual-call-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {manualCopy.customerTypes.map((option) => (
                  <SelectItem key={option.key} value={option.key}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="manual-call-notes">{manualCopy.notesLabel}</Label>
            <Textarea
              id="manual-call-notes"
              value={staffNotes}
              onChange={(event) => setStaffNotes(event.target.value)}
              placeholder={manualCopy.notesPlaceholder}
              rows={2}
              maxLength={500}
            />
          </div>

          {dialUrl ? (
            <Button asChild className="h-12 w-full gap-2 text-base">
              <a href={dialUrl}>
                <Phone className="h-5 w-5" aria-hidden />
                {copy.call}
              </a>
            </Button>
          ) : null}

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
                <Label htmlFor="manual-call-feedback">{copy.dialog.feedbackLabel}</Label>
                <Textarea
                  id="manual-call-feedback"
                  value={feedback}
                  onChange={(event) => setFeedback(event.target.value)}
                  placeholder={copy.dialog.feedbackPlaceholder}
                  rows={3}
                  maxLength={500}
                />
              </div>

              <div className="flex items-center justify-between gap-4 rounded-input border border-border px-4 py-3">
                <Label htmlFor="manual-schedule-follow-up" className="mt-0">
                  {copy.dialog.scheduleFollowUp}
                </Label>
                <Switch
                  id="manual-schedule-follow-up"
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
                  dateId="manual-follow-up-date"
                  timeId="manual-follow-up-time"
                />
              )}
            </div>
          )}

          {answered === "NOT_ANSWERED" && (
            <div className="space-y-2">
              <Label htmlFor="manual-not-answered-note">{copy.dialog.notAnsweredNoteLabel}</Label>
              <Textarea
                id="manual-not-answered-note"
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
            disabled={!canSubmit}
            onClick={handleSubmit}
          >
            {isSubmitting ? copy.dialog.saving : manualCopy.saveCall}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
