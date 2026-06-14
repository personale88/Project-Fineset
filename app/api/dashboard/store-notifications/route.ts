import { NextResponse } from "next/server";
import { withAuthQuery } from "@/lib/api/route-handler";
import { getBusinessOwnerStoreNotifications } from "@/lib/services/store-dashboard-notifications";
import { z } from "zod";

const notificationsQuerySchema = z.object({}).passthrough();

export const GET = withAuthQuery(
  ["BUSINESS_OWNER"] as const,
  notificationsQuerySchema,
  async (session) => {
    const data = await getBusinessOwnerStoreNotifications(
      session.email,
      session.storeId,
    );
    return NextResponse.json({ data });
  },
);
