export async function register() {
  const { validateEnv } = await import("@/lib/env");
  validateEnv();

  const { initErrorMonitoring } = await import("@/lib/monitoring/capture-error");
  initErrorMonitoring();
}
