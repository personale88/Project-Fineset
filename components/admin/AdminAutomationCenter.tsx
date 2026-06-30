"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Play, Zap } from "lucide-react";
import {
  AutomationResultsHeader,
  AutomationSidePanel,
  AUTOMATION_SCOPE_PANEL_ID,
  scopeMeta,
  type AutomationScope,
} from "@/components/admin/automation/AutomationSidePanel";
import { AutomationHistoryPanel } from "@/components/admin/automation/AutomationHistoryPanel";
import { AutomationDryRunModeBanner } from "@/components/admin/automation/AutomationDryRunModeBanner";
import { AutomationRunNowConfirmDialog } from "@/components/admin/automation/AutomationRunNowConfirmDialog";
import { AutomationTimezoneDriftBanner } from "@/components/admin/automation/AutomationTimezoneDriftBanner";
import { AutomationCenterLoadingShell } from "@/components/admin/automation/AutomationCenterLoadingShell";
import { AutomationCenterErrorShell } from "@/components/admin/automation/AutomationCenterErrorShell";
import { AdminLoadErrorBanner } from "@/components/admin/AdminLoadErrorBanner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  useAutomationConfig,
  useAutomationRunHistory,
  useRunBillingAutomation,
  useUpdateAutomationConfig,
  AUTOMATION_CONFIG_QUERY_KEY,
} from "@/hooks/useAutomation";
import { usePlatformSettings } from "@/hooks/usePlatformSettings";
import { usePlatformSettingsOptional } from "@/components/admin/PlatformSettingsProvider";
import { useAdminPortal } from "@/components/admin/AdminPortalContext";
import { AdminReadOnlyBanner } from "@/components/admin/AdminReadOnlyBanner";
import { canManageAutomationSettings } from "@/lib/auth/admin-portal-access";
import {
  automationScopeHref,
  parseAutomationScope,
} from "@/lib/utils/automation-scope-url";
import {
  isUnauthorizedApiError,
  redirectToSignInAfterUnauthorized,
} from "@/lib/auth/client-session-guard";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/useToast";
import {
  AUTOMATION_TIME_FORMAT_MESSAGE,
  isValidTimeInput,
  normalizeTimeInput,
} from "@/lib/utils/time-input";
import {
  AUTOMATION_COUNTRY_CODE_MESSAGE,
  isValidAutomationCountryCode,
  normalizeAutomationCountryCode,
} from "@/lib/automation/country-code";
import {
  AUTOMATION_CENTER_CONTENT_CARD_CLASS,
  AUTOMATION_CENTER_CONTENT_SCROLL_CLASS,
  AUTOMATION_CENTER_ROOT_CLASS,
  AUTOMATION_MOBILE_ACTION_ROW_CLASS,
  AUTOMATION_MOBILE_FULL_WIDTH_BUTTON_CLASS,
} from "@/lib/automation/automation-center-layout";
import { DEFAULT_PLATFORM_AUTOMATION_CONFIG } from "@/lib/automation/default-config";
import {
  AUTOMATION_DAYS_LIST_MAX_DAY,
  AUTOMATION_DAYS_LIST_MAX_ITEMS,
  type AutomationDaysListConstraints,
  formatAutomationDaysList,
  parseAutomationDaysList,
  sanitizeAutomationConfigSection,
} from "@/lib/automation/days-list";
import { automationConfigPatchSchema, type AutomationConfigPatchInput } from "@/lib/automation/config-schema";
import {
  mapAutomationSectionFieldErrorsFromIssues,
  resolveAutomationConfigSaveValidationErrors,
} from "@/lib/automation/config-field-errors";
import {
  isAutomationConfigLoadFailure,
  shouldPersistAutomationConfigLoadFailure,
} from "@/lib/automation/config-load-failure";
import {
  serializeAutomationConfig,
  shouldApplyAutomationConfigSync,
  shouldKeepAuthoritativeAutomationConfig,
} from "@/lib/automation/draft-sync";
import {
  isBrowserOffline,
  resolveAutomationActionError,
} from "@/lib/automation/action-offline";
import {
  formatAutomationRunToastDescription,
  isAutomationDryRunForced,
  resolveAutomationRunToastTitle,
} from "@/lib/automation/run-summary";
import { isAutomationLiveRunAllowedInUi } from "@/lib/automation/run-request";
import { flattenAutomationRunPages } from "@/lib/automation/runs-query";
import {
  formatAutomationTimezoneDriftMessage,
  formatAutomationTimezoneHint,
  hasAutomationTimezoneDrift,
  resolvePlatformDefaultTimezone,
} from "@/lib/automation/timezone-sync";
import type { PlatformAutomationConfig } from "@/lib/automation/types";
import { ApiError } from "@/types";
import type { Content } from "@/content/en";

type AdminContent = Content["admin"];

interface AdminAutomationCenterProps {
  admin: AdminContent;
}

const AUTOMATION_FIELD_HINT_CLASS = "min-h-10 text-xs leading-5 text-text-muted";

function AutomationFieldHint({ hint }: { hint?: string }) {
  return <p className={AUTOMATION_FIELD_HINT_CLASS}>{hint ?? "\u00A0"}</p>;
}

const MAX_REMINDERS_PER_CYCLE = 20;

function formatAutomationNumberRangeError(
  copy: AdminContent["automation"],
  min: number,
  max: number,
): string {
  return copy.validation.numberRange
    .replace("{min}", String(min))
    .replace("{max}", String(max));
}

function automationNumberRangeError(
  value: number,
  min: number,
  max: number,
  message: string,
): string | undefined {
  if (!Number.isFinite(value) || value < min || value > max) {
    return message;
  }
  return undefined;
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
    <div className="flex items-start justify-between gap-3 border-b border-border py-4 last:border-0 sm:gap-4">
      <div className="min-w-0 flex-1">
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
        aria-readonly={disabled || undefined}
        className={cn("shrink-0", disabled ? "opacity-60" : undefined)}
      />
    </div>
  );
}

const READ_ONLY_FIELD_CLASS =
  "cursor-not-allowed bg-surface-secondary/50 text-text-secondary opacity-80";

