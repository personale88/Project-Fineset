export type PaymentProviderKind = "none" | "noop" | "razorpay" | "stripe";

export interface CreditRechargeCheckoutParams {
  appUserId: string;
  packId: string;
  packLabel: string;
  amountInr: number;
  credits: number;
}

export interface CreditRechargeCheckoutResult {
  /** Provider-specific payment id used for idempotent credit grant */
  externalPaymentId: string;
  /** When set, client should redirect to complete payment (future gateway flows) */
  checkoutUrl?: string;
}

export interface PaymentProvider {
  readonly kind: PaymentProviderKind;
  isAvailable(): boolean;
  /** Completes recharge — noop/dev grants instantly; gateway verifies first */
  completeCreditRecharge(
    params: CreditRechargeCheckoutParams,
  ): Promise<CreditRechargeCheckoutResult>;
}
