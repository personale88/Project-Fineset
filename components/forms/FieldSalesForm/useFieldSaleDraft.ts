"use client";

import { useEffect } from "react";
import type { UseFormReset, UseFormWatch } from "react-hook-form";
import {
  getDefaultFieldSaleValues,
  parseDateInput,
  type FieldSalesFormValues,
} from "./FieldSalesForm.types";

const FIELD_SALE_DRAFT_STORAGE_KEY = "fineset-field-sale-draft";

const FIELD_SALE_DATE_FIELDS = ["activityDate", "followUpDate"] as const;
const FIELD_SALE_TIME_FIELDS = ["startTime", "endTime"] as const;

function coerceCalendarDate(value: unknown): Date | undefined {
  if (value instanceof Date) return value;
  if (typeof value === "string" && value.trim()) {
    return parseDateInput(value.slice(0, 10));
  }
  return undefined;
}

function coerceTimeDate(value: unknown): Date | undefined {
  if (value instanceof Date) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? undefined : parsed;
  }
  return undefined;
}

function normalizeLoadedDraft(
  draft: Partial<FieldSalesFormValues>,
): Partial<FieldSalesFormValues> {
  const raw = draft as Partial<FieldSalesFormValues> & Record<string, unknown>;
  const next = { ...draft };

  for (const key of FIELD_SALE_DATE_FIELDS) {
    const coerced = coerceCalendarDate(raw[key]);
    if (coerced) {
      next[key] = coerced;
    } else if (raw[key] != null && !(raw[key] instanceof Date)) {
      next[key] = undefined;
    }
  }

  for (const key of FIELD_SALE_TIME_FIELDS) {
    const coerced = coerceTimeDate(raw[key]);
    if (coerced) {
      next[key] = coerced;
    } else if (raw[key] != null && !(raw[key] instanceof Date)) {
      next[key] = undefined;
    }
  }

  if (!Array.isArray(next.schemesPitched)) {
    next.schemesPitched = [];
  }

  return next;
}

export function buildClientFieldSaleFormValues(
  draft?: Partial<FieldSalesFormValues>,
): FieldSalesFormValues {
  if (!draft) {
    return getDefaultFieldSaleValues();
  }

  return {
    ...getDefaultFieldSaleValues(),
    ...normalizeLoadedDraft(draft),
  };
}

export function loadFieldSaleDraft(): Partial<FieldSalesFormValues> | undefined {
  if (typeof window === "undefined") return undefined;

  try {
    const raw = localStorage.getItem(FIELD_SALE_DRAFT_STORAGE_KEY);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as Partial<FieldSalesFormValues>;
    return normalizeLoadedDraft(parsed);
  } catch {
    return undefined;
  }
}

export function saveFieldSaleDraft(values: FieldSalesFormValues): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(FIELD_SALE_DRAFT_STORAGE_KEY, JSON.stringify(values));
  } catch {
    // Ignore quota / private-mode failures — in-memory form state still works.
  }
}

export function clearFieldSaleDraft(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(FIELD_SALE_DRAFT_STORAGE_KEY);
}

export function useFieldSaleDraft(
  watch: UseFormWatch<FieldSalesFormValues>,
  reset: UseFormReset<FieldSalesFormValues>,
  enabled = true,
): void {
  useEffect(() => {
    if (!enabled) return;
    const draft = loadFieldSaleDraft();
    if (draft) {
      reset(buildClientFieldSaleFormValues(draft));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- hydrate once on mount
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const subscription = watch((values) => {
      saveFieldSaleDraft(values as FieldSalesFormValues);
    });
    return () => subscription.unsubscribe();
  }, [enabled, watch]);
}
