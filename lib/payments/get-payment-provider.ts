import { NoOpPaymentProvider } from "@/lib/payments/no-op-provider";
import type { PaymentProvider, PaymentProviderKind } from "@/lib/payments/types";

function resolvePaymentProviderKind(): PaymentProviderKind {
  const raw = process.env.PAYMENT_PROVIDER?.trim().toLowerCase();
  if (raw === "noop" || raw === "razorpay" || raw === "stripe") return raw;
  if (process.env.NODE_ENV === "production") return "none";
  return "noop";
}

let cached: PaymentProvider | null = null;

export function getPaymentProviderKind(): PaymentProviderKind {
  return resolvePaymentProviderKind();
}

export function isPaymentProviderConfigured(): boolean {
  const kind = resolvePaymentProviderKind();
  return kind !== "none";
}

export function getPaymentProvider(): PaymentProvider {
  if (cached) return cached;

  const kind = resolvePaymentProviderKind();

  switch (kind) {
    case "noop":
      cached = new NoOpPaymentProvider(true);
      break;
    case "none":
      cached = new NoOpPaymentProvider(false);
      break;
    case "razorpay":
    case "stripe":
      // Phase 9 — fall back to unavailable until gateway is implemented
      cached = new NoOpPaymentProvider(false);
      break;
    default:
      cached = new NoOpPaymentProvider(false);
  }

  return cached;
}
