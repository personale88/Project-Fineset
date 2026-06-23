import { randomUUID } from "crypto";
import { PaymentNotConfiguredError } from "@/lib/payments/errors";
import type {
  CreditRechargeCheckoutParams,
  CreditRechargeCheckoutResult,
  PaymentProvider,
} from "@/lib/payments/types";

/**
 * Dev/test provider — grants credits instantly without payment verification.
 * Blocked in production unless PAYMENT_PROVIDER=noop is explicitly set.
 */
export class NoOpPaymentProvider implements PaymentProvider {
  readonly kind = "noop" as const;

  constructor(private readonly allowInProduction: boolean) {}

  isAvailable(): boolean {
    if (process.env.NODE_ENV !== "production") return true;
    return this.allowInProduction;
  }

  async completeCreditRecharge(
    params: CreditRechargeCheckoutParams,
  ): Promise<CreditRechargeCheckoutResult> {
    if (!this.isAvailable()) {
      throw new PaymentNotConfiguredError(
        "Instant credit recharge is disabled in production. Configure a payment provider or set PAYMENT_PROVIDER=noop for testing.",
      );
    }

    return {
      externalPaymentId: `noop_${params.packId}_${params.appUserId}_${randomUUID()}`,
    };
  }
}
