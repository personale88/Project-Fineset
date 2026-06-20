import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import {
  disconnectStoreManagerPortalSeed,
  seedStoreManagerPortalFixtures,
} from "@/tests/fixtures/store-manager-portal-seed";
import * as sessionModule from "@/lib/auth/get-app-session";
import { prisma } from "@/lib/db/prisma";
import type { BusinessOwnerSession } from "@/types";

import { GET as getStoreWorkQueue } from "@/app/api/dashboard/store-work-queue/route";

const hasDb = Boolean(process.env.DATABASE_URL);

function request(url: string): NextRequest {
  return new NextRequest(new URL(url, "http://localhost:3000"));
}

describe.skipIf(!hasDb)("business owner store work queue integration", () => {
  let fixtures: Awaited<ReturnType<typeof seedStoreManagerPortalFixtures>>;
  let ownerSession: BusinessOwnerSession;

  beforeAll(async () => {
    fixtures = await seedStoreManagerPortalFixtures();
    const store = await prisma.store.findUniqueOrThrow({
      where: { id: fixtures.storeId },
      select: { businessOwnerEmail: true, name: true },
    });

    ownerSession = {
      role: "BUSINESS_OWNER",
      userId: "owner-test-user",
      email: store.businessOwnerEmail ?? "owner-manager-portal@test.local",
      storeId: fixtures.storeId,
      storeName: store.name,
    };
  }, 60_000);

  afterAll(async () => {
    vi.restoreAllMocks();
    await disconnectStoreManagerPortalSeed();
  });

  beforeEach(() => {
    vi.spyOn(sessionModule, "getAppSession").mockImplementation(async () => ownerSession);
  });

  it("returns portfolio work queue with mismatched assignments and summaries", async () => {
    const response = await getStoreWorkQueue(request("/api/dashboard/store-work-queue?limit=30"));
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.total).toBeGreaterThan(0);
    expect(body.categoryTotals.mismatched_assignment).toBe(1);
    expect(body.categoryTotals.overdue_task).toBeGreaterThanOrEqual(1);
    expect(body.storeSummaries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          storeId: fixtures.storeId,
          total: expect.any(Number),
        }),
      ]),
    );
    expect(body.items[0]).toEqual(
      expect.objectContaining({
        storeId: fixtures.storeId,
        storeName: expect.any(String),
      }),
    );
  });

  it("scopes work queue to a single store when storeId is provided", async () => {
    const response = await getStoreWorkQueue(
      request(`/api/dashboard/store-work-queue?storeId=${fixtures.storeId}&limit=30`),
    );
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.items.every((item: { storeId: string }) => item.storeId === fixtures.storeId)).toBe(
      true,
    );
    expect(body.storeSummaries).toHaveLength(1);
  });
});
