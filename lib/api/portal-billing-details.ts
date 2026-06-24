import type {
  PortalBillingDetailsDto,
  PortalInvoicePreviewDto,
} from "@/lib/services/portal-billing-details";

export type { PortalBillingDetailsDto, PortalInvoicePreviewDto };

export class PortalBillingApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "PortalBillingApiError";
  }
}

async function readApiErrorMessage(res: Response, fallback: string): Promise<string> {
  try {
    const body = (await res.json()) as { message?: string };
    if (typeof body.message === "string" && body.message.trim()) {
      return body.message.trim();
    }
  } catch {
    // ignore parse errors
  }
  return fallback;
}

export async function fetchPortalBillingDetails(): Promise<PortalBillingDetailsDto> {
  const res = await fetch("/api/billing/portal-details", {
    credentials: "include",
  });
  if (!res.ok) {
    const message = await readApiErrorMessage(res, "Failed to load billing details");
    throw new PortalBillingApiError(message, res.status);
  }
  return res.json() as Promise<PortalBillingDetailsDto>;
}

export async function fetchPortalInvoicePreview(
  invoiceLogId?: string,
): Promise<PortalInvoicePreviewDto> {
  const params = invoiceLogId
    ? `?invoiceLogId=${encodeURIComponent(invoiceLogId)}`
    : "";
  const res = await fetch(`/api/billing/invoice-preview${params}`, {
    credentials: "include",
  });
  if (!res.ok) {
    const fallback =
      res.status === 404 ? "Invoice not found" : "Failed to load invoice preview";
    const message = await readApiErrorMessage(res, fallback);
    throw new PortalBillingApiError(message, res.status);
  }
  return res.json() as Promise<PortalInvoicePreviewDto>;
}
