/**
 * Inspect portal billing blur state for all businesses (staging/prod via env).
 *
 * Usage:
 *   npx dotenv -e .env.staging.local -- tsx scripts/check-billing-blur-state.ts
 */
import { PrismaClient } from "@prisma/client";
import { getActivationBillingPeriod } from "../lib/billing/activation-cycle";
import {
  applyPortalBillingAccessForRole,
  resolvePortalBillingAccess,
} from "../lib/utils/portal-billing-access";
import { getPlatformSettings } from "../lib/services/platform-settings";

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const platformSettings = await getPlatformSettings();
  const restrictPortalOnOverdue = platformSettings.billing.restrictPortalOnOverdue;
  console.log("restrictPortalOnOverdue:", restrictPortalOnOverdue);

  const accounts = await prisma.billingBusinessAccount.findMany({
    select: {
      businessKey: true,
      paymentStatus: true,
      paidAt: true,
      paidThroughPeriodEnd: true,
      billingAnchorAt: true,
    },
    orderBy: { businessKey: "asc" },
  });

  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(12, 0, 0, 0);

  for (const acc of accounts) {
    const anchor = acc.billingAnchorAt;
    if (!anchor) {
      console.log(acc.businessKey, "NO billingAnchorAt");
      continue;
    }

    const period = getActivationBillingPeriod(anchor, now);
    const baseToday = resolvePortalBillingAccess(
      {
        paymentStatus: acc.paymentStatus,
        paidAt: acc.paidAt,
        paidThroughPeriodEnd: acc.paidThroughPeriodEnd,
        billingAnchorAt: anchor,
        restrictPortalOnOverdue,
      },
      now,
    );
    const baseTomorrow = resolvePortalBillingAccess(
      {
        paymentStatus: acc.paymentStatus,
        paidAt: acc.paidAt,
        paidThroughPeriodEnd: acc.paidThroughPeriodEnd,
        billingAnchorAt: anchor,
        restrictPortalOnOverdue,
      },
      tomorrow,
    );
    const smTomorrow = applyPortalBillingAccessForRole(baseTomorrow, "STORE_MANAGER");
    const staffTomorrow = applyPortalBillingAccessForRole(baseTomorrow, "STAFF");

    console.log(
      JSON.stringify(
        {
          businessKey: acc.businessKey,
          paymentStatus: acc.paymentStatus,
          paidAt: acc.paidAt?.toISOString() ?? null,
          dueDate: period.dueDate.toISOString(),
          today: {
            reason: baseToday.reason,
            grace: baseToday.isGracePeriod,
            tier: baseToday.restrictionTier,
          },
          tomorrow: {
            reason: baseTomorrow.reason,
            tier: baseTomorrow.restrictionTier,
            consecutiveUnpaid: baseTomorrow.consecutiveUnpaidPeriods,
            storeManager: {
              blurred: smTomorrow.metricsBlurred,
              restricted: smTomorrow.billingRestricted,
            },
            staff: {
              blurred: staffTomorrow.metricsBlurred,
              restricted: staffTomorrow.billingRestricted,
            },
          },
        },
        null,
        2,
      ),
    );
  }
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
