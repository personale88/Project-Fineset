import { withAuthQuery } from "@/lib/api/route-handler";
import { isPortalDataReadBlockedForSession } from "@/lib/auth/billing-access-guard";
import { resolvePortalStoreIdForSession } from "@/lib/auth/resolve-manager-store-id";
import { requireStaffContext } from "@/lib/auth/resolve-staff";
import { getBillingCycleSettings } from "@/lib/automation/billing-cycle-settings";
import { getPortalBillingAccessForStore } from "@/lib/services/portal-billing-access";
import { formatBillingDeadlineFallback } from "@/lib/utils/billing-status-labels";
import { NextResponse } from "next/server";
import { z } from "zod";

const querySchema = z.object({
  storeId: z.string().optional(),
});

export const GET = withAuthQuery(
  ["STAFF", "STORE_MANAGER", "BUSINESS_OWNER"] as const,
  querySchema,
  async (session, query) => {
    let storeId = query.storeId?.trim();

    if (session.role === "STAFF" || session.role === "STORE_MANAGER") {
      storeId = session.storeId;
    } else if (!storeId) {
      storeId = session.storeId;
    } else {
      const resolved = await resolvePortalStoreIdForSession(session, storeId);
      if (resolved instanceof Response) {
        storeId = session.storeId;
      } else {
        storeId = resolved;
      }
    }

    if (session.role === "STAFF") {
      const staff = await requireStaffContext(session);
      if (staff) storeId = staff.storeId;
    }

    const access = await getPortalBillingAccessForStore(storeId);
    if (!access) {
      return NextResponse.json({ message: "Store not found" }, { status: 404 });
    }

    const blocked = await isPortalDataReadBlockedForSession(session, storeId);
    const cycleSettings = await getBillingCycleSettings();

    return NextResponse.json({
      storeId,
      businessName: access.businessName,
      canReadData: access.canReadData,
      isGracePeriod: access.isGracePeriod,
      paymentStatus: access.paymentStatus,
      paidAt: access.paidAt,
      reason: access.reason,
      paymentDeadline: access.paymentDeadline.toISOString(),
      paymentDeadlineFallback: formatBillingDeadlineFallback(cycleSettings),
      billingCycleStart: access.billingCycleStart.toISOString(),
      billingRestricted: blocked,
    });
  },
);
