export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { validateEnv } = await import("@/lib/env");
  validateEnv();

  if (process.env.SENTRY_DSN?.trim()) {
    const { initErrorMonitoring } = await import("@/lib/monitoring/capture-error");
    await initErrorMonitoring();
  }
}
