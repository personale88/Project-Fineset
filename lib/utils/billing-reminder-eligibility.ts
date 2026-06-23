import type { BillingPaymentStatus } from "@prisma/client";
import type { AdminPortfolioPaymentStatus } from "@/lib/utils/admin-portfolio-filters";

export function businessNeedsBillingReminder(
  status: AdminPortfolioPaymentStatus,
): boolean {
  return status === "EXPIRED" || status === "OVERDUE" || status === "DUE_SOON";
}

export function shouldShowBillingReminderActions(
  portfolioStatus: AdminPortfolioPaymentStatus,
  billingPaymentStatus: BillingPaymentStatus | undefined,
): boolean {
  if (portfolioStatus === "EXPIRED") return true;
  if (billingPaymentStatus === "PAID") return false;
  return businessNeedsBillingReminder(portfolioStatus);
}
