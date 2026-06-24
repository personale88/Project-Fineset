import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuthQuery } from "@/lib/api/route-handler";
import {
  buildPortalInvoicePreviewHtml,
  PortalBillingDetailsError,
} from "@/lib/services/portal-billing-details";

const querySchema = z.object({
  invoiceLogId: z.string().trim().min(1).optional(),
});

export const GET = withAuthQuery(
  ["STORE_MANAGER", "BUSINESS_OWNER"] as const,
  querySchema,
  async (session, query) => {
    try {
      const preview = await buildPortalInvoicePreviewHtml(session, query.invoiceLogId);
      return NextResponse.json(preview);
    } catch (error) {
      if (error instanceof PortalBillingDetailsError) {
        return NextResponse.json({ message: error.message }, { status: error.status });
      }
      throw error;
    }
  },
);
