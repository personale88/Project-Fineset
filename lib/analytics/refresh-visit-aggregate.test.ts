import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockExecuteRawUnsafe = vi.fn();
const mockInvalidateSummaryCache = vi.fn();

async function loadRefreshModule() {
  vi.doMock("@/lib/db/prisma", () => ({
    prisma: {
      $executeRawUnsafe: (...args: unknown[]) => mockExecuteRawUnsafe(...args),
    },
  }));
  vi.doMock("@/lib/cache/analytics-cache", () => ({
    invalidateSummaryCache: (...args: unknown[]) => mockInvalidateSummaryCache(...args),
  }));
  return import("@/lib/analytics/refresh-visit-aggregate");
}

describe("refreshVisitAggregate", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    mockExecuteRawUnsafe.mockResolvedValue(1);
    mockInvalidateSummaryCache.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("calls refresh_visit_aggregate SQL and busts analytics cache", async () => {
    const { refreshVisitAggregate } = await loadRefreshModule();
    await refreshVisitAggregate();

    expect(mockExecuteRawUnsafe).toHaveBeenCalledWith("SELECT refresh_visit_aggregate()");
    expect(mockInvalidateSummaryCache).toHaveBeenCalledTimes(1);
  });

  it("coalesces concurrent refresh calls into one in-flight execution", async () => {
    const { refreshVisitAggregate } = await loadRefreshModule();

    let resolveSql!: (value: number) => void;
    mockExecuteRawUnsafe.mockImplementation(
      () =>
        new Promise<number>((resolve) => {
          resolveSql = resolve;
        }),
    );

    const first = refreshVisitAggregate();
    const second = refreshVisitAggregate();

    resolveSql(1);
    await Promise.all([first, second]);

    expect(mockExecuteRawUnsafe).toHaveBeenCalledTimes(1);
  });

  it("swallows missing materialized view errors without throwing", async () => {
    mockExecuteRawUnsafe.mockRejectedValue(
      new Error('relation "visit_daily_aggregate" does not exist'),
    );
    const { refreshVisitAggregate } = await loadRefreshModule();

    await expect(refreshVisitAggregate()).resolves.toBeUndefined();
    expect(mockInvalidateSummaryCache).not.toHaveBeenCalled();
  });

  it("debounces notifyVisitsChanged via scheduleVisitAggregateRefresh", async () => {
    vi.useFakeTimers();
    const { notifyVisitsChanged } = await loadRefreshModule();

    notifyVisitsChanged();
    notifyVisitsChanged();
    notifyVisitsChanged();

    expect(mockExecuteRawUnsafe).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(3_000);

    expect(mockExecuteRawUnsafe).toHaveBeenCalledTimes(1);
  });

  it("notifyVisitsChanged immediate skips debounce", async () => {
    vi.useFakeTimers();
    const { notifyVisitsChanged } = await loadRefreshModule();

    notifyVisitsChanged({ immediate: true });

    await vi.runOnlyPendingTimersAsync();

    expect(mockExecuteRawUnsafe).toHaveBeenCalledTimes(1);
  });
});

describe("GET /api/cron/refresh-visit-aggregate", () => {
  const originalCronSecret = process.env.CRON_SECRET;

  afterEach(() => {
    vi.unstubAllEnvs();
    if (originalCronSecret === undefined) {
      delete process.env.CRON_SECRET;
    } else {
      process.env.CRON_SECRET = originalCronSecret;
    }
  });

  it("returns 503 when CRON_SECRET is not configured", async () => {
    vi.resetModules();
    vi.stubEnv("CRON_SECRET", "");
    const { GET } = await import("@/app/api/cron/refresh-visit-aggregate/route");
    const response = await GET(new Request("http://localhost/api/cron/refresh-visit-aggregate"));
    expect(response.status).toBe(503);
  });

  it("returns 401 when authorization header is missing or wrong", async () => {
    vi.resetModules();
    vi.stubEnv("CRON_SECRET", "test-cron-secret");
    const { GET } = await import("@/app/api/cron/refresh-visit-aggregate/route");

    const unauthorized = await GET(new Request("http://localhost/api/cron/refresh-visit-aggregate"));
    expect(unauthorized.status).toBe(401);

    const wrong = await GET(
      new Request("http://localhost/api/cron/refresh-visit-aggregate", {
        headers: { Authorization: "Bearer wrong" },
      }),
    );
    expect(wrong.status).toBe(401);
  });

  it("refreshes aggregate and returns ok payload when authorized", async () => {
    vi.resetModules();
    vi.stubEnv("CRON_SECRET", "test-cron-secret");
    const refreshModule = await import("@/lib/analytics/refresh-visit-aggregate");
    const refreshSpy = vi.spyOn(refreshModule, "refreshVisitAggregate").mockResolvedValue(undefined);
    const { GET } = await import("@/app/api/cron/refresh-visit-aggregate/route");

    const response = await GET(
      new Request("http://localhost/api/cron/refresh-visit-aggregate", {
        headers: { Authorization: "Bearer test-cron-secret" },
      }),
    );

    expect(response.status).toBe(200);
    expect(refreshSpy).toHaveBeenCalledTimes(1);
    const body = await response.json();
    expect(body.ok).toBe(true);
    expect(typeof body.refreshedAt).toBe("string");
  });
});
