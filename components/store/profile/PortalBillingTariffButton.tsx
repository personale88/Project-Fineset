"use client";

import { useState } from "react";
import { Info } from "lucide-react";
import { usePortalBillingDetails } from "@/hooks/usePortalBillingDetails";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/utils/formatters";
import type { ProfileCopy } from "@/components/store/profile/profile-scope";

interface PortalBillingTariffButtonProps {
  copy: ProfileCopy["billing"];
}

export function PortalBillingTariffButton({ copy }: PortalBillingTariffButtonProps) {
  const [open, setOpen] = useState(false);
  const { data: details, isLoading } = usePortalBillingDetails();

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-8 shrink-0 gap-1.5 px-2.5 text-xs font-medium"
        onClick={() => setOpen(true)}
      >
        <Info className="h-3.5 w-3.5" aria-hidden />
        {copy.tariffButton}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[min(90vh,720px)] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{copy.tariffDialogTitle}</DialogTitle>
          </DialogHeader>

          {isLoading || !details ? (
            <div className="space-y-3 py-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : (
            <div className="space-y-5 text-sm text-text-secondary">
              <p>{copy.tariffDialogIntro}</p>

              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-text-muted">
                  {copy.tariffDialogTiersHeading}
                </h3>
                <ul className="mt-3 space-y-3">
                  {details.pricingTiers.map((tier) => (
                    <li
                      key={tier.label}
                      className="rounded-input border border-border bg-surface-secondary/30 px-3 py-3"
                    >
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <p className="font-medium text-text-primary">
                          {tier.label}
                          <span className="ml-2 font-normal text-text-muted">
                            ({tier.staffRange})
                          </span>
                        </p>
                        <p className="font-numeric tabular-nums text-text-primary">
                          {formatCurrency(tier.monthlyPriceExclGst)}
                          <span className="text-xs font-normal text-text-muted"> / store / mo excl. GST</span>
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="space-y-2 rounded-input border border-border bg-surface-secondary/20 px-3 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-text-muted">
                  {copy.tariffDialogHowItWorksHeading}
                </p>
                <p>{copy.tariffDialogPerStore}</p>
                <p>
                  {copy.tariffDialogGstNote.replace(
                    "{rate}",
                    String(details.gstRatePercent),
                  )}
                </p>
                <p>{copy.tariffDialogBillingCycle}</p>
              </div>

              {details.monthlyBilling.stores.length > 0 ? (
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-text-muted">
                    {copy.tariffDialogYourStoresHeading}
                  </h3>
                  <ul className="mt-3 divide-y divide-border/60 rounded-input border border-border">
                    {details.monthlyBilling.stores.map((line) => (
                      <li
                        key={line.storeId}
                        className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5"
                      >
                        <div className="min-w-0">
                          <p className="font-medium text-text-primary">{line.storeName}</p>
                          <p className="text-xs text-text-muted">
                            {line.staffCount} staff · {line.tierLabel}
                          </p>
                        </div>
                        <p className="font-numeric tabular-nums text-text-primary">
                          {formatCurrency(line.baseAmount)}
                          <span className="text-xs text-text-muted"> excl. GST</span>
                        </p>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-2 text-xs text-text-muted">
                    {copy.tariffDialogCurrentEstimate
                      .replace("{subtotal}", formatCurrency(details.monthlyBilling.subtotal))
                      .replace("{gst}", formatCurrency(details.monthlyBilling.gstTotal))
                      .replace("{total}", formatCurrency(details.monthlyBilling.grandTotal))
                      .replace("{rate}", String(details.gstRatePercent))}
                  </p>
                </div>
              ) : (
                <p className="text-xs text-text-muted">{copy.tariffDialogNoStores}</p>
              )}

              <p className="text-xs text-text-muted">{copy.tariffDialogSupport}</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
