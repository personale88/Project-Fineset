"use client";

import { useState } from "react";
import { Loader2, Play, Zap } from "lucide-react";
import {
  AutomationResultsHeader,
  AutomationSidePanel,
  scopeMeta,
  type AutomationScope,
} from "@/components/admin/automation/AutomationSidePanel";
import { AdminPageIntro } from "@/components/admin/AdminPageIntro";
import { AdminLoadErrorBanner } from "@/components/admin/AdminLoadErrorBanner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  useAutomationConfig,
  useAutomationRuns,
  useRunBillingAutomation,
  useUpdateAutomationConfig,
} from "@/hooks/useAutomation";
import { useAdminPortal } from "@/components/admin/AdminPortalContext";
import { toast } from "@/hooks/useToast";
import { DEFAULT_PLATFORM_AUTOMATION_CONFIG } from "@/lib/automation/default-config";
import type { PlatformAutomationConfig } from "@/lib/automation/types";
import type { Content } from "@/content/en";

type AdminContent = Content["admin"];

interface AdminAutomationCenterProps {
  admin: AdminContent;
}

const AUTOMATION_FIELD_HINT_CLASS = "min-h-10 text-xs leading-5 text-text-muted";

function AutomationFieldHint({ hint }: { hint?: string }) {
  return <p className={AUTOMATION_FIELD_HINT_CLASS}>{hint ?? "\u00A0"}</p>;
}

function ToggleRow({
  id,
  label,
  hint,
  checked,
  onCheckedChange,
  disabled,
}: {
  id: string;
  label: string;
  hint?: string;
  checked: boolean;
  onCheckedChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border py-4 last:border-0">
      <div className="min-w-0">
        <Label htmlFor={id} className="text-sm font-medium text-text-primary">
          {label}
        </Label>
        {hint ? <p className="mt-1 text-xs text-text-muted">{hint}</p> : null}
      </div>
      <Switch
        id={id}
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
      />
    </div>
  );
}

function NumberField({
  id,
  label,
  hint,
  value,
  min,
  max,
  onChange,
  disabled,
}: {
  id: string;
  label: string;
  hint?: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex h-full flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      <AutomationFieldHint hint={hint} />
      <Input
        id={id}
        type="number"
        min={min}
        max={max}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(Number.parseInt(event.target.value, 10) || min)}
      />
    </div>
  );
}

