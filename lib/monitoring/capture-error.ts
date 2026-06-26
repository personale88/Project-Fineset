function isNextBuild(): boolean {
  return process.env.NEXT_PHASE === "phase-production-build";
}

function shouldCapture(): boolean {
  return Boolean(process.env.SENTRY_DSN?.trim()) && !isNextBuild();
}

async function loadSentryBackend() {
  return import(
    /* webpackIgnore: true */
    "@/lib/monitoring/capture-error-sentry"
  );
}

export type ErrorCaptureContext = {
  tags?: Record<string, string>;
  extra?: Record<string, unknown>;
  user?: { id?: string; email?: string };
};

export async function initErrorMonitoring(): Promise<void> {
  if (!shouldCapture()) return;
  const backend = await loadSentryBackend();
  await backend.initErrorMonitoring();
}

export function captureServerError(
  error: unknown,
  context?: ErrorCaptureContext,
): void {
  if (!shouldCapture()) {
    console.error("[error]", error, context);
    return;
  }

  void loadSentryBackend().then((backend) => {
    backend.captureServerError(error, context);
  });
}

export function captureServerMessage(
  message: string,
  context?: ErrorCaptureContext,
): void {
  if (!shouldCapture()) {
    console.warn("[monitoring]", message, context);
    return;
  }

  void loadSentryBackend().then((backend) => {
    backend.captureServerMessage(message, context);
  });
}
