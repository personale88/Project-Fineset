import { NextResponse } from "next/server";
import { withAuthQuery } from "@/lib/api/route-handler";
import { getBusinessOwnerStoreNotifications } from "@/lib/services/store-dashboard-notifications";
import { periodQuerySchema } from "@/lib/validations/common.schema";
import { z } from "zod";

const notificationsQuerySchema = z.object({
  period: periodQuerySchema,
});

export const GET = withAuthQuery(
  ["BUSINESS_OWNER"] as const,
  notificationsQuerySchema,
  async (session, query) => {
    const data = await getBusinessOwnerStoreNotifications(
      session.email,
      session.storeId,
      query.period,
    );
    return NextResponse.json({ data });
  },
);
