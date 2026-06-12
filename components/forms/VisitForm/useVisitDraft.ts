"use client";

import { useEffect } from "react";
import type { UseFormWatch, UseFormReset } from "react-hook-form";
import {
  VISIT_DRAFT_STORAGE_KEY,
  extractDraftFields,
  getDefaultVisitValues,
  parseDateInput,
  type VisitDraftFields,
  type VisitFormValues,
} from "./VisitForm.types";

const DRAFT_DATE_FIELDS = ["visitDate", "dateOfBirth", "anniversary"] as const;

function normalizeLoadedDraft(
  draft: Partial<VisitDraftFields>,
): Partial<VisitDraftFields> {
  const raw = draft as Partial<VisitDraftFields> & Record<string, Date | string | undefined>;
  const next = { ...draft };

  for (const key of DRAFT_DATE_FIELDS) {
    const value = raw[key as string];
    if (typeof value === "string") {
      next[key] = parseDateInput(value.slice(0, 10));
    }
  }

  return next;
}

function isVisitDraftFields(value: unknown): value is VisitDraftFields {
  if (!value || typeof value !== "object") return false;
  const draft = value as VisitDraftFields;
  return (
    typeof draft.customerType === "string" &&
    Array.isArray(draft.productsExplored)
  );
}

export function loadVisitDraft(): Partial<VisitDraftFields> | undefined {
  if (typeof window === "undefined") return undefined;

  try {
    const raw = localStorage.getItem(VISIT_DRAFT_STORAGE_KEY);
    if (!raw) return undefined;
    const parsed: unknown = JSON.parse(raw);
    return isVisitDraftFields(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
}

export function saveVisitDraft(values: VisitFormValues): void {
  if (typeof window === "undefined") return;

  const draft = extractDraftFields(values);
  localStorage.setItem(VISIT_DRAFT_STORAGE_KEY, JSON.stringify(draft));
}

export function clearVisitDraft(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(VISIT_DRAFT_STORAGE_KEY);
}

export function buildClientVisitFormValues(
  draft?: Partial<VisitDraftFields>,
): VisitFormValues {
  return {
    ...getDefaultVisitValues(draft ? normalizeLoadedDraft(draft) : undefined),
    inTime: new Date(),
  };
}

export function useVisitDraft(
  watch: UseFormWatch<VisitFormValues>,
  reset: UseFormReset<VisitFormValues>,
  enabled: boolean,
): void {
  useEffect(() => {
    if (!enabled) return;
    reset(buildClientVisitFormValues(loadVisitDraft()));
  }, [enabled, reset]);

  useEffect(() => {
    if (!enabled) return;

    const subscription = watch((values) => {
      saveVisitDraft(values as VisitFormValues);
    });

    return () => subscription.unsubscribe();
  }, [enabled, watch]);
}
