import type { PeriodValue } from "@/components/shared/PeriodSwitcher";
import type { AnalyticsPeriodLabel } from "@/types";

export const PERIOD_VALUES = [
  "yesterday",
  "today",
  "week",
  "month",
  "last3months",
  "last6months",
] as const satisfies readonly AnalyticsPeriodLabel[];

export type PeriodLabels = Record<(typeof PERIOD_VALUES)[number], string>;

export function buildPeriodSwitcherOptions(labels: PeriodLabels) {
  return PERIOD_VALUES.map((value) => ({
    value,
    label: labels[value],
  }));
}

export function isPeriodValue(value: string | null | undefined): value is PeriodValue {
  return (
    value !== null &&
    value !== undefined &&
    PERIOD_VALUES.includes(value as AnalyticsPeriodLabel)
  );
}

export function parsePeriodParam(value?: string | null): PeriodValue {
  if (isPeriodValue(value)) return value;
  return "today";
}
