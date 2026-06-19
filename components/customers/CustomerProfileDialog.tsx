"use client";

import {
  Calendar,
  MapPin,
  Phone,
  ShoppingBag,
  Sparkles,
  Store,
  TrendingUp,
  User,
} from "lucide-react";
import { useCustomerProfile } from "@/hooks/useCustomerProfile";
import { formatCurrency, formatDate, formatDateTime, maskPhone } from "@/lib/utils/formatters";
import { labelFor } from "@/lib/utils/visit-display";
import type { CustomerTimelineEventType } from "@/lib/services/customer-profile";
import type { VisitListItem } from "@/types";
import type { Content } from "@/content/en";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { CustomerMergePanel } from "@/components/customers/CustomerMergePanel";

type ProfileCopy = Content["store"]["visits"]["customerProfile"];
type VisitFormFields = Content["visitForm"]["fields"];

export type CustomerProfileLookup = {
  customerId?: string | null;
  visitId?: string | null;
  fieldSaleId?: string | null;
  customerName: string;
  storeId?: string;
};

interface CustomerProfileDialogProps {
  visit: VisitListItem | null;
  lookup?: CustomerProfileLookup | null;
  copy: ProfileCopy;
  fieldLabels: VisitFormFields;
  productLabels: Record<string, string>;
  onClose: () => void;
  onViewVisit?: (visitId: string) => void;
  showMerge?: boolean;
  storeId?: string;
  headerActions?: React.ReactNode;
}

const timelineStyles: Record<
  CustomerTimelineEventType,
  { dot: string; icon: typeof Store }
> = {
  visit: { dot: "bg-brand-gold", icon: Store },
  field_sale: { dot: "bg-status-info", icon: MapPin },
  follow_up: { dot: "bg-status-warning", icon: Calendar },
  call: { dot: "bg-text-muted", icon: Phone },
};

function ChipList({
  label,
  items,
  formatItem,
}: {
  label: string;
  items: string[];
  formatItem?: (value: string) => string;
}) {
  if (items.length === 0) return null;
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium uppercase tracking-wide text-text-muted">
        {label}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {items.map((item) => (
          <Badge key={item} variant="secondary" className="font-normal">
            {formatItem ? formatItem(item) : item}
          </Badge>
        ))}
      </div>
    </div>
  );
}

