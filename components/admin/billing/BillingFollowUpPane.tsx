"use client";

import { useMemo, useState, useTransition } from "react";
import {
  CalendarClock,
  CheckCircle2,
  Loader2,
  MessageSquare,
  Phone,
  Receipt,
} from "lucide-react";
import type {
  BillingFollowUpChannel,
  BillingFollowUpOutcome,
  BillingPaymentStatus,
} from "@prisma/client";
import {
  useBillingAccountDetail,
  useCreateBillingFollowUp,
  useUpdateBillingPaymentStatus,
} from "@/hooks/useBillingFollowUps";
import { sendBillingWhatsAppReminder } from "@/lib/api/billing";
import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/useToast";
import { cn } from "@/lib/utils";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils/formatters";
import { shouldShowBillingReminderActions } from "@/lib/utils/billing-reminder-eligibility";
import { getBusinessPaymentStatus } from "@/lib/utils/admin-portfolio-filters";
import { useBillingCycleSettings } from "@/components/admin/BillingCycleSettingsProvider";
import { useBillingPricingConfig } from "@/components/admin/PlatformSettingsProvider";
import { calculateBusinessMonthlyBilling } from "@/lib/utils/store-billing-pricing";
import type { Content } from "@/content/en";
import type { BusinessPortfolioRow } from "@/types";
import { ApiError } from "@/types";

type AdminContent = Content["admin"];
type FollowUpCopy = AdminContent["billing"]["followUp"];
type BillingCopy = AdminContent["billing"];

const CHANNELS: BillingFollowUpChannel[] = [
  "EMAIL",
  "PHONE",
  "WHATSAPP",
  "IN_PERSON",
  "OTHER",
];

const OUTCOMES: BillingFollowUpOutcome[] = [
  "NO_RESPONSE",
  "PROMISED_PAYMENT",
  "PARTIAL_PAYMENT",
  "PAID",
  "DISPUTED",
  "RESCHEDULED",
  "OTHER",
];

function PaymentStatusPill({
  status,
  labels,
}: {
  status: BillingPaymentStatus;
  labels: FollowUpCopy["paymentStatus"];
}) {
  const styles: Record<BillingPaymentStatus, string> = {
    UNPAID: "bg-status-error/10 text-status-error",
    PAID: "bg-status-success/10 text-status-success",
    PARTIAL: "bg-status-warning/10 text-status-warning",
    WAIVED: "bg-surface-secondary text-text-muted",
    DISPUTED: "bg-status-warning/10 text-status-warning",
  };

  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium",
        styles[status],
      )}
    >
      {labels[status]}
    </span>
  );
}

function ChannelIcon({ channel }: { channel: BillingFollowUpChannel }) {
  switch (channel) {
    case "PHONE":
    case "WHATSAPP":
      return <Phone className="h-4 w-4 shrink-0" aria-hidden />;
    case "EMAIL":
      return <Receipt className="h-4 w-4 shrink-0" aria-hidden />;
    default:
      return <MessageSquare className="h-4 w-4 shrink-0" aria-hidden />;
  }
}

function fromDatetimeLocalValue(value: string): string | null {
  if (!value.trim()) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

interface BillingFollowUpPaneProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  business: BusinessPortfolioRow | null;
  copy: FollowUpCopy;
  billingCopy: BillingCopy;
  onWhatsAppSent?: () => void;
}