function clampAutomationNumber(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function parseAutomationNumberInput(raw: string, min: number, max: number): number {
  if (raw === "") return min;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed)) return min;
  return clampAutomationNumber(parsed, min, max);
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
  error,
}: {
  id: string;
  label: string;
  hint?: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  error?: string;
}) {
  const [inputValue, setInputValue] = useState(String(value));
  const [prevValue, setPrevValue] = useState(value);
  if (value !== prevValue) {
    setPrevValue(value);
    setInputValue(String(value));
  }

  return (
    <div className="flex h-full flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      <AutomationFieldHint hint={hint} />
      <Input
        id={id}
        type="number"
        min={min}
        max={max}
        step={1}
        value={inputValue}
        disabled={disabled}
        readOnly={disabled}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        aria-readonly={disabled || undefined}
        className={cn(
          disabled ? READ_ONLY_FIELD_CLASS : undefined,
          error ? "border-status-error focus-visible:ring-status-error/30" : undefined,
        )}
        onChange={(event) => {
          const raw = event.target.value;
          setInputValue(raw);

          if (raw === "") {
            setInputValue(String(min));
            onChange(min);
            return;
          }

          const parsed = Number.parseInt(raw, 10);
          if (!Number.isFinite(parsed)) {
            setInputValue(String(min));
            onChange(min);
            return;
          }

          const clamped = clampAutomationNumber(parsed, min, max);
          onChange(clamped);
          if (clamped !== parsed) {
            setInputValue(String(clamped));
          }
        }}
        onBlur={() => {
          const clamped = parseAutomationNumberInput(inputValue, min, max);
          setInputValue(String(clamped));
          onChange(clamped);
        }}
      />
      {error ? (
        <p id={`${id}-error`} className="text-sm text-status-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function automationCountryCodeFieldError(value: string, message: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed || isValidAutomationCountryCode(trimmed)) return undefined;
  if (normalizeAutomationCountryCode(trimmed) !== null) return undefined;
  return message;
}

function CountryCodeField({
  id,
  label,
  hint,
  value,
  onChange,
  disabled,
  error,
  invalidFormatMessage = AUTOMATION_COUNTRY_CODE_MESSAGE,
}: {
  id: string;
  label: string;
  hint?: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  error?: string;
  invalidFormatMessage?: string;
}) {
  const [inputValue, setInputValue] = useState(value);
  const [localError, setLocalError] = useState<string | undefined>();
  const [prevValue, setPrevValue] = useState(value);
  if (value !== prevValue) {
    setPrevValue(value);
    setInputValue(value);
    setLocalError(undefined);
  }

  const displayError = error ?? localError;

  const commitInput = useCallback(
    (raw: string) => {
      const normalized = normalizeAutomationCountryCode(raw);
      if (normalized === null) {
        if (raw.trim()) {
          setLocalError(invalidFormatMessage);
        }
        return;
      }

      setLocalError(undefined);
      setInputValue(normalized);
      onChange(normalized);
    },
    [invalidFormatMessage, onChange],
  );

  return (
    <div className="flex h-full flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      <AutomationFieldHint hint={hint} />
      <Input
        id={id}
        inputMode="numeric"
        placeholder="91"
        value={inputValue}
        disabled={disabled}
        readOnly={disabled}
        aria-invalid={displayError ? true : undefined}
        aria-describedby={displayError ? `${id}-error` : undefined}
        aria-readonly={disabled || undefined}
        className={cn(
          disabled ? READ_ONLY_FIELD_CLASS : undefined,
          displayError ? "border-status-error focus-visible:ring-status-error/30" : undefined,
        )}
        onChange={(event) => {
          const raw = event.target.value;
          setInputValue(raw);
          if (localError) setLocalError(undefined);
          onChange(raw);
        }}
        onBlur={(event) => {
          commitInput(event.target.value);
        }}
      />
      {displayError ? (
        <p id={`${id}-error`} className="text-sm text-status-error" role="alert">
          {displayError}
        </p>
      ) : null}
    </div>
  );
}

function automationTimeFieldError(value: string, message: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed || isValidTimeInput(trimmed) || normalizeTimeInput(trimmed) !== null) {
    return undefined;
  }
  return message;
}

function TimeField({
  id,
  label,
  hint,
  value,
  onChange,
  disabled,
  error,
  invalidFormatMessage = AUTOMATION_TIME_FORMAT_MESSAGE,
}: {
  id: string;
  label: string;
  hint?: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  error?: string;
  invalidFormatMessage?: string;
}) {
  const [inputValue, setInputValue] = useState(value);
  const [localError, setLocalError] = useState<string | undefined>();
  const [prevValue, setPrevValue] = useState(value);
  if (value !== prevValue) {
    setPrevValue(value);
    setInputValue(value);
    setLocalError(undefined);
  }

  const displayError = error ?? localError;

  const commitInput = useCallback(
    (raw: string) => {
      const normalized = normalizeTimeInput(raw);
      if (normalized === null) {
        if (raw.trim()) {
          setLocalError(invalidFormatMessage);
        }
        return;
      }

      setLocalError(undefined);
      setInputValue(normalized);
      onChange(normalized);
    },
    [invalidFormatMessage, onChange],
  );

  return (
    <div className="flex h-full flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      <AutomationFieldHint hint={hint} />
      <Input
        id={id}
        inputMode="numeric"
        placeholder="09:00"
        value={inputValue}
        disabled={disabled}
        readOnly={disabled}
        aria-invalid={displayError ? true : undefined}
        aria-describedby={displayError ? `${id}-error` : undefined}
        aria-readonly={disabled || undefined}
        className={cn(
          disabled ? READ_ONLY_FIELD_CLASS : undefined,
          displayError ? "border-status-error focus-visible:ring-status-error/30" : undefined,
        )}
        onChange={(event) => {
          const raw = event.target.value;
          setInputValue(raw);
          if (localError) setLocalError(undefined);
          onChange(raw);
        }}
        onBlur={(event) => {
          commitInput(event.target.value);
        }}
      />
      {displayError ? (
        <p id={`${id}-error`} className="text-sm text-status-error" role="alert">
          {displayError}
        </p>
      ) : null}
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
  error,
}: {
  id: string;
  label: string;
  hint?: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  error?: string;
}) {
  return (
    <div className="flex h-full flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      <AutomationFieldHint hint={hint} />
      <Input
        id={id}
        value={value}
        disabled={disabled}
        readOnly={disabled}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        aria-readonly={disabled || undefined}
        className={cn(
          disabled ? READ_ONLY_FIELD_CLASS : undefined,
          error ? "border-status-error focus-visible:ring-status-error/30" : undefined,
        )}
        onChange={(event) => onChange(event.target.value)}
      />
      {error ? (
        <p id={`${id}-error`} className="text-sm text-status-error" role="alert">
          {error}
        </p>
      ) : null}
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
  error,
  min = 0,
  max = AUTOMATION_DAYS_LIST_MAX_DAY,
  maxItems = AUTOMATION_DAYS_LIST_MAX_ITEMS,
}: {
  id: string;
  label: string;
  hint?: string;
  value: number[];
  onChange: (value: number[]) => void;
  disabled?: boolean;
  error?: string;
  min?: number;
  max?: number;
  maxItems?: number;
}) {
  const constraints: AutomationDaysListConstraints = { min, max, maxItems };
  const [inputValue, setInputValue] = useState(() =>
    formatAutomationDaysList(value, constraints),
  );
  const [prevSync, setPrevSync] = useState({ value, min, max, maxItems });
  if (
    value !== prevSync.value ||
    min !== prevSync.min ||
    max !== prevSync.max ||
    maxItems !== prevSync.maxItems
  ) {
    setPrevSync({ value, min, max, maxItems });
    setInputValue(formatAutomationDaysList(value, constraints));
  }

  const commitInput = useCallback(
    (raw: string) => {
      const parsed = parseAutomationDaysList(raw, { min, max, maxItems });
      const formatted = formatAutomationDaysList(parsed, { min, max, maxItems });
      setInputValue(formatted);
      onChange(parsed);
    },
    [max, maxItems, min, onChange],
  );

  return (
    <div className="flex h-full flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      <AutomationFieldHint hint={hint} />
      <Input
        id={id}
        disabled={disabled}
        readOnly={disabled}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        aria-readonly={disabled || undefined}
        className={cn(
          disabled ? READ_ONLY_FIELD_CLASS : undefined,
          error ? "border-status-error focus-visible:ring-status-error/30" : undefined,
        )}
        value={inputValue}
        placeholder="3, 1, 7"
        onChange={(event) => {
          const raw = event.target.value;
          setInputValue(raw);
          onChange(parseAutomationDaysList(raw, { min, max, maxItems }));
        }}
        onBlur={(event) => {
          commitInput(event.target.value);
        }}
      />
      {error ? (
        <p id={`${id}-error`} className="text-sm text-status-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function ConfigSection({
  children,
  onSave,
  saving,
  saveLabel,
  canEdit,
  readOnlyHint,
}: {
  children: React.ReactNode;
  onSave: () => void;
  saving: boolean;
  saveLabel: string;
  canEdit: boolean;
  readOnlyHint?: string;
}) {
  return (
    <div className="space-y-6 p-4 sm:p-5">
      <fieldset disabled={!canEdit} className={cn("min-w-0 space-y-6 border-0 p-0", !canEdit && "opacity-95")}>
        {children}
      </fieldset>
      {canEdit ? (
        <div className="flex flex-col gap-2 border-t border-border pt-4 sm:flex-row sm:justify-end">
          <Button
            type="button"
            onClick={onSave}
            disabled={saving}
            data-testid="automation-save"
            className={AUTOMATION_MOBILE_FULL_WIDTH_BUTTON_CLASS}
          >
            {saving ? <Loader2 className="mr-2 size-4 animate-spin" aria-hidden /> : null}
            {saveLabel}
          </Button>
        </div>
      ) : readOnlyHint ? (
        <p
          className="border-t border-border pt-4 text-xs text-text-muted"
          data-testid="automation-section-read-only-hint"
        >
          {readOnlyHint}
        </p>
      ) : null}
    </div>
  );
}

function formatAutomationSaveError(error: unknown, offlineMessage: string): string | undefined {
  return resolveAutomationActionError(error, offlineMessage);
}

function showAutomationOfflineToast(
  copy: AdminContent["automation"],
  kind: "save" | "run",
) {
  toast({
    title: kind === "save" ? copy.saveFailed : copy.runFailed,
    description: copy.offlineHint,
  });
}

export function AdminAutomationCenter({ admin }: AdminAutomationCenterProps) {
  const copy = admin.automation;
  const { role } = useAdminPortal();
  const canEdit = canManageAutomationSettings(role);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const scope = parseAutomationScope(searchParams.get("scope"));

  const setScope = useCallback(
    (value: AutomationScope) => {
      const currentFromUrl = parseAutomationScope(searchParams.get("scope"));
      if (value === currentFromUrl) return;
      router.push(automationScopeHref(pathname, searchParams, value), { scroll: false });
    },
    [pathname, router, searchParams],
  );
  const [draft, setDraft] = useState<PlatformAutomationConfig>(
    DEFAULT_PLATFORM_AUTOMATION_CONFIG,
  );
  const [sectionFieldErrors, setSectionFieldErrors] = useState<
    Partial<Record<keyof PlatformAutomationConfig, Record<string, string>>>
  >({});

  const clearSectionFieldError = useCallback(
    (section: keyof PlatformAutomationConfig, field: string) => {
      setSectionFieldErrors((current) => {
        const sectionErrors = current[section];
        if (!sectionErrors?.[field]) return current;
        const nextSectionErrors = { ...sectionErrors };
        delete nextSectionErrors[field];
        return { ...current, [section]: nextSectionErrors };
      });
    },
    [],
  );

  const queryClient = useQueryClient();
  const platformSettingsQuery = usePlatformSettings();
  const platformSettingsContext = usePlatformSettingsOptional();
  const platformTimezone = resolvePlatformDefaultTimezone(
    platformSettingsQuery.data?.settings.general.defaultTimezone ??
      platformSettingsContext?.settings.general.defaultTimezone,
  );
  const automationTimezone = draft.global.timezone;
  const timezoneDrift = hasAutomationTimezoneDrift(automationTimezone, platformTimezone);
  const timezoneFieldHint = timezoneDrift
    ? formatAutomationTimezoneHint(copy.fields.timezoneHint, platformTimezone)
    : copy.fields.timezoneSyncedHint;
  const {
    data,
    isPending,
    isFetching,
    isRefetching,
    isRefetchError,
    error,
    status,
    refetch: refetchConfig,
  } = useAutomationConfig();
  const updateMutation = useUpdateAutomationConfig();
  const runMutation = useRunBillingAutomation();
  const historyQueryEnabled = scope === "history";
  const {
    data: historyData,
    status: historyStatus,
    isPending: historyPending,
    isFetching: historyFetching,
    isFetchingNextPage: historyFetchingNextPage,
    fetchNextPage: fetchNextHistoryPage,
    hasNextPage: historyHasNextPage,
    error: runsError,
    refetch: refetchRuns,
  } = useAutomationRunHistory({ enabled: historyQueryEnabled });
  const historyUnauthorized = isUnauthorizedApiError(runsError);
  const historyRuns = historyData ? flattenAutomationRunPages(historyData.pages) : undefined;
  const historyTotal = historyData?.pages[0]?.total ?? 0;
  const historyLoadFailed =
    historyStatus === "error" &&
    !historyUnauthorized &&
    (historyRuns === undefined || historyRuns.length === 0);
  const [historyLoadMoreFailed, setHistoryLoadMoreFailed] = useState(false);
  const historyLoading =
    historyQueryEnabled &&
    !historyLoadFailed &&
    historyRuns === undefined &&
    (historyPending || (historyFetching && !historyFetchingNextPage));
  const historyEmpty =
    historyQueryEnabled &&
    !historyLoadFailed &&
    historyRuns !== undefined &&
    historyRuns.length === 0;

  const lastSyncedConfigRef = useRef<string | null>(null);
  const [lastSavedConfig, setLastSavedConfig] = useState<PlatformAutomationConfig | null>(null);
  const userEditedDraftRef = useRef(false);
  const saveActionRef = useRef(false);
  const runActionRef = useRef(false);
  const [saveActionLocked, setSaveActionLocked] = useState(false);
  const [runActionLocked, setRunActionLocked] = useState(false);
  const [runNowConfirmOpen, setRunNowConfirmOpen] = useState(false);
  const [configLoadFailureSticky, setConfigLoadFailureSticky] = useState(false);
  const configSaveInFlight = updateMutation.isPending || saveActionLocked;
  const runInFlight = runMutation.isPending || runActionLocked;

  useEffect(() => {
    const authError = [error, runsError].find(isUnauthorizedApiError);
    if (!authError) return;

    redirectToSignInAfterUnauthorized(
      `${window.location.pathname}${window.location.search}`,
    );
  }, [error, runsError]);

  useEffect(() => {
    if (!data || configSaveInFlight) return;

    const authoritative = lastSavedConfig;
    if (authoritative) {
      const authoritativeSnapshot = serializeAutomationConfig(authoritative);
      const draftSnapshot = serializeAutomationConfig(draft);

      if (draftSnapshot === authoritativeSnapshot && shouldKeepAuthoritativeAutomationConfig({
          incoming: data,
          current: draft,
          authoritative,
        })
      ) {
        if (
          !configLoadFailureSticky &&
          !isAutomationConfigLoadFailure({
            error,
            status,
            isRefetchError,
          })
        ) {
          queryClient.setQueryData(AUTOMATION_CONFIG_QUERY_KEY, authoritative);
        }
        return;
      }
    }

    setDraft((current) => {
      const decision = shouldApplyAutomationConfigSync({
        incoming: data,
        current,
        lastSyncedSnapshot: lastSyncedConfigRef.current,
        userHasEditedDraft: userEditedDraftRef.current,
      });

      if (!decision.apply) {
        return current;
      }

      lastSyncedConfigRef.current = decision.snapshot;
      userEditedDraftRef.current = false;
      return data;
    });
  }, [data, draft, queryClient, configSaveInFlight, configLoadFailureSticky, error, status, isRefetchError, lastSavedConfig]);

  if (lastSavedConfig) {
    const draftSnapshot = serializeAutomationConfig(draft);
    const authoritativeSnapshot = serializeAutomationConfig(lastSavedConfig);
    if (draftSnapshot !== authoritativeSnapshot) {
      setLastSavedConfig(null);
    }
  }

  const [historyScope, setHistoryScope] = useState(scope);
  if (scope !== historyScope) {
    setHistoryScope(scope);
    if (scope !== "history") {
      setHistoryLoadMoreFailed(false);
    }
  }

  const handleLoadMoreHistory = useCallback(async () => {
    setHistoryLoadMoreFailed(false);
    const result = await fetchNextHistoryPage();
    if (result.isError) {
      setHistoryLoadMoreFailed(true);
    }
  }, [fetchNextHistoryPage]);

  const { title, description } = scopeMeta(copy, scope);
  const persistedConfig = lastSavedConfig ?? data;
  const liveRunAllowed = isAutomationLiveRunAllowedInUi(draft, persistedConfig);
  const dryRunModeActive = persistedConfig?.global.dryRunMode === true;
  const whatsAppQueueOnly =
    platformSettingsQuery.data?.meta.integrations.whatsapp.mode === "deep_links";

  const awaitingAuthRedirect =
    isUnauthorizedApiError(error) || isUnauthorizedApiError(runsError);
  const configLoadFailedLive = isAutomationConfigLoadFailure({
    error,
    status,
    isRefetchError,
  });
  if (
    configLoadFailedLive &&
    !isUnauthorizedApiError(error) &&
    !configLoadFailureSticky
  ) {
    setConfigLoadFailureSticky(true);
  }
  const configLoadFailed = shouldPersistAutomationConfigLoadFailure({
    liveFailure: configLoadFailedLive,
    stickyFailure: configLoadFailureSticky,
  });
  const showInitialLoading =
    !data && !configLoadFailed && !awaitingAuthRedirect && (isPending || isFetching);

  const handleConfigRetry = useCallback(async () => {
    try {
      const result = await refetchConfig();
      if (result.data && !result.error) {
        setConfigLoadFailureSticky(false);
      }
    } catch {
      setConfigLoadFailureSticky(true);
    }
  }, [refetchConfig]);

  async function saveSection(
    section: keyof PlatformAutomationConfig,
    override?: PlatformAutomationConfig[keyof PlatformAutomationConfig],
  ) {
    if (!canEdit || saveActionRef.current) return;

    if (isBrowserOffline()) {
      showAutomationOfflineToast(copy, "save");
      return;
    }

    saveActionRef.current = true;
    setSaveActionLocked(true);

    try {
      const sectionDraft = sanitizeAutomationConfigSection(
        section,
        override ?? draft[section],
      );
      if (JSON.stringify(sectionDraft) !== JSON.stringify(draft[section])) {
        setDraft((prev) => ({ ...prev, [section]: sectionDraft }));
      }

      const patch = { [section]: sectionDraft } as AutomationConfigPatchInput;
      const parsed = automationConfigPatchSchema.safeParse(patch);
      if (!parsed.success) {
        setSectionFieldErrors((current) => ({
          ...current,
          [section]: mapAutomationSectionFieldErrorsFromIssues(section, parsed.error),
        }));
        return;
      }

      setSectionFieldErrors((current) => ({ ...current, [section]: {} }));

      const saved = await updateMutation.mutateAsync({ [section]: sectionDraft });
      lastSyncedConfigRef.current = serializeAutomationConfig(saved);
      setLastSavedConfig(saved);
      userEditedDraftRef.current = false;
      setDraft(saved);
      queryClient.setQueryData(AUTOMATION_CONFIG_QUERY_KEY, saved);
      setConfigLoadFailureSticky(false);
      toast({ title: copy.saveSuccess });
    } catch (error) {
      if (error instanceof ApiError && error.status === 400) {
        const { fieldErrors, message } = resolveAutomationConfigSaveValidationErrors(
          section,
          error.body.details,
        );
        if (Object.keys(fieldErrors).length > 0) {
          setSectionFieldErrors((current) => ({ ...current, [section]: fieldErrors }));
          return;
        }
        if (message) {
          toast({ title: copy.saveFailed, description: message });
          return;
        }
      }

      const description = formatAutomationSaveError(error, copy.offlineHint);
      toast({
        title: copy.saveFailed,
        ...(description ? { description } : {}),
      });
    } finally {
      saveActionRef.current = false;
      setSaveActionLocked(false);
    }
  }

  async function handleRun(dryRun: boolean) {
    if (!canEdit) return;

    if (!dryRun && !liveRunAllowed) {
      toast({
        title: copy.runFailed,
        description: copy.runDisabledHint,
      });
      return;
    }

    if (runActionRef.current) return;

    if (isBrowserOffline()) {
      showAutomationOfflineToast(copy, "run");
      if (!dryRun) {
        setRunNowConfirmOpen(false);
      }
      return;
    }

    runActionRef.current = true;
    setRunActionLocked(true);

    try {
      const run = await runMutation.mutateAsync({ dryRun });
      const dryRunForced = isAutomationDryRunForced(dryRun, run);
      const whatsAppQueued = run.summary.whatsAppQueued > 0;
      toast({
        title: resolveAutomationRunToastTitle(copy, run, dryRun),
        description: formatAutomationRunToastDescription(copy.runSummary, run, {
          ...(dryRunForced ? { dryRunForcedHint: copy.runDryRunForcedHint } : {}),
          ...(whatsAppQueued ? { whatsAppQueuedHint: copy.runWhatsAppQueuedHint } : {}),
        }),
      });
    } catch (error) {
      const description = resolveAutomationActionError(error, copy.offlineHint);
      toast({
        title: copy.runFailed,
        ...(description ? { description } : {}),
      });
    } finally {
      runActionRef.current = false;
      setRunActionLocked(false);
      if (!dryRun) {
        setRunNowConfirmOpen(false);
      }
    }
  }

  function handleRunNowClick() {
    if (!canEdit || !liveRunAllowed) {
      toast({
        title: copy.runFailed,
        description: copy.runDisabledHint,
      });
      return;
    }

    if (isBrowserOffline()) {
      showAutomationOfflineToast(copy, "run");
      return;
    }

    setRunNowConfirmOpen(true);
  }

  function handleRunNowConfirmOpenChange(open: boolean) {
    if (!open && runInFlight) return;
    setRunNowConfirmOpen(open);
  }

  if (awaitingAuthRedirect) {
    return (
      <AutomationCenterLoadingShell
        admin={admin}
        loadingLabel={copy.loading}
        canEdit={canEdit}
        readOnlyHint={copy.readOnlyHint}
      />
    );
  }

  if (showInitialLoading) {
    return (
      <AutomationCenterLoadingShell
        admin={admin}
        loadingLabel={copy.loading}
        canEdit={canEdit}
        readOnlyHint={copy.readOnlyHint}
      />
    );
  }

  if (!data && configLoadFailed) {
    return (
      <AutomationCenterErrorShell
        admin={admin}
        message={copy.loadFailed}
        retryLabel={copy.retry}
        retryDisabled={isRefetching}
        onRetry={() => void handleConfigRetry()}
      />
    );
  }

  if (!data) {
    return (
      <AutomationCenterLoadingShell
        admin={admin}
        loadingLabel={copy.loading}
        canEdit={canEdit}
        readOnlyHint={copy.readOnlyHint}
      />
    );
  }

  return (
    <>
      <AutomationSidePanel
        copy={copy}
        value={scope}
        onChange={setScope}
        canEdit={canEdit}
        readOnlyHint={copy.readOnlyHint}
      />

      <div
        className={AUTOMATION_CENTER_ROOT_CLASS}
        data-testid="automation-center-root"
      >
        {configLoadFailed ? (
          <AdminLoadErrorBanner
            message={copy.loadFailed}
            retryLabel={copy.retry}
            retryDisabled={isRefetching}
            onRetry={() => void handleConfigRetry()}
            data-testid="automation-config-error-banner"
            className="shrink-0"
          />
        ) : null}

        {!canEdit ? <AdminReadOnlyBanner message={copy.readOnlyHint} className="shrink-0" /> : null}

        <div
          id={AUTOMATION_SCOPE_PANEL_ID}
          role="tabpanel"
          aria-label={title}
          tabIndex={0}
          className={cn(
            AUTOMATION_CENTER_CONTENT_CARD_CLASS,
            !canEdit && "opacity-95",
          )}
          data-testid="automation-center-content"
        >
          <AutomationResultsHeader title={title} description={description} />

          <div
            className={AUTOMATION_CENTER_CONTENT_SCROLL_CLASS}
            data-testid="automation-center-scroll"
          >
          {scope === "overview" ? (
            <ConfigSection
              canEdit={canEdit}
              readOnlyHint={copy.readOnlyHint}
              saving={configSaveInFlight}
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
                onCheckedChange={(enabled) => {
                  userEditedDraftRef.current = true;
                  setDraft((prev) => ({ ...prev, global: { ...prev.global, enabled } }));
                }}
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
                {timezoneDrift ? (
                  <div className="sm:col-span-2">
                    <AutomationTimezoneDriftBanner
                      message={formatAutomationTimezoneDriftMessage(
                        copy.fields.timezoneDriftMessage,
                        automationTimezone,
                        platformTimezone,
                      )}
                      syncLabel={copy.fields.timezoneDriftSync}
                      onSync={() =>
                        void saveSection("global", {
                          ...draft.global,
                          timezone: platformTimezone,
                        })
                      }
                      syncing={configSaveInFlight}
                      canEdit={canEdit}
                    />
                  </div>
                ) : null}
                <TextField
                  id="timezone"
                  label={copy.fields.timezone}
                  hint={timezoneFieldHint}
                  value={draft.global.timezone}
                  disabled={!canEdit}
                  error={sectionFieldErrors.global?.timezone}
                  onChange={(timezone) => {
                    clearSectionFieldError("global", "timezone");
                    setDraft((prev) => ({
                      ...prev,
                      global: { ...prev.global, timezone },
                    }));
                  }}
                />
              </div>

              {canEdit ? (
                <div className="space-y-3 border-t border-border pt-4">
                  {dryRunModeActive ? (
                    <AutomationDryRunModeBanner message={copy.dryRunModeActiveBanner} />
                  ) : null}
                  {whatsAppQueueOnly ? (
                    <AutomationDryRunModeBanner
                      message={copy.whatsAppQueueOnlyBanner}
                      testId="automation-whatsapp-queue-banner"
                    />
                  ) : null}
                  <div className={AUTOMATION_MOBILE_ACTION_ROW_CLASS}>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={runInFlight}
                    data-testid="automation-run-preview"
                    className={AUTOMATION_MOBILE_FULL_WIDTH_BUTTON_CLASS}
                    onClick={() => void handleRun(true)}
                  >
                    {runInFlight ? (
                      <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
                    ) : (
                      <Play className="mr-2 size-4" aria-hidden />
                    )}
                    {copy.runDryRun}
                  </Button>
                  <Button
                    type="button"
                    disabled={runInFlight || !liveRunAllowed}
                    data-testid="automation-run-now"
                    title={!liveRunAllowed ? copy.runDisabledHint : undefined}
                    className={AUTOMATION_MOBILE_FULL_WIDTH_BUTTON_CLASS}
                    onClick={handleRunNowClick}
                  >
                    {runInFlight ? (
                      <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
                    ) : (
                      <Play className="mr-2 size-4" aria-hidden />
                    )}
                    {copy.runNow}
                  </Button>
                  </div>
                </div>
              ) : null}

              <p className="text-xs text-text-muted">{copy.overview.cronHint}</p>
            </ConfigSection>
          ) : null}

          {scope === "billingCycle" ? (
            <ConfigSection
              canEdit={canEdit}
              readOnlyHint={copy.readOnlyHint}
              saving={configSaveInFlight}
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
                  error={sectionFieldErrors.billingCycle?.cycleStartDay}
                  onChange={(cycleStartDay) => {
                    clearSectionFieldError("billingCycle", "cycleStartDay");
                    setDraft((prev) => ({
                      ...prev,
                      billingCycle: { ...prev.billingCycle, cycleStartDay },
                    }));
                  }}
                />
                <NumberField
                  id="payment-due-day"
                  label={copy.fields.paymentDueDay}
                  hint={copy.fields.paymentDueDayHint}
                  value={draft.billingCycle.paymentDueDay}
                  min={1}
                  max={28}
                  disabled={!canEdit}
                  error={sectionFieldErrors.billingCycle?.paymentDueDay}
                  onChange={(paymentDueDay) => {
                    clearSectionFieldError("billingCycle", "paymentDueDay");
                    setDraft((prev) => ({
                      ...prev,
                      billingCycle: { ...prev.billingCycle, paymentDueDay },
                    }));
                  }}
                />
                <NumberField
                  id="grace-period-days"
                  label={copy.fields.gracePeriodDays}
                  hint={copy.fields.gracePeriodDaysHint}
                  value={draft.billingCycle.gracePeriodDays}
                  min={1}
                  max={28}
                  disabled={!canEdit}
                  error={sectionFieldErrors.billingCycle?.gracePeriodDays}
                  onChange={(gracePeriodDays) => {
                    clearSectionFieldError("billingCycle", "gracePeriodDays");
                    setDraft((prev) => ({
                      ...prev,
                      billingCycle: { ...prev.billingCycle, gracePeriodDays },
                    }));
                  }}
                />
              </div>
            </ConfigSection>
          ) : null}

          {scope === "invoices" ? (
            <ConfigSection
              canEdit={canEdit}
              readOnlyHint={copy.readOnlyHint}
              saving={configSaveInFlight}
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
              <ToggleRow
                id="send-on-renewal-due"
                label={copy.fields.sendOnRenewalDue}
                hint={copy.fields.sendOnRenewalDueHint}
                checked={draft.invoices.sendOnRenewalDue}
                disabled={!canEdit}
                onCheckedChange={(sendOnRenewalDue) => {
                  userEditedDraftRef.current = true;
                  setDraft((prev) => ({
                    ...prev,
                    invoices: { ...prev.invoices, sendOnRenewalDue },
                  }));
                }}
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
                  error={sectionFieldErrors.invoices?.sendDayOfMonth}
                  onChange={(sendDayOfMonth) => {
                    clearSectionFieldError("invoices", "sendDayOfMonth");
                    setDraft((prev) => ({
                      ...prev,
                      invoices: { ...prev.invoices, sendDayOfMonth },
                    }));
                  }}
                />
                <NumberField
                  id="days-before-renewal"
                  label={copy.fields.daysBeforeRenewal}
                  hint={copy.fields.daysBeforeRenewalHint}
                  value={draft.invoices.daysBeforeRenewal}
                  min={0}
                  max={30}
                  disabled={!canEdit}
                  error={sectionFieldErrors.invoices?.daysBeforeRenewal}
                  onChange={(daysBeforeRenewal) => {
                    clearSectionFieldError("invoices", "daysBeforeRenewal");
                    setDraft((prev) => ({
                      ...prev,
                      invoices: { ...prev.invoices, daysBeforeRenewal },
                    }));
                  }}
                />
              </div>
            </ConfigSection>
          ) : null}

          {scope === "paymentReminders" ? (
            <ConfigSection
              canEdit={canEdit}
              readOnlyHint={copy.readOnlyHint}
              saving={configSaveInFlight}
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
                error={sectionFieldErrors.paymentReminders?.reminderDaysBeforeDue}
                onChange={(reminderDaysBeforeDue) => {
                  clearSectionFieldError("paymentReminders", "reminderDaysBeforeDue");
                  setDraft((prev) => ({
                    ...prev,
                    paymentReminders: { ...prev.paymentReminders, reminderDaysBeforeDue },
                  }));
                }}
              />
              <DaysListField
                id="reminder-after-due"
                label={copy.fields.reminderDaysAfterDue}
                hint={copy.fields.reminderDaysAfterDueHint}
                value={draft.paymentReminders.reminderDaysAfterDue}
                disabled={!canEdit}
                error={sectionFieldErrors.paymentReminders?.reminderDaysAfterDue}
                onChange={(reminderDaysAfterDue) => {
                  clearSectionFieldError("paymentReminders", "reminderDaysAfterDue");
                  setDraft((prev) => ({
                    ...prev,
                    paymentReminders: { ...prev.paymentReminders, reminderDaysAfterDue },
                  }));
                }}
              />
              <NumberField
                id="max-reminders"
                label={copy.fields.maxRemindersPerCycle}
                value={draft.paymentReminders.maxRemindersPerCycle}
                min={1}
                max={MAX_REMINDERS_PER_CYCLE}
                disabled={!canEdit}
                error={
                  sectionFieldErrors.paymentReminders?.maxRemindersPerCycle ??
                  automationNumberRangeError(
                    draft.paymentReminders.maxRemindersPerCycle,
                    1,
                    MAX_REMINDERS_PER_CYCLE,
                    formatAutomationNumberRangeError(copy, 1, MAX_REMINDERS_PER_CYCLE),
                  )
                }
                onChange={(maxRemindersPerCycle) => {
                  clearSectionFieldError("paymentReminders", "maxRemindersPerCycle");
                  setDraft((prev) => ({
                    ...prev,
                    paymentReminders: { ...prev.paymentReminders, maxRemindersPerCycle },
                  }));
                }}
              />
              <ToggleRow
                id="stop-after-payment"
                label={copy.fields.stopAfterPayment}
                hint={copy.fields.stopAfterPaymentHint}
                checked={draft.paymentReminders.stopAfterPayment}
                disabled={!canEdit}
                onCheckedChange={(stopAfterPayment) =>
                  setDraft((prev) => ({
                    ...prev,
                    paymentReminders: { ...prev.paymentReminders, stopAfterPayment },
                  }))
                }
              />
            </ConfigSection>
          ) : null}

          {scope === "followUps" ? (
            <ConfigSection
              canEdit={canEdit}
              readOnlyHint={copy.readOnlyHint}
              saving={configSaveInFlight}
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
              <ToggleRow
                id="escalate-after-max"
                label={copy.fields.escalateAfterMax}
                hint={copy.fields.escalateAfterMaxHint}
                checked={draft.followUps.escalateAfterMax}
                disabled={!canEdit}
                onCheckedChange={(escalateAfterMax) =>
                  setDraft((prev) => ({
                    ...prev,
                    followUps: { ...prev.followUps, escalateAfterMax },
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
                error={sectionFieldErrors.followUps?.maxFollowUps}
                onChange={(maxFollowUps) => {
                  clearSectionFieldError("followUps", "maxFollowUps");
                  setDraft((prev) => ({
                    ...prev,
                    followUps: { ...prev.followUps, maxFollowUps },
                  }));
                }}
              />
              <DaysListField
                id="follow-up-spacing"
                label={copy.fields.followUpSpacingDays}
                hint={copy.fields.followUpSpacingDaysHint}
                value={draft.followUps.spacingDays}
                min={1}
                max={30}
                maxItems={20}
                disabled={!canEdit}
                error={sectionFieldErrors.followUps?.spacingDays}
                onChange={(spacingDays) => {
                  clearSectionFieldError("followUps", "spacingDays");
                  setDraft((prev) => ({
                    ...prev,
                    followUps: { ...prev.followUps, spacingDays },
                  }));
                }}
              />
              <div className="space-y-2">
                <Label htmlFor="default-channel">{copy.fields.defaultFollowUpChannel}</Label>
                <select
                  id="default-channel"
                  disabled={!canEdit}
                  value={draft.followUps.defaultChannel}
                  aria-invalid={sectionFieldErrors.followUps?.defaultChannel ? true : undefined}
                  aria-describedby={
                    sectionFieldErrors.followUps?.defaultChannel
                      ? "default-channel-error"
                      : undefined
                  }
                  className={cn(
                    "flex h-10 w-full rounded-md border border-border bg-surface-card px-3 text-sm",
                    !canEdit && READ_ONLY_FIELD_CLASS,
                    sectionFieldErrors.followUps?.defaultChannel
                      ? "border-status-error focus-visible:ring-status-error/30"
                      : undefined,
                  )}
                  onChange={(event) => {
                    clearSectionFieldError("followUps", "defaultChannel");
                    setDraft((prev) => ({
                      ...prev,
                      followUps: {
                        ...prev.followUps,
                        defaultChannel: event.target.value as "EMAIL" | "WHATSAPP" | "PHONE",
                      },
                    }));
                  }}
                >
                  <option value="EMAIL">Email</option>
                  <option value="WHATSAPP">WhatsApp</option>
                  <option value="PHONE">Phone</option>
                </select>
                {sectionFieldErrors.followUps?.defaultChannel ? (
                  <p id="default-channel-error" className="text-sm text-status-error" role="alert">
                    {sectionFieldErrors.followUps.defaultChannel}
                  </p>
                ) : null}
              </div>
            </ConfigSection>
          ) : null}

          {scope === "expiryRenewal" ? (
            <ConfigSection
              canEdit={canEdit}
              readOnlyHint={copy.readOnlyHint}
              saving={configSaveInFlight}
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
                error={sectionFieldErrors.expiryRenewal?.renewalReminderDaysBefore}
                onChange={(renewalReminderDaysBefore) => {
                  clearSectionFieldError("expiryRenewal", "renewalReminderDaysBefore");
                  setDraft((prev) => ({
                    ...prev,
                    expiryRenewal: { ...prev.expiryRenewal, renewalReminderDaysBefore },
                  }));
                }}
              />
              <DaysListField
                id="expiry-days-before"
                label={copy.fields.expiryWarningDaysBefore}
                value={draft.expiryRenewal.expiryWarningDaysBefore}
                disabled={!canEdit}
                error={sectionFieldErrors.expiryRenewal?.expiryWarningDaysBefore}
                onChange={(expiryWarningDaysBefore) => {
                  clearSectionFieldError("expiryRenewal", "expiryWarningDaysBefore");
                  setDraft((prev) => ({
                    ...prev,
                    expiryRenewal: { ...prev.expiryRenewal, expiryWarningDaysBefore },
                  }));
                }}
              />
              <ToggleRow
                id="auto-extend-on-payment"
                label={copy.fields.autoExtendOnPayment}
                hint={copy.fields.autoExtendOnPaymentHint}
                checked={draft.expiryRenewal.autoExtendOnPayment}
                disabled={!canEdit}
                onCheckedChange={(autoExtendOnPayment) =>
                  setDraft((prev) => ({
                    ...prev,
                    expiryRenewal: { ...prev.expiryRenewal, autoExtendOnPayment },
                  }))
                }
              />
            </ConfigSection>
          ) : null}

          {scope === "monthlyReports" ? (
            <ConfigSection
              canEdit={canEdit}
              readOnlyHint={copy.readOnlyHint}
              saving={configSaveInFlight}
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
                  error={sectionFieldErrors.monthlyReports?.sendDayOfMonth}
                  onChange={(sendDayOfMonth) => {
                    clearSectionFieldError("monthlyReports", "sendDayOfMonth");
                    setDraft((prev) => ({
                      ...prev,
                      monthlyReports: { ...prev.monthlyReports, sendDayOfMonth },
                    }));
                  }}
                />
                <NumberField
                  id="report-send-hour"
                  label={copy.fields.reportSendHour}
                  hint={copy.fields.reportSendHourHint}
                  value={draft.monthlyReports.sendHourLocal}
                  min={0}
                  max={23}
                  disabled={!canEdit}
                  error={sectionFieldErrors.monthlyReports?.sendHourLocal}
                  onChange={(sendHourLocal) => {
                    clearSectionFieldError("monthlyReports", "sendHourLocal");
                    setDraft((prev) => ({
                      ...prev,
                      monthlyReports: { ...prev.monthlyReports, sendHourLocal },
                    }));
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="report-recipients">{copy.fields.reportRecipients}</Label>
                <select
                  id="report-recipients"
                  disabled={!canEdit}
                  value={draft.monthlyReports.recipients}
                  aria-invalid={sectionFieldErrors.monthlyReports?.recipients ? true : undefined}
                  aria-describedby={
                    sectionFieldErrors.monthlyReports?.recipients
                      ? "report-recipients-error"
                      : undefined
                  }
                  className={cn(
                    "flex h-10 w-full rounded-md border border-border bg-surface-card px-3 text-sm",
                    !canEdit && READ_ONLY_FIELD_CLASS,
                    sectionFieldErrors.monthlyReports?.recipients
                      ? "border-status-error focus-visible:ring-status-error/30"
                      : undefined,
                  )}
                  onChange={(event) => {
                    clearSectionFieldError("monthlyReports", "recipients");
                    setDraft((prev) => ({
                      ...prev,
                      monthlyReports: {
                        ...prev.monthlyReports,
                        recipients: event.target.value as
                          | "business_owners"
                          | "admin_only"
                          | "both",
                      },
                    }));
                  }}
                >
                  <option value="business_owners">{copy.fields.recipientsBusinessOwners}</option>
                  <option value="admin_only">{copy.fields.recipientsAdminOnly}</option>
                  <option value="both">{copy.fields.recipientsBoth}</option>
                </select>
                {sectionFieldErrors.monthlyReports?.recipients ? (
                  <p id="report-recipients-error" className="text-sm text-status-error" role="alert">
                    {sectionFieldErrors.monthlyReports.recipients}
                  </p>
                ) : null}
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
              <ToggleRow
                id="include-billing-summary"
                label={copy.fields.includeBillingSummary}
                hint={copy.fields.includeBillingSummaryHint}
                checked={draft.monthlyReports.includeBillingSummary}
                disabled={!canEdit}
                onCheckedChange={(includeBillingSummary) =>
                  setDraft((prev) => ({
                    ...prev,
                    monthlyReports: { ...prev.monthlyReports, includeBillingSummary },
                  }))
                }
              />
            </ConfigSection>
          ) : null}

          {scope === "whatsApp" ? (
            <ConfigSection
              canEdit={canEdit}
              readOnlyHint={copy.readOnlyHint}
              saving={configSaveInFlight}
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
                <CountryCodeField
                  id="country-code"
                  label={copy.fields.defaultCountryCode}
                  value={draft.whatsApp.defaultCountryCode}
                  disabled={!canEdit}
                  error={
                    sectionFieldErrors.whatsApp?.defaultCountryCode ??
                    automationCountryCodeFieldError(
                      draft.whatsApp.defaultCountryCode,
                      AUTOMATION_COUNTRY_CODE_MESSAGE,
                    )
                  }
                  onChange={(defaultCountryCode) => {
                    clearSectionFieldError("whatsApp", "defaultCountryCode");
                    setDraft((prev) => ({
                      ...prev,
                      whatsApp: { ...prev.whatsApp, defaultCountryCode },
                    }));
                  }}
                />
                <TimeField
                  id="hours-start"
                  label={copy.fields.businessHoursStart}
                  hint={copy.fields.businessHoursFormatHint}
                  value={draft.whatsApp.businessHoursStart}
                  disabled={!canEdit}
                  error={
                    sectionFieldErrors.whatsApp?.businessHoursStart ??
                    automationTimeFieldError(
                      draft.whatsApp.businessHoursStart,
                      AUTOMATION_TIME_FORMAT_MESSAGE,
                    )
                  }
                  onChange={(businessHoursStart) => {
                    clearSectionFieldError("whatsApp", "businessHoursStart");
                    setDraft((prev) => ({
                      ...prev,
                      whatsApp: { ...prev.whatsApp, businessHoursStart },
                    }));
                  }}
                />
                <TimeField
                  id="hours-end"
                  label={copy.fields.businessHoursEnd}
                  hint={copy.fields.businessHoursFormatHint}
                  value={draft.whatsApp.businessHoursEnd}
                  disabled={!canEdit}
                  error={
                    sectionFieldErrors.whatsApp?.businessHoursEnd ??
                    automationTimeFieldError(
                      draft.whatsApp.businessHoursEnd,
                      AUTOMATION_TIME_FORMAT_MESSAGE,
                    )
                  }
                  onChange={(businessHoursEnd) => {
                    clearSectionFieldError("whatsApp", "businessHoursEnd");
                    setDraft((prev) => ({
                      ...prev,
                      whatsApp: { ...prev.whatsApp, businessHoursEnd },
                    }));
                  }}
                />
              </div>
            </ConfigSection>
          ) : null}

          {scope === "history" ? (
            <AutomationHistoryPanel
              copy={copy}
              timezone={draft.global.timezone}
              runs={historyRuns}
              total={historyTotal}
              isLoading={historyLoading}
              isEmpty={historyEmpty}
              isError={historyLoadFailed}
              loadMoreError={historyLoadMoreFailed}
              hasMore={historyHasNextPage}
              isLoadingMore={historyFetchingNextPage}
              canEdit={canEdit}
              onLoadMore={() => void handleLoadMoreHistory()}
              onRetry={() => void refetchRuns()}
              onRetryLoadMore={() => void handleLoadMoreHistory()}
            />
          ) : null}
          </div>
        </div>
      </div>

      <AutomationRunNowConfirmDialog
        open={runNowConfirmOpen}
        onOpenChange={handleRunNowConfirmOpenChange}
        config={persistedConfig ?? draft}
        copy={copy.runNowConfirm}
        isRunning={runInFlight}
        onConfirm={() => void handleRun(false)}
      />
    </>
  );
}
