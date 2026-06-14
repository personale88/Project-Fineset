import { NextResponse } from "next/server";
import { withAuthQuery } from "@/lib/api/route-handler";
import { getPortfolioAlerts } from "@/lib/services/portfolio-alerts";
import { z } from "zod";

const alertsQuerySchema = z.object({}).passthrough();

export const GET = withAuthQuery(
  ["BUSINESS_OWNER"] as const,
  alertsQuerySchema,
  async (session) => {
    const alerts = await getPortfolioAlerts(session.email);
    return NextResponse.json({ data: alerts });
  },
);