export function BillingFollowUpPane({
  open,
  onOpenChange,
  business,
  copy,
  billingCopy,
  onWhatsAppSent,
}: BillingFollowUpPaneProps) {
  const cycleSettings = useBillingCycleSettings();
  const billingPricing = useBillingPricingConfig();
  const businessKey = business?.businessKey ?? null;
  const [, startWhatsAppTransition] = useTransition();
  const [isSendingWhatsApp, setIsSendingWhatsApp] = useState(false);
  const { data: account, isLoading, isError } = useBillingAccountDetail(
    open ? businessKey : null,
  );
  const createFollowUp = useCreateBillingFollowUp(businessKey ?? "");
  const updatePayment = useUpdateBillingPaymentStatus(businessKey ?? "");

  const [channel, setChannel] = useState<BillingFollowUpChannel>("PHONE");
  const [outcome, setOutcome] = useState<BillingFollowUpOutcome>("PROMISED_PAYMENT");
  const [notes, setNotes] = useState("");
  const [nextFollowUpAt, setNextFollowUpAt] = useState("");

  const monthlyBilling = useMemo(
    () => (business ? calculateBusinessMonthlyBilling(business.stores, billingPricing) : null),
    [business, billingPricing],
  );

  function resetForm() {
    setChannel("PHONE");
    setOutcome("PROMISED_PAYMENT");
    setNotes("");
    setNextFollowUpAt("");
  }

  function handleApiError(error: unknown, fallback: string) {
    let message = fallback;
    if (error instanceof ApiError) {
      const bodyMessage = error.body.message?.trim();
      if (bodyMessage) message = bodyMessage;
    }
    toast({ title: message });
  }

  function handleSubmitFollowUp() {
    if (!businessKey || !notes.trim()) return;

    createFollowUp.mutate(
      {
        channel,
        outcome,
        notes: notes.trim(),
        nextFollowUpAt: fromDatetimeLocalValue(nextFollowUpAt),
      },
      {
        onSuccess: () => {
          toast({ title: copy.followUpSaved });
          resetForm();
        },
        onError: (error) => handleApiError(error, copy.followUpFailed),
      },
    );
  }

  function handleMarkPaid() {
    if (!businessKey) return;
    updatePayment.mutate(
      { paymentStatus: "PAID", notes: copy.markPaidNote },
      {
        onSuccess: () => toast({ title: copy.markedPaid }),
        onError: (error) => handleApiError(error, copy.updateFailed),
      },
    );
  }

  function handleMarkUnpaid() {
    if (!businessKey) return;
    updatePayment.mutate(
      { paymentStatus: "UNPAID", notes: copy.markUnpaidNote },
      {
        onSuccess: () => toast({ title: copy.markedUnpaid }),
        onError: (error) => handleApiError(error, copy.updateFailed),
      },
    );
  }

  function handleSendWhatsAppReminder() {
    if (!businessKey) return;
    setIsSendingWhatsApp(true);
    startWhatsAppTransition(async () => {
      try {
        const result = await sendBillingWhatsAppReminder(businessKey);
        if (result.delivery === "sent") {
          toast({
            title: billingCopy.whatsAppReminderSent,
            description: billingCopy.whatsAppReminderSentDescription.replace(
              "{phone}",
              result.phone,
            ),
          });
        } else if (result.delivery === "queued") {
          toast({
            title: billingCopy.whatsAppReminderQueued,
            description: billingCopy.whatsAppReminderQueuedDescription.replace(
              "{phone}",
              result.phone,
            ),
          });
        } else {
          if (result.whatsappUrl) {
            window.open(result.whatsappUrl, "_blank", "noopener,noreferrer");
          }
          toast({
            title: billingCopy.whatsAppReminderOpened,
            description: billingCopy.whatsAppReminderOpenedDescription.replace(
              "{phone}",
              result.phone,
            ),
          });
        }
        onWhatsAppSent?.();
      } catch (error) {
        handleApiError(error, billingCopy.whatsAppReminderFailed);
      } finally {
        setIsSendingWhatsApp(false);
      }
    });
  }

  const isPaid = account?.paymentStatus === "PAID";
  const portfolioStatus = business
    ? getBusinessPaymentStatus(business, new Date(), undefined, undefined, cycleSettings)
    : "UNKNOWN";
  const needsReminder = shouldShowBillingReminderActions(
    portfolioStatus,
    account?.paymentStatus,
  );
  const hasPhone = Boolean(business?.businessPhone?.trim());

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="p-0">
        <SheetHeader>
          <SheetTitle>{business?.businessName ?? copy.title}</SheetTitle>
          <SheetDescription>
            {business?.businessEmail ?? copy.noEmail}
          </SheetDescription>
          {monthlyBilling ? (
            <p className="pt-1 text-sm font-semibold tabular-nums text-text-primary">
              {copy.amountDue.replace(
                "{amount}",
                formatCurrency(monthlyBilling.grandTotal),
              )}
            </p>
          ) : null}
        </SheetHeader>

        <SheetBody className="space-y-6">
          {isLoading ? (
            <div className="space-y-3" aria-live="polite">
              <Skeleton className="h-8 w-32" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-40 w-full" />
            </div>
          ) : isError ? (
            <p className="text-sm text-status-error">{copy.loadFailed}</p>
          ) : account ? (
            <>
              <section className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <PaymentStatusPill
                    status={account.paymentStatus}
                    labels={copy.paymentStatus}
                  />
                  {account.nextFollowUpAt ? (
                    <span className="inline-flex items-center gap-1 text-xs text-text-muted">
                      <CalendarClock className="h-3.5 w-3.5" aria-hidden />
                      {copy.nextFollowUp.replace(
                        "{date}",
                        formatDateTime(account.nextFollowUpAt),
                      )}
                    </span>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-2">
                  {!isPaid ? (
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleMarkPaid}
                      disabled={updatePayment.isPending}
                    >
                      {updatePayment.isPending ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                      ) : (
                        <CheckCircle2 className="mr-2 h-4 w-4" aria-hidden />
                      )}
                      {copy.markPaid}
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={handleMarkUnpaid}
                      disabled={updatePayment.isPending}
                    >
                      {copy.markUnpaid}
                    </Button>
                  )}
                  {needsReminder && hasPhone ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="border-[#25D366]/40 text-[#128C7E] hover:bg-[#25D366]/10"
                      disabled={isSendingWhatsApp}
                      onClick={handleSendWhatsAppReminder}
                    >
                      {isSendingWhatsApp ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                      ) : (
                        <WhatsAppIcon className="mr-2" />
                      )}
                      {isSendingWhatsApp
                        ? billingCopy.sendingWhatsAppReminder
                        : billingCopy.sendWhatsAppReminder}
                    </Button>
                  ) : null}
                </div>
              </section>

              <section className="space-y-2">
                <h3 className="text-sm font-semibold text-text-primary">
                  {copy.invoiceHistory}
                </h3>
                {account.invoiceLogs.length === 0 ? (
                  <p className="text-sm text-text-muted">{copy.noInvoices}</p>
                ) : (
                  <ul className="space-y-2">
                    {account.invoiceLogs.map((invoice) => (
                      <li
                        key={invoice.id}
                        className="rounded-md border border-border bg-surface-secondary/30 px-3 py-2 text-sm"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="font-medium text-text-primary">
                            {invoice.invoiceNumber}
                          </span>
                          <span className="tabular-nums text-text-secondary">
                            {formatCurrency(invoice.grandTotal)}
                          </span>
                        </div>
                        <p className="mt-0.5 text-xs text-text-muted">
                          {copy.invoiceSentTo
                            .replace("{email}", invoice.sentTo)
                            .replace("{date}", formatDateTime(invoice.createdAt))}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section className="space-y-3 rounded-md border border-border bg-surface-secondary/20 p-4">
                <h3 className="text-sm font-semibold text-text-primary">
                  {copy.addFollowUp}
                </h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="follow-up-channel">{copy.channel}</Label>
                    <Select
                      value={channel}
                      onValueChange={(value) =>
                        setChannel(value as BillingFollowUpChannel)
                      }
                    >
                      <SelectTrigger id="follow-up-channel">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CHANNELS.map((item) => (
                          <SelectItem key={item} value={item}>
                            {copy.channels[item]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="follow-up-outcome">{copy.outcome}</Label>
                    <Select
                      value={outcome}
                      onValueChange={(value) =>
                        setOutcome(value as BillingFollowUpOutcome)
                      }
                    >
                      <SelectTrigger id="follow-up-outcome">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {OUTCOMES.map((item) => (
                          <SelectItem key={item} value={item}>
                            {copy.outcomes[item]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="follow-up-notes">{copy.notes}</Label>
                  <Textarea
                    id="follow-up-notes"
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    placeholder={copy.notesPlaceholder}
                    rows={4}
                    maxLength={2000}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="follow-up-next">{copy.nextFollowUpDate}</Label>
                  <Input
                    id="follow-up-next"
                    type="datetime-local"
                    value={nextFollowUpAt}
                    onChange={(event) => setNextFollowUpAt(event.target.value)}
                  />
                </div>
                <Button
                  type="button"
                  className="w-full sm:w-auto"
                  disabled={!notes.trim() || createFollowUp.isPending}
                  onClick={handleSubmitFollowUp}
                >
                  {createFollowUp.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                      {copy.saving}
                    </>
                  ) : (
                    copy.saveFollowUp
                  )}
                </Button>
              </section>

              <section className="space-y-2">
                <h3 className="text-sm font-semibold text-text-primary">
                  {copy.timeline} ({account.followUpCount})
                </h3>
                {account.followUps.length === 0 ? (
                  <p className="text-sm text-text-muted">{copy.noFollowUps}</p>
                ) : (
                  <ol className="relative space-y-4 border-l border-border pl-4">
                    {account.followUps.map((item) => (
                      <li key={item.id} className="relative">
                        <span
                          className="absolute -left-[1.35rem] top-1 flex h-5 w-5 items-center justify-center rounded-full bg-surface-card ring-2 ring-border"
                          aria-hidden
                        >
                          <ChannelIcon channel={item.channel} />
                        </span>
                        <div className="rounded-md border border-border/80 bg-surface-card px-3 py-2.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs font-medium uppercase tracking-wide text-text-muted">
                              {copy.channels[item.channel]}
                            </span>
                            <span className="text-xs text-text-secondary">
                              {copy.outcomes[item.outcome]}
                            </span>
                          </div>
                          <p className="mt-1.5 whitespace-pre-wrap text-sm text-text-primary">
                            {item.notes}
                          </p>
                          <p className="mt-2 text-xs text-text-muted">
                            {formatDateTime(item.createdAt)}
                            {item.createdByName ? ` · ${item.createdByName}` : ""}
                          </p>
                          {item.nextFollowUpAt ? (
                            <p className="mt-1 text-xs text-status-warning">
                              {copy.scheduledFor.replace(
                                "{date}",
                                formatDateTime(item.nextFollowUpAt),
                              )}
                            </p>
                          ) : null}
                        </div>
                      </li>
                    ))}
                  </ol>
                )}
              </section>
            </>
          ) : null}
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}
