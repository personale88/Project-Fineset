"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  XCircle,
} from "lucide-react";
import { StoreCategoryEditDialog } from "@/components/admin/settings/StoreCategoryEditDialog";
import {
  SettingsResultsHeader,
  SettingsSidePanel,
  scopeMeta,
  type SettingsScope,
} from "@/components/admin/settings/SettingsSidePanel";
import { AdminPageIntro } from "@/components/admin/AdminPageIntro";
import { AdminLoadErrorBanner } from "@/components/admin/AdminLoadErrorBanner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAdminPortal } from "@/components/admin/AdminPortalContext";
import {
  useCreateStoreCategory,
  useDeleteStoreCategory,
  usePlatformSettings,
  useRestoreStoreCategory,
  useStoreCategories,
  useUpdatePlatformSettings,
  useUpdateStoreCategory,
} from "@/hooks/usePlatformSettings";
import { toast } from "@/hooks/useToast";
import { DEFAULT_PLATFORM_SETTINGS } from "@/lib/platform/default-settings";
import type { StoreCategoryChoice } from "@/lib/store-category/catalog";
import type { PlatformSettings } from "@/lib/platform/types";
import { formatPricingTiersSummary } from "@/lib/utils/store-billing-pricing";
import type { Content } from "@/content/en";

type AdminContent = Content["admin"];

interface AdminSettingsCenterProps {
  admin: AdminContent;
}

const SETTINGS_FIELD_HINT_CLASS = "min-h-10 text-xs leading-5 text-text-muted";

