"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { PeriodValue } from "@/components/shared/PeriodSwitcher";
import { isPeriodValue } from "@/lib/utils/analytics-period-url";

interface BusinessOwnerPeriodContextValue {
  period: PeriodValue;
  setPeriod: (value: PeriodValue) => void;
}

const BusinessOwnerPeriodContext =
  createContext<BusinessOwnerPeriodContextValue | null>(null);

export function BusinessOwnerPeriodProvider({
  initialPeriod,
  children,
}: {
  initialPeriod?: PeriodValue;
  children: ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const period = useMemo<PeriodValue>(() => {
    const fromUrl = searchParams.get("period");
    if (isPeriodValue(fromUrl)) return fromUrl;
    if (initialPeriod && isPeriodValue(initialPeriod)) return initialPeriod;
    return "today";
  }, [initialPeriod, searchParams]);

  const setPeriod = useCallback(
    (value: PeriodValue) => {
      const next = new URLSearchParams(searchParams.toString());
      next.set("period", value);
      router.replace(`${pathname}?${next.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const value = useMemo(
    () => ({ period, setPeriod }),
    [period, setPeriod],
  );

  return (
    <BusinessOwnerPeriodContext.Provider value={value}>
      {children}
    </BusinessOwnerPeriodContext.Provider>
  );
}

export function useBusinessOwnerPeriod(): BusinessOwnerPeriodContextValue {
  const context = useContext(BusinessOwnerPeriodContext);
  if (!context) {
    throw new Error("useBusinessOwnerPeriod must be used within BusinessOwnerPeriodProvider");
  }
  return context;
}