export function CustomerProfileDialog({
  visit,
  lookup = null,
  copy,
  fieldLabels,
  productLabels,
  onClose,
  onViewVisit,
  showMerge = false,
  storeId,
  headerActions,
}: CustomerProfileDialogProps) {
  const open = visit !== null || lookup !== null;
  const { data: profile, isLoading, isError } = useCustomerProfile({
    customerId: lookup?.customerId ?? visit?.customerId,
    visitId: lookup?.visitId ?? visit?.id,
    fieldSaleId: lookup?.fieldSaleId,
    storeId: lookup?.storeId ?? storeId,
    enabled: open,
  });

  const initials = (profile?.customer.name ?? lookup?.customerName ?? visit?.customerName ?? "?")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-hidden p-0 sm:max-w-4xl">
        <div className="max-h-[90vh] overflow-y-auto">
          <div className="border-b border-border bg-gradient-to-br from-brand-charcoal/5 via-surface-card to-brand-gold/5 px-6 py-5">
            <DialogHeader className="space-y-4 text-left">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex gap-4">
                  <div
                    className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-brand-gold/15 font-display text-lg font-semibold text-brand-gold"
                    aria-hidden
                  >
                    {initials}
                  </div>
                  <div className="min-w-0 space-y-1">
                    <DialogTitle className="font-display text-2xl">
                      {isLoading ? (
                        <Skeleton className="h-8 w-48" />
                      ) : (
                        profile?.customer.name ?? visit?.customerName
                      )}
                    </DialogTitle>
                    <p className="text-sm text-text-muted">{copy.subtitle}</p>
                    {!isLoading && profile && (
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        {profile.customer.customerType && (
                          <Badge variant="outline">
                            {labelFor(
                              fieldLabels.customerType.options,
                              profile.customer.customerType,
                            )}
                          </Badge>
                        )}
                        <Badge variant="secondary" className="font-normal">
                          {copy.visitsOnRecord.replace(
                            "{count}",
                            String(profile.summary.totalVisits),
                          )}
                        </Badge>
                        {profile.customer.latestVisitCustomerType && (
                          <Badge variant="outline" className="font-normal text-text-muted">
                            {copy.taggedAtVisit}:{" "}
                            {labelFor(
                              fieldLabels.customerType.options,
                              profile.customer.latestVisitCustomerType,
                            )}
                          </Badge>
                        )}
                        {profile.customer.ghsEnrolled && (
                          <Badge variant="outline">{copy.ghsEnrolled}</Badge>
                        )}
                        {profile.customer.activeScheme && (
                          <Badge variant="outline">
                            {profile.customer.activeScheme}
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                {headerActions ? (
                  <div className="flex shrink-0 items-start gap-2">{headerActions}</div>
                ) : null}
              </div>
            </DialogHeader>

            {!isLoading && profile && (
              <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
                <ProfileMeta
                  icon={Phone}
                  label={copy.phone}
                  value={maskPhone(profile.customer.phone)}
                />
                <ProfileMeta
                  icon={MapPin}
                  label={copy.area}
                  value={profile.customer.area ?? "—"}
                />
                <ProfileMeta
                  icon={User}
                  label={copy.demographics}
                  value={[
                    profile.customer.gender &&
                      labelFor(fieldLabels.gender.options, profile.customer.gender),
                    profile.customer.ageGroup &&
                      labelFor(fieldLabels.ageGroup.options, profile.customer.ageGroup),
                  ]
                    .filter(Boolean)
                    .join(" · ") || "—"}
                />
                <ProfileMeta
                  icon={Calendar}
                  label={copy.memberSince}
                  value={`${formatDate(profile.customer.memberSince)}${
                    profile.customer.lastSeenAt
                      ? ` · ${copy.lastSeen} ${formatDate(profile.customer.lastSeenAt)}`
                      : ""
                  }`}
                />
              </dl>
            )}
          </div>

          <div className="space-y-6 px-6 py-5">
            {isLoading ? (
              <div className="space-y-3" aria-busy="true">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-40 w-full" />
              </div>
            ) : isError || !profile ? (
              <p className="text-sm text-status-error">{copy.loadError}</p>
            ) : (
              <>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <SummaryCard
                    label={copy.stats.visits}
                    value={String(profile.summary.totalVisits)}
                    icon={Store}
                  />
                  <SummaryCard
                    label={copy.stats.revenue}
                    value={formatCurrency(profile.summary.totalRevenue)}
                    icon={TrendingUp}
                  />
                  <SummaryCard
                    label={copy.stats.conversion}
                    value={`${profile.summary.conversionRate}%`}
                    icon={ShoppingBag}
                  />
                  <SummaryCard
                    label={copy.stats.fieldSales}
                    value={String(profile.summary.fieldSalesCount)}
                    icon={MapPin}
                  />
                </div>

                {showMerge && profile?.customer.id ? (
                  <CustomerMergePanel
                    targetCustomerId={profile.customer.id}
                    storeId={storeId}
                  />
                ) : null}

                <div className="grid gap-6 lg:grid-cols-5">
                  <section className="space-y-4 lg:col-span-2">
                    <h3 className="flex items-center gap-2 font-display text-base font-semibold text-text-primary">
                      <Sparkles className="h-4 w-4 text-brand-gold" />
                      {copy.interestsTitle}
                    </h3>
                    <div className="space-y-4 rounded-card border border-border bg-surface-secondary/50 p-4">
                      <ChipList
                        label={copy.interests.explored}
                        items={profile.interests.productsExplored}
                        formatItem={(v) => productLabels[v] ?? v}
                      />
                      <ChipList
                        label={copy.interests.purchased}
                        items={profile.interests.productsPurchased}
                        formatItem={(v) => productLabels[v] ?? v}
                      />
                      <ChipList
                        label={copy.interests.metal}
                        items={profile.interests.metalPreferences}
                        formatItem={(v) =>
                          labelFor(fieldLabels.metalKtPref.options, v) ?? v
                        }
                      />
                      <ChipList
                        label={copy.interests.occasions}
                        items={profile.interests.occasions}
                        formatItem={(v) =>
                          labelFor(fieldLabels.purchaseOccasion.options, v) ?? v
                        }
                      />
                      <ChipList
                        label={copy.interests.intent}
                        items={profile.interests.intentTiers}
                        formatItem={(v) =>
                          labelFor(fieldLabels.intentTier.options, v) ?? v
                        }
                      />
                      <ChipList
                        label={copy.interests.sources}
                        items={profile.interests.sourceChannels}
                        formatItem={(v) =>
                          labelFor(fieldLabels.sourceChannel.options, v) ?? v
                        }
                      />
                    </div>

                    <h3 className="font-display text-base font-semibold text-text-primary">
                      {copy.insightsTitle}
                    </h3>
                    <div className="space-y-4 rounded-card border border-border bg-surface-secondary/50 p-4 text-sm">
                      {profile.insights.staffSeen.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-xs font-medium uppercase tracking-wide text-text-muted">
                            {copy.insights.staff}
                          </p>
                          <ul className="space-y-1">
                            {profile.insights.staffSeen.map((staff) => (
                              <li
                                key={staff.staffId}
                                className="flex justify-between text-text-secondary"
                              >
                                <span>{staff.staffName}</span>
                                <span className="font-numeric text-text-muted">
                                  {staff.interactions} {copy.insights.interactions}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      <ChipList
                        label={copy.insights.competitors}
                        items={profile.insights.competitorMentions}
                      />
                      <ChipList
                        label={copy.insights.noPurchase}
                        items={profile.insights.noPurchaseReasons}
                        formatItem={(v) =>
                          labelFor(fieldLabels.reasonNoPurchase.options, v) ?? v
                        }
                      />
                    </div>
                  </section>

                  <section className="lg:col-span-3">
                    <h3 className="mb-4 font-display text-base font-semibold text-text-primary">
                      {copy.timelineTitle}
                    </h3>
                    {profile.timeline.length === 0 ? (
                      <p className="text-sm text-text-muted">{copy.timelineEmpty}</p>
                    ) : (
                      <ol className="relative space-y-0 border-l border-border pl-6">
                        {profile.timeline.map((event) => {
                          const style = timelineStyles[event.type];
                          const Icon = style.icon;
                          return (
                            <li key={event.id} className="relative pb-6 last:pb-0">
                              <span
                                className={cn(
                                  "absolute -left-[1.65rem] top-1.5 flex h-3 w-3 rounded-full ring-4 ring-surface-card",
                                  style.dot,
                                )}
                              />
                              <div className="rounded-card border border-border bg-surface-card p-3 shadow-sm">
                                <div className="flex flex-wrap items-start justify-between gap-2">
                                  <div className="flex gap-2">
                                    <Icon className="mt-0.5 h-4 w-4 shrink-0 text-text-muted" />
                                    <div>
                                      <p className="font-medium text-text-primary">
                                        {event.title}
                                      </p>
                                      <p className="text-xs text-text-muted">
                                        {formatDateTime(event.date)}
                                      </p>
                                      {event.subtitle && (
                                        <p className="mt-1 text-sm text-text-secondary">
                                          {event.subtitle}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex flex-col items-end gap-1">
                                    {event.amount != null && event.amount > 0 && (
                                      <span className="font-numeric text-sm font-medium text-text-primary">
                                        {formatCurrency(event.amount)}
                                      </span>
                                    )}
                                    {event.visitId && onViewVisit && (
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 text-xs text-brand-gold"
                                        onClick={() => onViewVisit(event.visitId!)}
                                      >
                                        {copy.viewVisit}
                                      </Button>
                                    )}
                                  </div>
                                </div>
                                {event.status && (
                                  <Badge
                                    variant="outline"
                                    className="mt-2 text-xs font-normal"
                                  >
                                    {event.status.replace(/_/g, " ")}
                                  </Badge>
                                )}
                              </div>
                            </li>
                          );
                        })}
                      </ol>
                    )}
                  </section>
                </div>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ProfileMeta({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Phone;
  label: string;
  value: string;
}) {
  return (
    <div className="flex gap-2">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-text-muted" />
      <div>
        <dt className="text-xs text-text-muted">{label}</dt>
        <dd className="font-medium text-text-primary">{value}</dd>
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: typeof Store;
}) {
  return (
    <div className="rounded-card border border-border bg-surface-card px-4 py-3 shadow-sm">
      <div className="flex items-center gap-2 text-text-muted">
        <Icon className="h-4 w-4" />
        <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
      </div>
      <p className="mt-1 font-numeric text-xl font-semibold text-text-primary">{value}</p>
    </div>
  );
}
