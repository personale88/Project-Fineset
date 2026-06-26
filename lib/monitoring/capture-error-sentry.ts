import * as Sentry from "@sentry/node";

import type { ErrorCaptureContext } from "@/lib/monitoring/capture-error";

let initialized = false;

export async function initErrorMonitoring(): Promise<void> {
  if (initialized) return;

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

export function captureServerError(
  error: unknown,
  context?: ErrorCaptureContext,
): void {
  void initErrorMonitoring().then(() => {
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
  });
}

export function captureServerMessage(
  message: string,
  context?: ErrorCaptureContext,
): void {
  void initErrorMonitoring().then(() => {
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
  });
}
