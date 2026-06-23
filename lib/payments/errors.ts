export class PaymentNotConfiguredError extends Error {
  readonly code = "PAYMENT_NOT_CONFIGURED" as const;

  constructor(message = "Payment provider is not configured.") {
    super(message);
    this.name = "PaymentNotConfiguredError";
  }
}

export class PaymentVerificationError extends Error {
  readonly code = "PAYMENT_VERIFICATION_FAILED" as const;

  constructor(message = "Payment could not be verified.") {
    super(message);
    this.name = "PaymentVerificationError";
  }
}

export function isPaymentError(
  error: unknown,
): error is PaymentNotConfiguredError | PaymentVerificationError {
  return (
    error instanceof PaymentNotConfiguredError ||
    error instanceof PaymentVerificationError
  );
}
