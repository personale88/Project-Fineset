"use client";

import { useState } from "react";
import { Coins, Info, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { useAnalyticsCredits, useRechargeAnalyticsCredits } from "@/hooks/useAnalyticsCredits";
import { usePlatformSettingsContext } from "@/components/admin/PlatformSettingsProvider";
import { formatCredits, TOKENS_PER_CREDIT } from "@/lib/analytics/credit-units";
import { cn } from "@/lib/utils/cn";
import { formatCurrency } from "@/lib/utils/formatters";
import type { Content } from "@/content/en";
import type { AnalyticsCreditLedgerType } from "@prisma/client";

type CreditsCopy = Content["admin"]["analytics"]["credits"];

interface AnalyticsCreditsRechargePaneProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  copy: CreditsCopy;
}

function formatLedgerLabel(
  type: AnalyticsCreditLedgerType,
  copy: CreditsCopy,
): string {
  switch (type) {
    case "GRANT":
      return copy.ledgerGrant;
    case "RECHARGE":
      return copy.ledgerRecharge;
    case "USAGE":
      return copy.ledgerUsage;
  }
}

export function AnalyticsCreditsRechargePane({
  open,
  onOpenChange,
  copy,
}: AnalyticsCreditsRechargePaneProps) {
  const { data, isLoading, isError } = useAnalyticsCredits();
  const { settings } = usePlatformSettingsContext();
  const { mutate, isPending, variables: selectedPackId } = useRechargeAnalyticsCredits();
  const [successPackId, setSuccessPackId] = useState<string | null>(null);

  function handleRecharge(packId: string) {
    setSuccessPackId(null);
    mutate(packId, {
      onSuccess: () => setSuccessPackId(packId),
    });
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="p-0">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Coins className="h-5 w-5 text-brand-gold" aria-hidden />
            {copy.title}
          </SheetTitle>
          <SheetDescription>{copy.description}</SheetDescription>
        </SheetHeader>

        <SheetBody className="space-y-6">
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          ) : isError || !data ? (
            <p className="text-sm text-status-error">{copy.loadFailed}</p>
          ) : (
            <>
              <div className="rounded-card border border-border bg-surface-secondary/30 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-text-muted">
                  {copy.balanceLabel}
                </p>
                <p className="mt-1 font-display text-3xl font-semibold tabular-nums text-text-primary">
                  {formatCredits(data.balanceCredits)}
                  <span className="ml-2 text-base font-sans font-normal text-text-muted">
                    {copy.creditsUnit}
                  </span>
                </p>
                <p className="mt-2 text-sm text-text-secondary">
                  {copy.tokensPerCredit.replace("{count}", String(TOKENS_PER_CREDIT))}
                </p>
              </div>

              <div className="rounded-card border border-brand-gold/25 bg-brand-gold/5 p-4">
                <div className="flex gap-3">
                  <Info className="mt-0.5 h-4 w-4 shrink-0 text-brand-gold" aria-hidden />
                  <div className="space-y-2 text-sm text-text-secondary">
                    <p className="font-medium text-text-primary">{copy.howItWorksTitle}</p>
                    <ul className="list-disc space-y-1 pl-4">
                      {copy.howItWorks.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-sm font-medium text-text-primary">{copy.packsTitle}</p>
                <div className="grid gap-3">
                  {data.packs.map((pack) => {
                    const isSelected = selectedPackId === pack.id && isPending;
                    const justRecharged = successPackId === pack.id;
                    return (
                      <div
                        key={pack.id}
                        className={cn(
                          "rounded-card border p-4 transition-colors",
                          justRecharged
                            ? "border-status-success/40 bg-status-success/5"
                            : "border-border bg-surface-card",
                        )}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-medium text-text-primary">{pack.label}</p>
                            <p className="mt-1 text-sm text-text-secondary">{pack.description}</p>
                            <p className="mt-2 text-xs text-text-muted">{pack.bestFor}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold tabular-nums text-text-primary">
                              {formatCurrency(pack.priceInr)}
                            </p>
                            <p className="text-xs text-text-muted">
                              {formatCredits(pack.credits)} {copy.creditsUnit}
                            </p>
                          </div>
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          className="mt-3 w-full sm:w-auto"
                          disabled={isPending}
                          onClick={() => handleRecharge(pack.id)}
                        >
                          {isSelected ? copy.recharging : copy.rechargePack}
                        </Button>
                        {justRecharged ? (
                          <p className="mt-2 text-xs font-medium text-status-success">
                            {copy.rechargeSuccess}
                          </p>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
                <p className="text-xs text-text-muted">{copy.devPaymentNote}</p>
              </div>

              {data.recentLedger.length > 0 ? (
                <div className="space-y-3">
                  <p className="text-sm font-medium text-text-primary">{copy.historyTitle}</p>
                  <ul className="divide-y divide-border rounded-card border border-border">
                    {data.recentLedger.map((entry) => (
                      <li
                        key={entry.id}
                        className="flex items-start justify-between gap-3 px-3 py-2.5 text-sm"
                      >
                        <div className="min-w-0">
                          <p className="font-medium text-text-primary">
                            {formatLedgerLabel(entry.type, copy)}
                          </p>
                          <p className="truncate text-xs text-text-muted">
                            {entry.description ??
                              (entry.tokensUsed
                                ? copy.tokensUsed.replace(
                                    "{count}",
                                    String(entry.tokensUsed),
                                  )
                                : "—")}
                          </p>
                        </div>
                        <span
                          className={cn(
                            "shrink-0 font-semibold tabular-nums",
                            entry.amount >= 0 ? "text-status-success" : "text-text-secondary",
                          )}
                        >
                          {entry.amount >= 0 ? "+" : ""}
                          {formatCredits(entry.amount)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <div className="rounded-card border border-dashed border-border p-4 text-sm text-text-secondary">
                <p className="flex items-center gap-2 font-medium text-text-primary">
                  <Sparkles className="h-4 w-4 text-brand-gold" aria-hidden />
                  {copy.supportTitle}
                </p>
                <p className="mt-2">
                  {copy.supportBody.replace("{email}", settings.general.supportEmail)}
                </p>
              </div>
            </>
          )}
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}
