import * as Sentry from "@sentry/node";

let initialized = false;

function isNextBuild(): boolean {
  return process.env.NEXT_PHASE === "phase-production-build";
}

function shouldCapture(): boolean {
  return Boolean(process.env.SENTRY_DSN?.trim()) && !isNextBuild();
}

export function initErrorMonitoring(): void {
  if (initialized || !shouldCapture()) return;

  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.SENTRY_ENVIRONMENT ?? process.env.NODE_ENV ?? "development",
    release: process.env.SENTRY_RELEASE,
    tracesSampleRate: 0,
    beforeSend(event) {
      const request = event.request;
      if (request?.headers) {
        delete request.headers.cookie;
        delete request.headers.authorization;
      }
      return event;
    },
  });

  initialized = true;
}

export type ErrorCaptureContext = {
  tags?: Record<string, string>;
  extra?: Record<string, unknown>;
  user?: { id?: string; email?: string };
};

export function captureServerError(
  error: unknown,
  context?: ErrorCaptureContext,
): void {
  if (!shouldCapture()) {
    console.error("[error]", error, context);
    return;
  }

  initErrorMonitoring();

  Sentry.withScope((scope) => {
    if (context?.tags) {
      for (const [key, value] of Object.entries(context.tags)) {
        scope.setTag(key, value);
      }
    }
    if (context?.extra) {
      scope.setExtras(context.extra);
    }
    if (context?.user) {
      scope.setUser(context.user);
    }
    Sentry.captureException(error);
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

  initErrorMonitoring();

  Sentry.withScope((scope) => {
    if (context?.tags) {
      for (const [key, value] of Object.entries(context.tags)) {
        scope.setTag(key, value);
      }
    }
    if (context?.extra) {
      scope.setExtras(context.extra);
    }
    Sentry.captureMessage(message, "warning");
  });
}
