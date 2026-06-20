"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import type { PeriodValue } from "@/components/shared/PeriodSwitcher";
import { isPeriodValue } from "@/lib/utils/analytics-period-url";

export function useOwnerPeriodFromUrl(fallback: PeriodValue = "today"): PeriodValue {
  const searchParams = useSearchParams();

  return useMemo(() => {
    const fromUrl = searchParams.get("period");
    if (isPeriodValue(fromUrl)) return fromUrl;
    return fallback;
  }, [fallback, searchParams]);
}