function SettingsFieldHint({ hint }: { hint?: string }) {
  return <p className={SETTINGS_FIELD_HINT_CLASS}>{hint ?? "\u00A0"}</p>;
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
  step = 1,
  onChange,
  disabled,
}: {
  id: string;
  label: string;
  hint?: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex h-full flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      <SettingsFieldHint hint={hint} />
      <Input
        id={id}
        type="number"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(event) => {
          const parsed = Number.parseFloat(event.target.value);
          onChange(Number.isFinite(parsed) ? parsed : min);
        }}
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
  type = "text",
}: {
  id: string;
  label: string;
  hint?: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  type?: "text" | "email";
}) {
  return (
    <div className="flex h-full flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      <SettingsFieldHint hint={hint} />
      <Input
        id={id}
        type={type}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
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

function IntegrationRow({
  label,
  configured,
  detail,
  configuredLabel,
  notConfiguredLabel,
}: {
  label: string;
  configured: boolean;
  detail?: string;
  configuredLabel: string;
  notConfiguredLabel: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border py-4 last:border-0">
      <div className="min-w-0">
        <p className="text-sm font-medium text-text-primary">{label}</p>
        {detail ? <p className="mt-1 text-xs text-text-muted">{detail}</p> : null}
      </div>
      <Badge variant={configured ? "default" : "secondary"} className="shrink-0 gap-1">
        {configured ? (
          <CheckCircle2 className="size-3" aria-hidden />
        ) : (
          <XCircle className="size-3" aria-hidden />
        )}
        {configured ? configuredLabel : notConfiguredLabel}
      </Badge>
    </div>
  );
}

export function AdminSettingsCenter({ admin }: AdminSettingsCenterProps) {
  const copy = admin.settings;
  const { role } = useAdminPortal();
  const canEdit = role === "MASTER_ADMIN";
  const router = useRouter();

  const [scope, setScope] = useState<SettingsScope>("general");
  const [draft, setDraft] = useState<PlatformSettings>(DEFAULT_PLATFORM_SETTINGS);
  const [newCategory, setNewCategory] = useState("");
  const [editingCategory, setEditingCategory] = useState<StoreCategoryChoice | null>(null);

  const { data, isLoading, isError, refetch } = usePlatformSettings();
  const updateMutation = useUpdatePlatformSettings();
  const {
    data: categories = [],
    isLoading: categoriesLoading,
    refetch: refetchCategories,
  } = useStoreCategories();
  const createCategoryMutation = useCreateStoreCategory();
  const updateCategoryMutation = useUpdateStoreCategory();
  const deleteCategoryMutation = useDeleteStoreCategory();
  const restoreCategoryMutation = useRestoreStoreCategory();

  useEffect(() => {
    if (data?.settings) setDraft(data.settings);
  }, [data]);

  const { title, description } = scopeMeta(copy, scope);

  async function saveSection(section: keyof PlatformSettings) {
    try {
      const result = await updateMutation.mutateAsync({ [section]: draft[section] });
      setDraft(result.settings);
      router.refresh();
      toast({ title: copy.saveSuccess });
    } catch {
      toast({ title: copy.saveFailed });
    }
  }

  async function handleAddCategory() {
    const name = newCategory.trim();
    if (!name) return;
    try {
      await createCategoryMutation.mutateAsync(name);
      setNewCategory("");
      toast({ title: copy.categories.addSuccess });
    } catch {
      toast({ title: copy.categories.addFailed });
    }
  }

  async function handleDeleteCategory(category: StoreCategoryChoice) {
    const confirmMessage = category.isBuiltin
      ? copy.categories.deleteBuiltinConfirm
      : category.storeCount > 0
        ? copy.categories.deleteConfirmWithStores.replace("{count}", String(category.storeCount))
        : copy.categories.deleteConfirm;

    if (!window.confirm(confirmMessage)) return;

    try {
      await deleteCategoryMutation.mutateAsync(category.name);
      if (editingCategory?.name === category.name) {
        setEditingCategory(null);
      }
      router.refresh();
      toast({ title: copy.categories.deleteSuccess });
    } catch {
      toast({ title: copy.categories.deleteFailed });
    }
  }

  async function handleRestoreCategory(name: string) {
    try {
      await restoreCategoryMutation.mutateAsync(name);
      router.refresh();
      toast({ title: copy.categories.restoreSuccess });
    } catch {
      toast({ title: copy.categories.restoreFailed });
    }
  }

  async function handleSaveCategoryEdit(input: {
    name: string;
    label: string;
    newName?: string;
  }) {
    try {
      await updateCategoryMutation.mutateAsync(input);
      setEditingCategory(null);
      router.refresh();
      toast({ title: copy.categories.editSuccess });
    } catch {
      toast({ title: copy.categories.editFailed });
    }
  }

  if (isLoading) {
    return <p className="text-sm text-text-secondary">{copy.loading}</p>;
  }

  const metaLine =
    data?.meta.updatedAt && data.meta.updatedByEmail
      ? copy.lastUpdated
          .replace("{date}", new Date(data.meta.updatedAt).toLocaleString("en-IN"))
          .replace("{email}", data.meta.updatedByEmail)
      : copy.neverSaved;

  return (
    <div className="space-y-6">
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

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        <SettingsSidePanel copy={copy} value={scope} onChange={setScope} />

        <div className="min-w-0 flex-1 overflow-hidden rounded-xl border border-border bg-surface-card">
          <SettingsResultsHeader
            title={title}
            description={description}
            meta={scope !== "integrations" && scope !== "categories" ? metaLine : undefined}
          />

          {scope === "general" ? (
            <ConfigSection
              canEdit={canEdit}
              saving={updateMutation.isPending}
              saveLabel={copy.save}
              onSave={() => void saveSection("general")}
            >
              <TextField
                id="platform-name"
                label={copy.fields.platformName}
                hint={copy.fields.platformNameHint}
                value={draft.general.platformName}
                disabled={!canEdit}
                onChange={(platformName) =>
                  setDraft((prev) => ({ ...prev, general: { ...prev.general, platformName } }))
                }
              />
              <div className="grid items-stretch gap-4 sm:grid-cols-2">
                <TextField
                  id="support-email"
                  type="email"
                  label={copy.fields.supportEmail}
                  hint={copy.fields.supportEmailHint}
                  value={draft.general.supportEmail}
                  disabled={!canEdit}
                  onChange={(supportEmail) =>
                    setDraft((prev) => ({ ...prev, general: { ...prev.general, supportEmail } }))
                  }
                />
                <TextField
                  id="support-phone"
                  label={copy.fields.supportPhone}
                  hint={copy.fields.supportPhoneHint}
                  value={draft.general.supportPhone}
                  disabled={!canEdit}
                  onChange={(supportPhone) =>
                    setDraft((prev) => ({ ...prev, general: { ...prev.general, supportPhone } }))
                  }
                />
              </div>
              <TextField
                id="default-timezone"
                label={copy.fields.defaultTimezone}
                hint={copy.fields.defaultTimezoneHint}
                value={draft.general.defaultTimezone}
                disabled={!canEdit}
                onChange={(defaultTimezone) =>
                  setDraft((prev) => ({ ...prev, general: { ...prev.general, defaultTimezone } }))
                }
              />
            </ConfigSection>
          ) : null}

          {scope === "billing" ? (
            <ConfigSection
              canEdit={canEdit}
              saving={updateMutation.isPending}
              saveLabel={copy.save}
              onSave={() => void saveSection("billing")}
            >
              <div className="rounded-lg border border-brand-gold/25 bg-brand-gold/5 p-4 text-sm text-text-secondary">
                {formatPricingTiersSummary(
                  {
                    gstRate: draft.billing.gstRatePercent / 100,
                    tier1MaxStaff: draft.billing.tier1MaxStaff,
                    tier2MaxStaff: draft.billing.tier2MaxStaff,
                    tier1MonthlyPrice: draft.billing.tier1MonthlyPrice,
                    tier2MonthlyPrice: draft.billing.tier2MonthlyPrice,
                    tier3MonthlyPrice: draft.billing.tier3MonthlyPrice,
                  },
                  draft.billing.gstRatePercent,
                )}
              </div>
              <ToggleRow
                id="restrict-portal"
                label={copy.fields.restrictPortalOnOverdue}
                hint={copy.fields.restrictPortalOnOverdueHint}
                checked={draft.billing.restrictPortalOnOverdue}
                disabled={!canEdit}
                onCheckedChange={(restrictPortalOnOverdue) =>
                  setDraft((prev) => ({
                    ...prev,
                    billing: { ...prev.billing, restrictPortalOnOverdue },
                  }))
                }
              />
              <div className="grid items-stretch gap-4 sm:grid-cols-3">
                <NumberField
                  id="gst-rate"
                  label={copy.fields.gstRatePercent}
                  hint={copy.fields.gstRatePercentHint}
                  value={draft.billing.gstRatePercent}
                  min={0}
                  max={100}
                  step={0.01}
                  disabled={!canEdit}
                  onChange={(gstRatePercent) =>
                    setDraft((prev) => ({
                      ...prev,
                      billing: { ...prev.billing, gstRatePercent },
                    }))
                  }
                />
                <NumberField
                  id="tier1-max"
                  label={copy.fields.tier1MaxStaff}
                  value={draft.billing.tier1MaxStaff}
                  min={1}
                  max={500}
                  disabled={!canEdit}
                  onChange={(tier1MaxStaff) =>
                    setDraft((prev) => ({
                      ...prev,
                      billing: { ...prev.billing, tier1MaxStaff },
                    }))
                  }
                />
                <NumberField
                  id="tier2-max"
                  label={copy.fields.tier2MaxStaff}
                  value={draft.billing.tier2MaxStaff}
                  min={2}
                  max={500}
                  disabled={!canEdit}
                  onChange={(tier2MaxStaff) =>
                    setDraft((prev) => ({
                      ...prev,
                      billing: { ...prev.billing, tier2MaxStaff },
                    }))
                  }
                />
              </div>
              <div className="grid items-stretch gap-4 sm:grid-cols-3">
                <NumberField
                  id="tier1-price"
                  label={copy.fields.tier1MonthlyPrice}
                  value={draft.billing.tier1MonthlyPrice}
                  min={0}
                  max={10_000_000}
                  disabled={!canEdit}
                  onChange={(tier1MonthlyPrice) =>
                    setDraft((prev) => ({
                      ...prev,
                      billing: { ...prev.billing, tier1MonthlyPrice },
                    }))
                  }
                />
                <NumberField
                  id="tier2-price"
                  label={copy.fields.tier2MonthlyPrice}
                  value={draft.billing.tier2MonthlyPrice}
                  min={0}
                  max={10_000_000}
                  disabled={!canEdit}
                  onChange={(tier2MonthlyPrice) =>
                    setDraft((prev) => ({
                      ...prev,
                      billing: { ...prev.billing, tier2MonthlyPrice },
                    }))
                  }
                />
                <NumberField
                  id="tier3-price"
                  label={copy.fields.tier3MonthlyPrice}
                  value={draft.billing.tier3MonthlyPrice}
                  min={0}
                  max={10_000_000}
                  disabled={!canEdit}
                  onChange={(tier3MonthlyPrice) =>
                    setDraft((prev) => ({
                      ...prev,
                      billing: { ...prev.billing, tier3MonthlyPrice },
                    }))
                  }
                />
              </div>
            </ConfigSection>
          ) : null}

          {scope === "security" ? (
            <ConfigSection
              canEdit={canEdit}
              saving={updateMutation.isPending}
              saveLabel={copy.save}
              onSave={() => void saveSection("security")}
            >
              <div className="flex h-full flex-col gap-2">
                <Label htmlFor="impersonation-override">{copy.fields.impersonationOverride}</Label>
                <SettingsFieldHint hint={copy.fields.impersonationOverrideHint} />
                <Select
                  value={
                    draft.security.impersonationOverride === null
                      ? "env"
                      : draft.security.impersonationOverride
                        ? "enabled"
                        : "disabled"
                  }
                  disabled={!canEdit}
                  onValueChange={(value) => {
                    const impersonationOverride =
                      value === "env" ? null : value === "enabled";
                    setDraft((prev) => ({
                      ...prev,
                      security: { ...prev.security, impersonationOverride },
                    }));
                  }}
                >
                  <SelectTrigger id="impersonation-override">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="env">{copy.fields.impersonationEnvDefault}</SelectItem>
                    <SelectItem value="enabled">{copy.fields.impersonationEnabled}</SelectItem>
                    <SelectItem value="disabled">{copy.fields.impersonationDisabled}</SelectItem>
                  </SelectContent>
                </Select>
                {data?.meta.integrations ? (
                  <p className="text-xs text-text-muted">
                    {copy.fields.impersonationEnvStatus.replace(
                      "{status}",
                      data.meta.integrations.impersonationEnvDefault
                        ? copy.integrations.configured
                        : copy.integrations.notConfigured,
                    )}
                  </p>
                ) : null}
              </div>
              <NumberField
                id="audit-retention"
                label={copy.fields.auditLogRetentionDays}
                hint={copy.fields.auditLogRetentionDaysHint}
                value={draft.security.auditLogRetentionDays}
                min={30}
                max={3650}
                disabled={!canEdit}
                onChange={(auditLogRetentionDays) =>
                  setDraft((prev) => ({
                    ...prev,
                    security: { ...prev.security, auditLogRetentionDays },
                  }))
                }
              />
            </ConfigSection>
          ) : null}

          {scope === "analytics" ? (
            <ConfigSection
              canEdit={canEdit}
              saving={updateMutation.isPending}
              saveLabel={copy.save}
              onSave={() => void saveSection("analytics")}
            >
              <ToggleRow
                id="analytics-enabled"
                label={copy.fields.analyticsEnabled}
                hint={copy.fields.analyticsEnabledHint}
                checked={draft.analytics.enabled}
                disabled={!canEdit}
                onCheckedChange={(enabled) =>
                  setDraft((prev) => ({
                    ...prev,
                    analytics: { ...prev.analytics, enabled },
                  }))
                }
              />
              <div className="grid items-stretch gap-4 sm:grid-cols-3">
                <NumberField
                  id="tokens-per-credit"
                  label={copy.fields.tokensPerCredit}
                  hint={copy.fields.tokensPerCreditHint}
                  value={draft.analytics.tokensPerCredit}
                  min={100}
                  max={100_000}
                  disabled={!canEdit}
                  onChange={(tokensPerCredit) =>
                    setDraft((prev) => ({
                      ...prev,
                      analytics: { ...prev.analytics, tokensPerCredit },
                    }))
                  }
                />
                <NumberField
                  id="low-balance"
                  label={copy.fields.lowBalanceThreshold}
                  hint={copy.fields.lowBalanceThresholdHint}
                  value={draft.analytics.lowBalanceThreshold}
                  min={0}
                  max={10_000}
                  disabled={!canEdit}
                  onChange={(lowBalanceThreshold) =>
                    setDraft((prev) => ({
                      ...prev,
                      analytics: { ...prev.analytics, lowBalanceThreshold },
                    }))
                  }
                />
                <NumberField
                  id="welcome-credits"
                  label={copy.fields.welcomeCreditsForNewAdmins}
                  hint={copy.fields.welcomeCreditsForNewAdminsHint}
                  value={draft.analytics.welcomeCreditsForNewAdmins}
                  min={0}
                  max={100_000}
                  disabled={!canEdit}
                  onChange={(welcomeCreditsForNewAdmins) =>
                    setDraft((prev) => ({
                      ...prev,
                      analytics: { ...prev.analytics, welcomeCreditsForNewAdmins },
                    }))
                  }
                />
              </div>
            </ConfigSection>
          ) : null}

          {scope === "onboarding" ? (
            <ConfigSection
              canEdit={canEdit}
              saving={updateMutation.isPending}
              saveLabel={copy.save}
              onSave={() => void saveSection("onboarding")}
            >
              <div className="grid items-stretch gap-4 sm:grid-cols-2">
                <NumberField
                  id="default-expiry"
                  label={copy.fields.defaultDataExpiryMonths}
                  hint={copy.fields.defaultDataExpiryMonthsHint}
                  value={draft.onboarding.defaultDataExpiryMonths}
                  min={1}
                  max={120}
                  disabled={!canEdit}
                  onChange={(defaultDataExpiryMonths) =>
                    setDraft((prev) => ({
                      ...prev,
                      onboarding: { ...prev.onboarding, defaultDataExpiryMonths },
                    }))
                  }
                />
                <NumberField
                  id="default-renewal"
                  label={copy.fields.defaultRenewalMonths}
                  hint={copy.fields.defaultRenewalMonthsHint}
                  value={draft.onboarding.defaultRenewalMonths}
                  min={1}
                  max={120}
                  disabled={!canEdit}
                  onChange={(defaultRenewalMonths) =>
                    setDraft((prev) => ({
                      ...prev,
                      onboarding: { ...prev.onboarding, defaultRenewalMonths },
                    }))
                  }
                />
              </div>
            </ConfigSection>
          ) : null}

          {scope === "categories" ? (
            <div className="space-y-4 p-4 sm:p-5">
              {canEdit ? (
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Input
                    value={newCategory}
                    placeholder={copy.categories.namePlaceholder}
                    disabled={createCategoryMutation.isPending}
                    onChange={(event) => setNewCategory(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") void handleAddCategory();
                    }}
                  />
                  <Button
                    type="button"
                    className="shrink-0"
                    disabled={createCategoryMutation.isPending || !newCategory.trim()}
                    onClick={() => void handleAddCategory()}
                  >
                    {createCategoryMutation.isPending ? (
                      <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
                    ) : (
                      <Plus className="mr-2 size-4" aria-hidden />
                    )}
                    {copy.categories.addButton}
                  </Button>
                </div>
              ) : null}

              {categoriesLoading ? (
                <p className="text-sm text-text-secondary">{copy.categories.loading}</p>
              ) : categories.length === 0 ? (
                <p className="text-sm text-text-secondary">{copy.categories.empty}</p>
              ) : (
                <div className="space-y-6">
                  {(() => {
                    const visibleCategories = categories.filter((c) => !c.hiddenFromPicker);
                    const hiddenCategories = categories.filter((c) => c.hiddenFromPicker);
                    const builtinCategories = visibleCategories.filter((category) => category.isBuiltin);
                    const customCategories = visibleCategories.filter((category) => !category.isBuiltin);

                    function renderCategoryList(
                      items: typeof categories,
                      options?: { showRestore?: boolean },
                    ) {
                      return (
                        <ul className="divide-y divide-border rounded-lg border border-border">
                          {items.map((category) => (
                            <li
                              key={category.name}
                              className="flex items-center justify-between gap-3 px-4 py-3"
                            >
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-text-primary">
                                  {category.label}
                                </p>
                                <p className="text-xs text-text-muted">
                                  {category.isBuiltin ? category.name : copy.categories.customLabel}
                                  {" · "}
                                  {copy.categories.storeCount.replace(
                                    "{count}",
                                    String(category.storeCount),
                                  )}
                                </p>
                              </div>
                              <div className="flex items-center gap-1">
                                {category.isBuiltin ? (
                                  <Badge variant="outline">{copy.categories.builtin}</Badge>
                                ) : null}
                                {canEdit ? (
                                  <>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      aria-label={copy.categories.editButton.replace(
                                        "{name}",
                                        category.label,
                                      )}
                                      onClick={() => setEditingCategory(category)}
                                    >
                                      <Pencil className="size-4" aria-hidden />
                                    </Button>
                                    {options?.showRestore ? (
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        disabled={restoreCategoryMutation.isPending}
                                        onClick={() => void handleRestoreCategory(category.name)}
                                      >
                                        {copy.categories.restoreButton}
                                      </Button>
                                    ) : (
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        aria-label={copy.categories.deleteButton.replace(
                                          "{name}",
                                          category.label,
                                        )}
                                        disabled={deleteCategoryMutation.isPending}
                                        onClick={() => void handleDeleteCategory(category)}
                                      >
                                        <Trash2 className="size-4 text-status-error" aria-hidden />
                                      </Button>
                                    )}
                                  </>
                                ) : null}
                              </div>
                            </li>
                          ))}
                        </ul>
                      );
                    }

                    return (
                      <>
                        <section className="space-y-3">
                          <h3 className="text-sm font-semibold text-text-primary">
                            {copy.categories.builtinSection}
                          </h3>
                          {renderCategoryList(builtinCategories)}
                        </section>

                        <section className="space-y-3">
                          <h3 className="text-sm font-semibold text-text-primary">
                            {copy.categories.customSection}
                          </h3>
                          {customCategories.length === 0 ? (
                            <p className="text-sm text-text-secondary">
                              {copy.categories.noCustomCategories}
                            </p>
                          ) : (
                            renderCategoryList(customCategories)
                          )}
                        </section>

                        {hiddenCategories.length > 0 ? (
                          <section className="space-y-3">
                            <h3 className="text-sm font-semibold text-text-primary">
                              {copy.categories.hiddenSection}
                            </h3>
                            {renderCategoryList(hiddenCategories, { showRestore: true })}
                          </section>
                        ) : null}
                      </>
                    );
                  })()}
                </div>
              )}

              {isError ? (
                <Button type="button" variant="outline" onClick={() => void refetchCategories()}>
                  {copy.retry}
                </Button>
              ) : null}
            </div>
          ) : null}

          {scope === "integrations" ? (
            <div className="p-4 sm:p-5">
              <p className="mb-4 text-sm text-text-secondary">{copy.integrations.description}</p>
              {data?.meta.integrations ? (
                <>
                  <IntegrationRow
                    label={copy.integrations.smtp}
                    configured={data.meta.integrations.smtp.configured}
                    detail={data.meta.integrations.smtp.host ?? undefined}
                    configuredLabel={copy.integrations.configured}
                    notConfiguredLabel={copy.integrations.notConfigured}
                  />
                  <IntegrationRow
                    label={copy.integrations.redis}
                    configured={data.meta.integrations.redis.configured}
                    configuredLabel={copy.integrations.configured}
                    notConfiguredLabel={copy.integrations.notConfigured}
                  />
                  <IntegrationRow
                    label={copy.integrations.gemini}
                    configured={data.meta.integrations.gemini.configured}
                    configuredLabel={copy.integrations.configured}
                    notConfiguredLabel={copy.integrations.notConfigured}
                  />
                  <IntegrationRow
                    label={copy.integrations.paymentProvider}
                    configured={data.meta.integrations.paymentProvider.configured}
                    detail={data.meta.integrations.paymentProvider.provider}
                    configuredLabel={copy.integrations.configured}
                    notConfiguredLabel={copy.integrations.notConfigured}
                  />
                  <IntegrationRow
                    label={copy.integrations.cron}
                    configured={data.meta.integrations.cron.secretConfigured}
                    configuredLabel={copy.integrations.configured}
                    notConfiguredLabel={copy.integrations.notConfigured}
                  />
                  <IntegrationRow
                    label={copy.integrations.database}
                    configured={data.meta.integrations.database.connected}
                    configuredLabel={copy.integrations.configured}
                    notConfiguredLabel={copy.integrations.notConfigured}
                  />
                </>
              ) : (
                <p className="text-sm text-text-secondary">{copy.loading}</p>
              )}
            </div>
          ) : null}

          {!canEdit && scope !== "integrations" && scope !== "categories" ? (
            <p className="border-t border-border px-4 py-3 text-xs text-text-muted sm:px-5">
              {copy.readOnlyHint}
            </p>
          ) : null}
        </div>
      </div>

      <StoreCategoryEditDialog
        copy={copy.categories}
        category={editingCategory}
        open={editingCategory !== null}
        saving={updateCategoryMutation.isPending}
        deleting={deleteCategoryMutation.isPending}
        onOpenChange={(open) => {
          if (!open) setEditingCategory(null);
        }}
        onSave={(input) => void handleSaveCategoryEdit(input)}
        onDelete={(category) => void handleDeleteCategory(category)}
      />
    </div>
  );
}
