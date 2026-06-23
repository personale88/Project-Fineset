import { apiFetch, buildQueryString } from "@/lib/api/client";
import type {
  BillingAccountDetailDto,
  BillingAccountSummaryDto,
  BillingFollowUpDto,
} from "@/lib/services/billing-accounts";
import type {
  BillingFollowUpChannel,
  BillingFollowUpOutcome,
  BillingPaymentStatus,
} from "@prisma/client";

export type {
  BillingAccountDetailDto,
  BillingAccountSummaryDto,
  BillingFollowUpDto,
};

export interface SendBusinessInvoiceResult {
  invoiceNumber: string;
  sentTo: string;
  grandTotal: number;
}

export async function sendBusinessInvoice(
  businessKey: string,
): Promise<SendBusinessInvoiceResult> {
  return apiFetch<SendBusinessInvoiceResult>("/api/admin/billing/send-invoice", {
    method: "POST",
    body: JSON.stringify({ businessKey }),
  });
}

export interface SendBillingWhatsAppReminderResult {
  whatsappUrl: string;
  phone: string;
  message: string;
}

export async function sendBillingWhatsAppReminder(
  businessKey: string,
): Promise<SendBillingWhatsAppReminderResult> {
  return apiFetch<SendBillingWhatsAppReminderResult>(
    "/api/admin/billing/whatsapp-reminder",
    {
      method: "POST",
      body: JSON.stringify({ businessKey }),
    },
  );
}

export async function fetchBillingSummaries(): Promise<BillingAccountSummaryDto[]> {
  const response = await apiFetch<{ data: BillingAccountSummaryDto[] }>(
    "/api/admin/billing/summaries",
  );
  return response.data;
}

export async function fetchBillingAccountDetail(
  businessKey: string,
): Promise<BillingAccountDetailDto> {
  return apiFetch<BillingAccountDetailDto>(
    `/api/admin/billing/account${buildQueryString({ businessKey })}`,
  );
}

export async function createBillingFollowUp(input: {
  businessKey: string;
  channel: BillingFollowUpChannel;
  outcome: BillingFollowUpOutcome;
  notes: string;
  nextFollowUpAt?: string | null;
}): Promise<BillingFollowUpDto> {
  return apiFetch<BillingFollowUpDto>("/api/admin/billing/follow-ups", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function updateBillingAccount(input: {
  businessKey: string;
  paymentStatus: BillingPaymentStatus;
  notes?: string;
}): Promise<BillingAccountDetailDto> {
  return apiFetch<BillingAccountDetailDto>("/api/admin/billing/account", {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}
