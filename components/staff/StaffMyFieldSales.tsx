"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useState } from "react";
import { content } from "@/content/en";
import { useFieldSalesList } from "@/hooks/useFieldSalesList";
import { STAFF_DASHBOARD_PATH } from "@/lib/auth/routes";
import { getPortalErrorMessage } from "@/lib/utils/api-error-message";
import { formatDate } from "@/lib/utils/formatters";
import { QueryLoadState } from "@/components/shared/QueryLoadState";
import { StaffCustomerProfileDialog } from "@/components/staff/StaffCustomerProfileDialog";
import { StaffAmendDialog } from "@/components/staff/StaffAmendDialog";
import { StaffCorrectionRequestDialog } from "@/components/staff/StaffCorrectionRequestDialog";
import type { CustomerProfileLookup } from "@/components/customers/CustomerProfileDialog";
import { Button } from "@/components/ui/button";
import type { Content } from "@/content/en";
import type { FieldSaleListItem } from "@/types";

type MyFieldSalesCopy = Content["staff"]["myFieldSales"];

interface StaffMyFieldSalesProps {
  copy: MyFieldSalesCopy;
  portalBasePath?: string;
  personalScope?: boolean;
}

export function StaffMyFieldSales({
  copy,
  portalBasePath = STAFF_DASHBOARD_PATH,
  personalScope = false,
}: StaffMyFieldSalesProps) {
  const amendCopy = content.staff.amend;
  const correctionCopy = content.staff.correctionRequest;
  const [page, setPage] = useState(1);
  const [profileLookup, setProfileLookup] = useState<CustomerProfileLookup | null>(null);
  const [amendFieldSale, setAmendFieldSale] = useState<FieldSaleListItem | null>(null);
  const [correctionFieldSale, setCorrectionFieldSale] = useState<FieldSaleListItem | null>(null);

  const { data, isLoading, isError, error, refetch } = useFieldSalesList({
    page,
    pageSize: 15,
    allTime: true,
    ...(personalScope ? { personalScope: true } : {}),
  });

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <Link
          href={portalBasePath}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-text-secondary transition-colors hover:text-brand-gold"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          {content.common.back}
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-bold text-text-primary">{copy.title}</h1>
            <p className="text-text-secondary">{copy.subtitle}</p>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href={`${portalBasePath}/log-field-sale`}>{copy.logFieldSale}</Link>
          </Button>
        </div>
      </div>

      <QueryLoadState
        isLoading={isLoading}
        isError={isError}
        errorLabel={getPortalErrorMessage(error, content.errors)}
        retryLabel={content.errors.tryAgain}
        onRetry={() => void refetch()}
      >
        {!data?.data.length ? (
          <p className="text-sm text-text-secondary">{copy.empty}</p>
        ) : (
          <ul className="space-y-3">
            {data.data.map((fieldSale) => (
              <li key={fieldSale.id} className="rounded-card border border-border bg-surface-card p-4 shadow-card">
                <button
                  type="button"
                  onClick={() =>
                    setProfileLookup({
                      fieldSaleId: fieldSale.id,
                      customerName: fieldSale.customerName,
                    })
                  }
                  className="w-full text-left"
                >
                  <p className="font-medium text-text-primary">{fieldSale.customerName}</p>
                  <p className="mt-1 text-sm text-text-secondary">
                    {formatDate(fieldSale.activityDate)} ·{" "}
                    {fieldSale.enrollmentOutcome?.replace(/_/g, " ") ?? copy.noOutcome}
                  </p>
                  {fieldSale.followUpNeeded ? (
                    <p className="mt-1 text-xs text-brand-gold">{copy.followUpScheduled}</p>
                  ) : null}
                </button>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button type="button" size="sm" variant="outline" onClick={() => setAmendFieldSale(fieldSale)}>
                    {amendCopy.edit}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => setCorrectionFieldSale(fieldSale)}
                  >
                    {correctionCopy.requestFix}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </QueryLoadState>

      {totalPages > 1 ? (
        <div className="flex items-center justify-between gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((current) => Math.max(1, current - 1))}
          >
            {content.common.previous}
          </Button>
          <span className="text-sm text-text-muted">
            {page} / {totalPages}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
          >
            {content.common.next}
          </Button>
        </div>
      ) : null}

      <StaffCustomerProfileDialog
        open={profileLookup !== null}
        onOpenChange={(next) => {
          if (!next) setProfileLookup(null);
        }}
        lookup={profileLookup}
      />

      {amendFieldSale ? (
        <StaffAmendDialog
          open
          onOpenChange={(next) => {
            if (!next) setAmendFieldSale(null);
          }}
          recordType="field_sale"
          recordId={amendFieldSale.id}
          initial={{
            customerName: amendFieldSale.customerName,
            customerPhone: amendFieldSale.customerPhone,
            staffNotes: amendFieldSale.staffNotes,
            locationLabel: amendFieldSale.locationLabel,
          }}
          onSaved={() => void refetch()}
        />
      ) : null}

      {correctionFieldSale ? (
        <StaffCorrectionRequestDialog
          open
          onOpenChange={(next) => {
            if (!next) setCorrectionFieldSale(null);
          }}
          fieldSaleId={correctionFieldSale.id}
          customerName={correctionFieldSale.customerName}
        />
      ) : null}
    </div>
  );
}
