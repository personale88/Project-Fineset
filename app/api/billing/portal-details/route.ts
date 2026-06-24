import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuthQuery } from "@/lib/api/route-handler";
import {
  getPortalBillingDetails,
  PortalBillingDetailsError,
} from "@/lib/services/portal-billing-details";

export const GET = withAuthQuery(
  ["STORE_MANAGER", "BUSINESS_OWNER"] as const,
  z.object({}),
  async (session) => {
    try {
      const details = await getPortalBillingDetails(session);
      return NextResponse.json(details);
    } catch (error) {
      if (error instanceof PortalBillingDetailsError) {
        return NextResponse.json({ message: error.message }, { status: error.status });
      }
      throw error;
    }
  },
);