function TextField({
  id,
  label,
  hint,
  value,
  onChange,
  disabled,
}: {
  id: string;
  label: string;
  hint?: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex h-full flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      <AutomationFieldHint hint={hint} />
      <Input
        id={id}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

function DaysListField({
  id,
  label,
  hint,
  value,
  onChange,
  disabled,
}: {
  id: string;
  label: string;
  hint?: string;
  value: number[];
  onChange: (value: number[]) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex h-full flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      <AutomationFieldHint hint={hint} />
      <Input
        id={id}
        disabled={disabled}
        value={value.join(", ")}
        placeholder="3, 1, 7"
        onChange={(event) => {
          const parsed = event.target.value
            .split(",")
            .map((part) => Number.parseInt(part.trim(), 10))
            .filter((n) => Number.isFinite(n) && n >= 0);
          onChange(parsed);
        }}
      />
    </div>
  );
}

function ConfigSection({
  children,
  onSave,
  saving,
  saveLabel,
  canEdit,
}: {
  children: React.ReactNode;
  onSave: () => void;
  saving: boolean;
  saveLabel: string;
  canEdit: boolean;
}) {
  return (
    <div className="space-y-6 p-4 sm:p-5">
      {children}
      {canEdit ? (
        <div className="flex justify-end border-t border-border pt-4">
          <Button type="button" onClick={onSave} disabled={saving}>
            {saving ? <Loader2 className="mr-2 size-4 animate-spin" aria-hidden /> : null}
            {saveLabel}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function statusBadgeVariant(
  status: string,
): "default" | "secondary" | "error" | "outline" {
  switch (status) {
    case "SUCCESS":
      return "default";
    case "PARTIAL":
      return "secondary";
    case "FAILED":
      return "error";
    default:
      return "outline";
  }
}

export function AdminAutomationCenter({ admin }: AdminAutomationCenterProps) {
  const copy = admin.automation;
  const { role } = useAdminPortal();
  const canEdit = role === "MASTER_ADMIN";

  const [scope, setScope] = useState<AutomationScope>("overview");
  const [draft, setDraft] = useState<PlatformAutomationConfig>(
    DEFAULT_PLATFORM_AUTOMATION_CONFIG,
  );

  const { data, isLoading, isError, refetch } = useAutomationConfig();
  const updateMutation = useUpdateAutomationConfig();
  const runMutation = useRunBillingAutomation();
  const { data: runsData, isLoading: runsLoading } = useAutomationRuns();

  const [prevConfig, setPrevConfig] = useState(data);
  if (data !== prevConfig) {
    setPrevConfig(data);
    if (data) setDraft(data);
  }

  const { title, description } = scopeMeta(copy, scope);

  async function saveSection(section: keyof PlatformAutomationConfig) {
    try {
      await updateMutation.mutateAsync({ [section]: draft[section] });
      toast({ title: copy.saveSuccess });
    } catch {
      toast({ title: copy.saveFailed });
    }
  }

  async function handleRun(dryRun: boolean) {
    try {
      const result = await runMutation.mutateAsync({ dryRun });
      toast({
        title: dryRun ? copy.runDryRunSuccess : copy.runSuccess,
        description: copy.runSummary
          .replace("{invoices}", String(result.summary.invoicesSent))
          .replace("{reminders}", String(result.summary.paymentRemindersSent))
          .replace("{followUps}", String(result.summary.followUpsScheduled)),
      });
    } catch {
      toast({ title: copy.runFailed });
    }
  }

  if (isLoading) {
    return <p className="text-sm text-text-secondary">{copy.loading}</p>;
  }

  return (
    <div className="mx-auto flex max-w-7xl flex-col space-y-6">
      <AdminPageIntro
        title={copy.title}
        subtitle={copy.subtitle}
        nav={admin.nav}
      />

      {isError ? (
        <AdminLoadErrorBanner
          message={copy.loadFailed}
          retryLabel={copy.retry}
          onRetry={() => void refetch()}
        />
      ) : null}

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:gap-6">
        <AutomationSidePanel copy={copy} value={scope} onChange={setScope} />

        <div className="min-w-0 flex-1 overflow-hidden rounded-card border border-border bg-surface-card shadow-card">
          <AutomationResultsHeader title={title} description={description} />

          {scope === "overview" ? (
            <ConfigSection
              canEdit={canEdit}
              saving={updateMutation.isPending}
              saveLabel={copy.save}
              onSave={() => void saveSection("global")}
            >
              <div className="rounded-lg border border-brand-gold/25 bg-brand-gold/5 p-4">
                <div className="flex items-center gap-2 text-brand-gold">
                  <Zap className="size-5" aria-hidden />
                  <p className="font-medium">{copy.overview.masterTitle}</p>
                </div>
                <p className="mt-2 text-sm text-text-secondary">{copy.overview.masterHint}</p>
              </div>

              <ToggleRow
                id="global-enabled"
                label={copy.fields.globalEnabled}
                hint={copy.fields.globalEnabledHint}
                checked={draft.global.enabled}
                disabled={!canEdit}
                onCheckedChange={(enabled) =>
                  setDraft((prev) => ({ ...prev, global: { ...prev.global, enabled } }))
                }
              />
              <ToggleRow
                id="global-dry-run"
                label={copy.fields.dryRunMode}
                hint={copy.fields.dryRunModeHint}
                checked={draft.global.dryRunMode}
                disabled={!canEdit}
                onCheckedChange={(dryRunMode) =>
                  setDraft((prev) => ({ ...prev, global: { ...prev.global, dryRunMode } }))
                }
              />

              <div className="grid items-stretch gap-4 sm:grid-cols-2">
                <TextField
                  id="timezone"
                  label={copy.fields.timezone}
                  value={draft.global.timezone}
                  disabled={!canEdit}
                  onChange={(timezone) =>
                    setDraft((prev) => ({
                      ...prev,
                      global: { ...prev.global, timezone },
                    }))
                  }
                />
              </div>

              {canEdit ? (
                <div className="flex flex-wrap gap-2 border-t border-border pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={runMutation.isPending}
                    onClick={() => void handleRun(true)}
                  >
                    <Play className="mr-2 size-4" aria-hidden />
                    {copy.runDryRun}
                  </Button>
                  <Button
                    type="button"
                    disabled={runMutation.isPending || !draft.global.enabled}
                    onClick={() => void handleRun(false)}
                  >
                    <Play className="mr-2 size-4" aria-hidden />
                    {copy.runNow}
                  </Button>
                </div>
              ) : null}

              <p className="text-xs text-text-muted">{copy.overview.cronHint}</p>
            </ConfigSection>
          ) : null}

          {scope === "billingCycle" ? (
            <ConfigSection
              canEdit={canEdit}
              saving={updateMutation.isPending}
              saveLabel={copy.save}
              onSave={() => void saveSection("billingCycle")}
            >
              <div className="grid items-stretch gap-4 sm:grid-cols-3">
                <NumberField
                  id="cycle-start-day"
                  label={copy.fields.cycleStartDay}
                  hint={copy.fields.cycleStartDayHint}
                  value={draft.billingCycle.cycleStartDay}
                  min={1}
                  max={28}
                  disabled={!canEdit}
                  onChange={(cycleStartDay) =>
                    setDraft((prev) => ({
                      ...prev,
                      billingCycle: { ...prev.billingCycle, cycleStartDay },
                    }))
                  }
                />
                <NumberField
                  id="payment-due-day"
                  label={copy.fields.paymentDueDay}
                  hint={copy.fields.paymentDueDayHint}
                  value={draft.billingCycle.paymentDueDay}
                  min={1}
                  max={28}
                  disabled={!canEdit}
                  onChange={(paymentDueDay) =>
                    setDraft((prev) => ({
                      ...prev,
                      billingCycle: { ...prev.billingCycle, paymentDueDay },
                    }))
                  }
                />
                <NumberField
                  id="grace-period-days"
                  label={copy.fields.gracePeriodDays}
                  hint={copy.fields.gracePeriodDaysHint}
                  value={draft.billingCycle.gracePeriodDays}
                  min={1}
                  max={28}
                  disabled={!canEdit}
                  onChange={(gracePeriodDays) =>
                    setDraft((prev) => ({
                      ...prev,
                      billingCycle: { ...prev.billingCycle, gracePeriodDays },
                    }))
                  }
                />
              </div>
            </ConfigSection>
          ) : null}

          {scope === "invoices" ? (
            <ConfigSection
              canEdit={canEdit}
              saving={updateMutation.isPending}
              saveLabel={copy.save}
              onSave={() => void saveSection("invoices")}
            >
              <ToggleRow
                id="auto-send-invoices"
                label={copy.fields.autoSendInvoices}
                hint={copy.fields.autoSendInvoicesHint}
                checked={draft.invoices.autoSendEnabled}
                disabled={!canEdit}
                onCheckedChange={(autoSendEnabled) =>
                  setDraft((prev) => ({
                    ...prev,
                    invoices: { ...prev.invoices, autoSendEnabled },
                  }))
                }
              />
              <ToggleRow
                id="payment-confirmation"
                label={copy.fields.paymentConfirmation}
                hint={copy.fields.paymentConfirmationHint}
                checked={draft.invoices.paymentConfirmationEnabled}
                disabled={!canEdit}
                onCheckedChange={(paymentConfirmationEnabled) =>
                  setDraft((prev) => ({
                    ...prev,
                    invoices: { ...prev.invoices, paymentConfirmationEnabled },
                  }))
                }
              />
              <ToggleRow
                id="skip-if-paid"
                label={copy.fields.skipIfPaid}
                hint={copy.fields.skipIfPaidHint}
                checked={draft.invoices.skipIfPaid}
                disabled={!canEdit}
                onCheckedChange={(skipIfPaid) =>
                  setDraft((prev) => ({
                    ...prev,
                    invoices: { ...prev.invoices, skipIfPaid },
                  }))
                }
              />
              <div className="grid items-stretch gap-4 sm:grid-cols-2">
                <NumberField
                  id="invoice-send-day"
                  label={copy.fields.invoiceSendDay}
                  hint={copy.fields.invoiceSendDayHint}
                  value={draft.invoices.sendDayOfMonth}
                  min={1}
                  max={28}
                  disabled={!canEdit}
                  onChange={(sendDayOfMonth) =>
                    setDraft((prev) => ({
                      ...prev,
                      invoices: { ...prev.invoices, sendDayOfMonth },
                    }))
                  }
                />
                <NumberField
                  id="days-before-renewal"
                  label={copy.fields.daysBeforeRenewal}
                  hint={copy.fields.daysBeforeRenewalHint}
                  value={draft.invoices.daysBeforeRenewal}
                  min={0}
                  max={30}
                  disabled={!canEdit}
                  onChange={(daysBeforeRenewal) =>
                    setDraft((prev) => ({
                      ...prev,
                      invoices: { ...prev.invoices, daysBeforeRenewal },
                    }))
                  }
                />
              </div>
            </ConfigSection>
          ) : null}

          {scope === "paymentReminders" ? (
            <ConfigSection
              canEdit={canEdit}
              saving={updateMutation.isPending}
              saveLabel={copy.save}
              onSave={() => void saveSection("paymentReminders")}
            >
              <ToggleRow
                id="reminders-enabled"
                label={copy.fields.remindersEnabled}
                checked={draft.paymentReminders.enabled}
                disabled={!canEdit}
                onCheckedChange={(enabled) =>
                  setDraft((prev) => ({
                    ...prev,
                    paymentReminders: { ...prev.paymentReminders, enabled },
                  }))
                }
              />
              <ToggleRow
                id="reminder-email"
                label={copy.fields.reminderEmail}
                checked={draft.paymentReminders.emailEnabled}
                disabled={!canEdit}
                onCheckedChange={(emailEnabled) =>
                  setDraft((prev) => ({
                    ...prev,
                    paymentReminders: { ...prev.paymentReminders, emailEnabled },
                  }))
                }
              />
              <ToggleRow
                id="reminder-whatsapp"
                label={copy.fields.reminderWhatsApp}
                hint={copy.fields.reminderWhatsAppHint}
                checked={draft.paymentReminders.whatsAppEnabled}
                disabled={!canEdit}
                onCheckedChange={(whatsAppEnabled) =>
                  setDraft((prev) => ({
                    ...prev,
                    paymentReminders: { ...prev.paymentReminders, whatsAppEnabled },
                  }))
                }
              />
              <DaysListField
                id="reminder-before-due"
                label={copy.fields.reminderDaysBeforeDue}
                hint={copy.fields.reminderDaysBeforeDueHint}
                value={draft.paymentReminders.reminderDaysBeforeDue}
                disabled={!canEdit}
                onChange={(reminderDaysBeforeDue) =>
                  setDraft((prev) => ({
                    ...prev,
                    paymentReminders: { ...prev.paymentReminders, reminderDaysBeforeDue },
                  }))
                }
              />
              <DaysListField
                id="reminder-after-due"
                label={copy.fields.reminderDaysAfterDue}
                hint={copy.fields.reminderDaysAfterDueHint}
                value={draft.paymentReminders.reminderDaysAfterDue}
                disabled={!canEdit}
                onChange={(reminderDaysAfterDue) =>
                  setDraft((prev) => ({
                    ...prev,
                    paymentReminders: { ...prev.paymentReminders, reminderDaysAfterDue },
                  }))
                }
              />
              <NumberField
                id="max-reminders"
                label={copy.fields.maxRemindersPerCycle}
                value={draft.paymentReminders.maxRemindersPerCycle}
                min={1}
                max={20}
                disabled={!canEdit}
                onChange={(maxRemindersPerCycle) =>
                  setDraft((prev) => ({
                    ...prev,
                    paymentReminders: { ...prev.paymentReminders, maxRemindersPerCycle },
                  }))
                }
              />
            </ConfigSection>
          ) : null}

          {scope === "followUps" ? (
            <ConfigSection
              canEdit={canEdit}
              saving={updateMutation.isPending}
              saveLabel={copy.save}
              onSave={() => void saveSection("followUps")}
            >
              <ToggleRow
                id="follow-ups-enabled"
                label={copy.fields.followUpsEnabled}
                checked={draft.followUps.enabled}
                disabled={!canEdit}
                onCheckedChange={(enabled) =>
                  setDraft((prev) => ({
                    ...prev,
                    followUps: { ...prev.followUps, enabled },
                  }))
                }
              />
              <ToggleRow
                id="auto-schedule-next"
                label={copy.fields.autoScheduleNext}
                hint={copy.fields.autoScheduleNextHint}
                checked={draft.followUps.autoScheduleNext}
                disabled={!canEdit}
                onCheckedChange={(autoScheduleNext) =>
                  setDraft((prev) => ({
                    ...prev,
                    followUps: { ...prev.followUps, autoScheduleNext },
                  }))
                }
              />
              <NumberField
                id="max-follow-ups"
                label={copy.fields.maxFollowUps}
                value={draft.followUps.maxFollowUps}
                min={1}
                max={20}
                disabled={!canEdit}
                onChange={(maxFollowUps) =>
                  setDraft((prev) => ({
                    ...prev,
                    followUps: { ...prev.followUps, maxFollowUps },
                  }))
                }
              />
              <DaysListField
                id="follow-up-spacing"
                label={copy.fields.followUpSpacingDays}
                hint={copy.fields.followUpSpacingDaysHint}
                value={draft.followUps.spacingDays}
                disabled={!canEdit}
                onChange={(spacingDays) =>
                  setDraft((prev) => ({
                    ...prev,
                    followUps: { ...prev.followUps, spacingDays },
                  }))
                }
              />
              <div className="space-y-2">
                <Label htmlFor="default-channel">{copy.fields.defaultFollowUpChannel}</Label>
                <select
                  id="default-channel"
                  disabled={!canEdit}
                  value={draft.followUps.defaultChannel}
                  className="flex h-10 w-full rounded-md border border-border bg-surface-card px-3 text-sm"
                  onChange={(event) =>
                    setDraft((prev) => ({
                      ...prev,
                      followUps: {
                        ...prev.followUps,
                        defaultChannel: event.target.value as "EMAIL" | "WHATSAPP" | "PHONE",
                      },
                    }))
                  }
                >
                  <option value="EMAIL">Email</option>
                  <option value="WHATSAPP">WhatsApp</option>
                  <option value="PHONE">Phone</option>
                </select>
              </div>
            </ConfigSection>
          ) : null}

          {scope === "expiryRenewal" ? (
            <ConfigSection
              canEdit={canEdit}
              saving={updateMutation.isPending}
              saveLabel={copy.save}
              onSave={() => void saveSection("expiryRenewal")}
            >
              <ToggleRow
                id="renewal-reminders"
                label={copy.fields.renewalRemindersEnabled}
                checked={draft.expiryRenewal.renewalReminderEnabled}
                disabled={!canEdit}
                onCheckedChange={(renewalReminderEnabled) =>
                  setDraft((prev) => ({
                    ...prev,
                    expiryRenewal: { ...prev.expiryRenewal, renewalReminderEnabled },
                  }))
                }
              />
              <ToggleRow
                id="expiry-warnings"
                label={copy.fields.expiryWarningsEnabled}
                checked={draft.expiryRenewal.expiryReminderEnabled}
                disabled={!canEdit}
                onCheckedChange={(expiryReminderEnabled) =>
                  setDraft((prev) => ({
                    ...prev,
                    expiryRenewal: { ...prev.expiryRenewal, expiryReminderEnabled },
                  }))
                }
              />
              <DaysListField
                id="renewal-days-before"
                label={copy.fields.renewalReminderDaysBefore}
                value={draft.expiryRenewal.renewalReminderDaysBefore}
                disabled={!canEdit}
                onChange={(renewalReminderDaysBefore) =>
                  setDraft((prev) => ({
                    ...prev,
                    expiryRenewal: { ...prev.expiryRenewal, renewalReminderDaysBefore },
                  }))
                }
              />
              <DaysListField
                id="expiry-days-before"
                label={copy.fields.expiryWarningDaysBefore}
                value={draft.expiryRenewal.expiryWarningDaysBefore}
                disabled={!canEdit}
                onChange={(expiryWarningDaysBefore) =>
                  setDraft((prev) => ({
                    ...prev,
                    expiryRenewal: { ...prev.expiryRenewal, expiryWarningDaysBefore },
                  }))
                }
              />
            </ConfigSection>
          ) : null}

          {scope === "monthlyReports" ? (
            <ConfigSection
              canEdit={canEdit}
              saving={updateMutation.isPending}
              saveLabel={copy.save}
              onSave={() => void saveSection("monthlyReports")}
            >
              <ToggleRow
                id="monthly-reports-enabled"
                label={copy.fields.monthlyReportsEnabled}
                checked={draft.monthlyReports.enabled}
                disabled={!canEdit}
                onCheckedChange={(enabled) =>
                  setDraft((prev) => ({
                    ...prev,
                    monthlyReports: { ...prev.monthlyReports, enabled },
                  }))
                }
              />
              <div className="grid items-stretch gap-4 sm:grid-cols-2">
                <NumberField
                  id="report-send-day"
                  label={copy.fields.reportSendDay}
                  value={draft.monthlyReports.sendDayOfMonth}
                  min={1}
                  max={28}
                  disabled={!canEdit}
                  onChange={(sendDayOfMonth) =>
                    setDraft((prev) => ({
                      ...prev,
                      monthlyReports: { ...prev.monthlyReports, sendDayOfMonth },
                    }))
                  }
                />
                <NumberField
                  id="report-send-hour"
                  label={copy.fields.reportSendHour}
                  hint={copy.fields.reportSendHourHint}
                  value={draft.monthlyReports.sendHourLocal}
                  min={0}
                  max={23}
                  disabled={!canEdit}
                  onChange={(sendHourLocal) =>
                    setDraft((prev) => ({
                      ...prev,
                      monthlyReports: { ...prev.monthlyReports, sendHourLocal },
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="report-recipients">{copy.fields.reportRecipients}</Label>
                <select
                  id="report-recipients"
                  disabled={!canEdit}
                  value={draft.monthlyReports.recipients}
                  className="flex h-10 w-full rounded-md border border-border bg-surface-card px-3 text-sm"
                  onChange={(event) =>
                    setDraft((prev) => ({
                      ...prev,
                      monthlyReports: {
                        ...prev.monthlyReports,
                        recipients: event.target.value as
                          | "business_owners"
                          | "admin_only"
                          | "both",
                      },
                    }))
                  }
                >
                  <option value="business_owners">{copy.fields.recipientsBusinessOwners}</option>
                  <option value="admin_only">{copy.fields.recipientsAdminOnly}</option>
                  <option value="both">{copy.fields.recipientsBoth}</option>
                </select>
              </div>
              <ToggleRow
                id="include-portfolio"
                label={copy.fields.includePortfolioSummary}
                checked={draft.monthlyReports.includePortfolioSummary}
                disabled={!canEdit}
                onCheckedChange={(includePortfolioSummary) =>
                  setDraft((prev) => ({
                    ...prev,
                    monthlyReports: { ...prev.monthlyReports, includePortfolioSummary },
                  }))
                }
              />
              <ToggleRow
                id="include-store-metrics"
                label={copy.fields.includePerStoreMetrics}
                checked={draft.monthlyReports.includePerStoreMetrics}
                disabled={!canEdit}
                onCheckedChange={(includePerStoreMetrics) =>
                  setDraft((prev) => ({
                    ...prev,
                    monthlyReports: { ...prev.monthlyReports, includePerStoreMetrics },
                  }))
                }
              />
            </ConfigSection>
          ) : null}

          {scope === "whatsApp" ? (
            <ConfigSection
              canEdit={canEdit}
              saving={updateMutation.isPending}
              saveLabel={copy.save}
              onSave={() => void saveSection("whatsApp")}
            >
              <ToggleRow
                id="whatsapp-enabled"
                label={copy.fields.whatsAppEnabled}
                hint={copy.fields.whatsAppEnabledHint}
                checked={draft.whatsApp.enabled}
                disabled={!canEdit}
                onCheckedChange={(enabled) =>
                  setDraft((prev) => ({
                    ...prev,
                    whatsApp: { ...prev.whatsApp, enabled },
                  }))
                }
              />
              <ToggleRow
                id="business-hours-only"
                label={copy.fields.businessHoursOnly}
                checked={draft.whatsApp.businessHoursOnly}
                disabled={!canEdit}
                onCheckedChange={(businessHoursOnly) =>
                  setDraft((prev) => ({
                    ...prev,
                    whatsApp: { ...prev.whatsApp, businessHoursOnly },
                  }))
                }
              />
              <div className="grid items-stretch gap-4 sm:grid-cols-3">
                <TextField
                  id="country-code"
                  label={copy.fields.defaultCountryCode}
                  value={draft.whatsApp.defaultCountryCode}
                  disabled={!canEdit}
                  onChange={(defaultCountryCode) =>
                    setDraft((prev) => ({
                      ...prev,
                      whatsApp: { ...prev.whatsApp, defaultCountryCode },
                    }))
                  }
                />
                <TextField
                  id="hours-start"
                  label={copy.fields.businessHoursStart}
                  value={draft.whatsApp.businessHoursStart}
                  disabled={!canEdit}
                  onChange={(businessHoursStart) =>
                    setDraft((prev) => ({
                      ...prev,
                      whatsApp: { ...prev.whatsApp, businessHoursStart },
                    }))
                  }
                />
                <TextField
                  id="hours-end"
                  label={copy.fields.businessHoursEnd}
                  value={draft.whatsApp.businessHoursEnd}
                  disabled={!canEdit}
                  onChange={(businessHoursEnd) =>
                    setDraft((prev) => ({
                      ...prev,
                      whatsApp: { ...prev.whatsApp, businessHoursEnd },
                    }))
                  }
                />
              </div>
            </ConfigSection>
          ) : null}

          {scope === "history" ? (
            <div className="p-4 sm:p-5">
              {runsLoading ? (
                <p className="text-sm text-text-secondary">{copy.loading}</p>
              ) : !runsData?.runs.length ? (
                <p className="text-sm text-text-secondary">{copy.history.empty}</p>
              ) : (
                <ul className="divide-y divide-border rounded-lg border border-border">
                  {runsData.runs.map((run) => (
                    <li key={run.id} className="space-y-2 px-4 py-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Badge variant={statusBadgeVariant(run.status)}>{run.status}</Badge>
                          <span className="text-xs text-text-muted">{run.trigger}</span>
                        </div>
                        <span className="text-xs text-text-muted">
                          {new Date(run.startedAt).toLocaleString("en-IN")}
                        </span>
                      </div>
                      <p className="text-sm text-text-secondary">
                        {copy.history.summaryLine
                          .replace("{invoices}", String(run.summary.invoicesSent))
                          .replace("{reminders}", String(run.summary.paymentRemindersSent))
                          .replace("{whatsapp}", String(run.summary.whatsAppQueued))
                          .replace("{followUps}", String(run.summary.followUpsScheduled))}
                      </p>
                      {run.errors?.length ? (
                        <p className="text-xs text-status-error">{run.errors.join(" · ")}</p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : null}

          {!canEdit && scope !== "history" ? (
            <p className="border-t border-border px-4 py-3 text-xs text-text-muted sm:px-5">
              {copy.readOnlyHint}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
