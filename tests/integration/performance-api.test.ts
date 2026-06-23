import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { disconnectPerfSeed, seedPerfFixtures } from "@/tests/fixtures/perf-seed";
import { assertWithinBudget, PERF_BUDGETS } from "@/tests/helpers/perf-budgets";
import * as sessionModule from "@/lib/auth/get-app-session";
import type { BusinessOwnerSession, AdminSession } from "@/types";

import { GET as getVisits } from "@/app/api/visits/route";
import { GET as getCalls } from "@/app/api/calls/route";
import { GET as getFieldSales } from "@/app/api/field-sales/route";
import { GET as getStaff } from "@/app/api/staff/route";
import { GET as getStoreOverview } from "@/app/api/analytics/store/overview/route";
import { GET as getStorePortfolio } from "@/app/api/analytics/store/portfolio/route";
import { GET as getStoreAnalytics } from "@/app/api/analytics/store/route";
import { GET as getMyStores } from "@/app/api/store/my-stores/route";
import { GET as getAdminAnalytics } from "@/app/api/analytics/admin/route";
import { GET as getStaffPerformance } from "@/app/api/staff/performance/route";
import { GET as getSyncState } from "@/app/api/sync/state/route";
import { GET as getRegionCheck } from "@/app/api/perf/region-check/route";

const hasDb = Boolean(process.env.DATABASE_URL);

function request(url: string): NextRequest {
  return new NextRequest(new URL(url, "http://localhost:3000"));
}

async function elapsedFor(handler: (req: NextRequest) => Promise<Response>, url: string) {
  const started = Date.now();
  const response = await handler(request(url));
  return { elapsed: Date.now() - started, response };
}

describe.skipIf(!hasDb)("performance API routes", () => {
  let fixtures: Awaited<ReturnType<typeof seedPerfFixtures>>;
  let ownerSession: BusinessOwnerSession;
  let adminSession: AdminSession;

  beforeAll(async () => {
    fixtures = await seedPerfFixtures();
    ownerSession = {
      role: "BUSINESS_OWNER",
      userId: "perf-manager-auth",
      email: fixtures.managerEmail,
      storeId: fixtures.storeId,
      storeName: "Perf Test Store",
    };
    adminSession = {
      role: "MASTER_ADMIN",
      userId: "perf-admin",
      email: "perf-admin@test.local",
      permissions: {
        portfolio: true,
        accounts: true,
        analytics: true,
        billing: true,
      },
    };
  }, 60_000);

  afterAll(async () => {
    vi.restoreAllMocks();
    await disconnectPerfSeed();
  });

  beforeEach(() => {
    vi.spyOn(sessionModule, "getAppSession").mockImplementation(async () => ownerSession);
  });

  it("returns 401 without session", async () => {
    vi.mocked(sessionModule.getAppSession).mockResolvedValueOnce(null);
    const { response } = await elapsedFor(getVisits, "/api/visits?page=1&pageSize=20");
    expect(response.status).toBe(401);
  });

  it("GET /api/visits within budget", async () => {
    const { elapsed, response } = await elapsedFor(
      getVisits,
      `/api/visits?page=1&pageSize=20&storeId=${fixtures.storeId}`,
    );
    expect(response.status).toBe(200);
    assertWithinBudget(elapsed, PERF_BUDGETS.api.visits);
    const body = await response.json();
    const payloadBytes = Buffer.byteLength(JSON.stringify(body), "utf8");
    expect(payloadBytes).toBeLessThan(PERF_BUDGETS.payload.visitsPageMaxBytes);
  });

  it("GET /api/calls within budget", async () => {
    const year = new Date().getFullYear();
    const month = new Date().getMonth() + 1;
    const { elapsed, response } = await elapsedFor(
      getCalls,
      `/api/calls?page=1&pageSize=15&year=${year}&month=${month}&storeId=${fixtures.storeId}`,
    );
    expect(response.status).toBe(200);
    assertWithinBudget(elapsed, PERF_BUDGETS.api.calls);
  });

  it("GET /api/field-sales within budget", async () => {
    const year = new Date().getFullYear();
    const month = new Date().getMonth() + 1;
    const { elapsed, response } = await elapsedFor(
      getFieldSales,
      `/api/field-sales?page=1&pageSize=15&year=${year}&month=${month}&storeId=${fixtures.storeId}`,
    );
    expect(response.status).toBe(200);
    assertWithinBudget(elapsed, PERF_BUDGETS.api.fieldSales);
  });

  it("GET /api/staff within budget", async () => {
    const { elapsed, response } = await elapsedFor(
      getStaff,
      `/api/staff?storeId=${fixtures.storeId}`,
    );
    expect(response.status).toBe(200);
    assertWithinBudget(elapsed, PERF_BUDGETS.api.staff);
  });

  it("GET /api/analytics/store/overview within budget", async () => {
    const { elapsed, response } = await elapsedFor(
      getStoreOverview,
      `/api/analytics/store/overview?period=week&storeId=${fixtures.storeId}`,
    );
    expect(response.status).toBe(200);
    assertWithinBudget(elapsed, PERF_BUDGETS.api.storeOverview);
  });

  it("GET /api/analytics/store/portfolio within budget", async () => {
    const { elapsed, response } = await elapsedFor(
      getStorePortfolio,
      "/api/analytics/store/portfolio?period=week",
    );
    expect(response.status).toBe(200);
    assertWithinBudget(elapsed, PERF_BUDGETS.api.storePortfolio);
  });

  it("GET /api/analytics/store within budget", async () => {
    const { elapsed, response } = await elapsedFor(
      getStoreAnalytics,
      `/api/analytics/store?period=week&storeId=${fixtures.storeId}`,
    );
    expect(response.status).toBe(200);
    assertWithinBudget(elapsed, PERF_BUDGETS.api.storeAnalytics);
  });

  it("GET /api/store/my-stores within budget", async () => {
    const { elapsed, response } = await elapsedFor(getMyStores, "/api/store/my-stores");
    expect(response.status).toBe(200);
    assertWithinBudget(elapsed, PERF_BUDGETS.api.myStores);
  });

  it("GET /api/analytics/admin within budget", async () => {
    vi.mocked(sessionModule.getAppSession).mockResolvedValueOnce(adminSession);
    const { elapsed, response } = await elapsedFor(
      getAdminAnalytics,
      "/api/analytics/admin?period=week",
    );
    expect(response.status).toBe(200);
    assertWithinBudget(elapsed, PERF_BUDGETS.api.adminAnalytics);
  });

  it("GET /api/staff/performance within budget", async () => {
    const { elapsed, response } = await elapsedFor(
      getStaffPerformance,
      `/api/staff/performance?storeId=${fixtures.storeId}`,
    );
    expect(response.status).toBe(200);
    assertWithinBudget(elapsed, PERF_BUDGETS.api.staffPerformance);
  });

  it("GET /api/sync/state sets no-store cache control", async () => {
    const response = await getSyncState();
    expect(response.headers.get("Cache-Control")).toContain("no-store");
  });

  it("GET /api/perf/region-check within budget", async () => {
    const started = Date.now();
    const response = await getRegionCheck(request("/api/perf/region-check"));
    assertWithinBudget(Date.now() - started, PERF_BUDGETS.api.regionCheck);
    expect(response.status).toBe(200);
  });
});
