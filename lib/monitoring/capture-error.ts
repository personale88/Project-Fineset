type SentryModule = typeof import("@sentry/node");

let initialized = false;
let sentryModulePromise: Promise<SentryModule> | null = null;

function isNextBuild(): boolean {
  return process.env.NEXT_PHASE === "phase-production-build";
}

function shouldCapture(): boolean {
  return Boolean(process.env.SENTRY_DSN?.trim()) && !isNextBuild();
}

function loadSentryModule(): Promise<SentryModule> {
  if (!sentryModulePromise) {
    sentryModulePromise = import("@sentry/node");
  }
  return sentryModulePromise;
}

export async function initErrorMonitoring(): Promise<void> {
  if (initialized || !shouldCapture()) return;

  const Sentry = await loadSentryModule();
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

  void (async () => {
    await initErrorMonitoring();
    const Sentry = await loadSentryModule();

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
  })();
}

export function captureServerMessage(
  message: string,
  context?: ErrorCaptureContext,
): void {
  if (!shouldCapture()) {
    console.warn("[monitoring]", message, context);
    return;
  }

  void (async () => {
    await initErrorMonitoring();
    const Sentry = await loadSentryModule();

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
  })();
}
