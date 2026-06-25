import { withAuthQuery } from "@/lib/api/route-handler";
import {
  buildDevBillingAccessPatch,
  isDevBillingPendingMockEnabled,
} from "@/lib/billing/dev-billing-pending-mock";
import type { AppSession } from "@/types";
import { buildOutstandingBillingForBusinessKey } from "@/lib/services/billing-accounts";
import { resolvePortalStoreIdForSession } from "@/lib/auth/resolve-manager-store-id";
import { requireStaffContext } from "@/lib/auth/resolve-staff";
import { getPortalBillingAccessForRole } from "@/lib/services/portal-billing-access";
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

    const access = await getPortalBillingAccessForRole(storeId, session.role);
    if (!access) {
      return NextResponse.json({ message: "Store not found" }, { status: 404 });
    }

    const outstanding = await buildOutstandingBillingForBusinessKey(access.businessKey);

    const mockPatch =
      isDevBillingPendingMockEnabled() &&
      access.paymentStatus !== "PAID" &&
      access.reason !== "PAID" &&
      access.reason !== "WAIVED" &&
      (outstanding?.grandTotal ?? 0) > 0
        ? buildDevBillingAccessPatch(
            outstanding!.grandTotal,
            access.isGracePeriod || access.reason === "WITHIN_DUE_WINDOW",
          )
        : null;

    return NextResponse.json({
      storeId,
      businessName: access.businessName,
      canReadData: mockPatch?.canReadData ?? access.canReadData,
      isGracePeriod: mockPatch?.isGracePeriod ?? access.isGracePeriod,
      paymentStatus: mockPatch?.paymentStatus ?? access.paymentStatus,
      paidAt: mockPatch ? null : access.paidAt,
      reason: mockPatch?.reason ?? access.reason,
      paymentDeadline: access.paymentDeadline.toISOString(),
      paymentDeadlineFallback: access.paymentDeadline.toISOString(),
      billingCycleStart: access.billingCycleStart.toISOString(),
      billingAnchorAt: access.billingAnchorAt?.toISOString() ?? null,
      consecutiveUnpaidPeriods:
        mockPatch?.consecutiveUnpaidPeriods ?? access.consecutiveUnpaidPeriods,
      restrictionTier: mockPatch?.restrictionTier ?? access.restrictionTier,
      billingRestricted: mockPatch?.billingRestricted ?? access.billingRestricted,
      metricsBlurred: mockPatch?.metricsBlurred ?? access.metricsBlurred,
      viewerRole: session.role as AppSession["role"],
      outstandingGrandTotal: mockPatch?.outstandingGrandTotal ?? outstanding?.grandTotal ?? 0,
      unpaidPeriodCount: mockPatch?.unpaidPeriodCount ?? outstanding?.unpaidPeriodCount ?? 0,
    });
  },
);
