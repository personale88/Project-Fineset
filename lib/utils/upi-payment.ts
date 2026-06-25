export const PORTAL_PAY_NOW_TIMER_SECONDS = 15 * 60;

export interface UpiPaymentParams {
  vpa: string;
  payeeName: string;
  amountInr: number;
  transactionNote?: string;
}

export function resolvePaymentUpiVpa(
  configuredVpa: string | null | undefined,
  envVpa = process.env.BILLING_UPI_VPA,
): string | null {
  const vpa = configuredVpa?.trim() || envVpa?.trim();
  return vpa ? vpa : null;
}

export function buildUpiPaymentUri(params: UpiPaymentParams): string {
  const vpa = params.vpa.trim();
  const payeeName = params.payeeName.trim().slice(0, 50);
  const amount = Math.max(0, params.amountInr);
  const search = new URLSearchParams({
    pa: vpa,
    pn: payeeName,
    am: amount.toFixed(2),
    cu: "INR",
  });

  const note = params.transactionNote?.trim();
  if (note) {
    search.set("tn", note.slice(0, 80));
  }

  return `upi://pay?${search.toString()}`;
}

export function formatPaymentCountdown(secondsLeft: number): string {
  const clamped = Math.max(0, Math.floor(secondsLeft));
  const minutes = Math.floor(clamped / 60);
  const seconds = clamped % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}
