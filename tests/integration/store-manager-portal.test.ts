import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import {
  disconnectStoreManagerPortalSeed,
  seedStoreManagerPortalFixtures,
} from "@/tests/fixtures/store-manager-portal-seed";
import * as sessionModule from "@/lib/auth/get-app-session";
import { prisma } from "@/lib/db/prisma";
import type { StoreSession } from "@/types";

import { GET as getManagerOverview } from "@/app/api/dashboard/manager-overview/route";
import { GET as getFollowUps } from "@/app/api/follow-ups/route";
import { GET as getStaffCalls } from "@/app/api/staff/calls/route";
import { POST as postBulkAssign } from "@/app/api/assignments/bulk/route";
import { POST as postStaff } from "@/app/api/staff/route";
import { PATCH as patchStaff } from "@/app/api/staff/[id]/route";

const hasDb = Boolean(process.env.DATABASE_URL);

function request(url: string, init?: ConstructorParameters<typeof NextRequest>[1]): NextRequest {
  return new NextRequest(new URL(url, "http://localhost:3000"), init);
}

describe.skipIf(!hasDb)("store manager portal integration", () => {
  let fixtures: Awaited<ReturnType<typeof seedStoreManagerPortalFixtures>>;
  let managerSession: StoreSession;

  beforeAll(async () => {
    fixtures = await seedStoreManagerPortalFixtures();
    managerSession = {
      role: "STORE_MANAGER",
      userId: fixtures.managerAppUserId,
      email: fixtures.managerEmail,
      storeId: fixtures.storeId,
      storeName: "Manager Portal Test Store",
    };
  }, 60_000);

  afterAll(async () => {
    vi.restoreAllMocks();
    await disconnectStoreManagerPortalSeed();
  });

  beforeEach(() => {
    vi.spyOn(sessionModule, "getAppSession").mockImplementation(async () => managerSession);
  });

  it("returns 401 without session on manager routes", async () => {
    vi.mocked(sessionModule.getAppSession).mockResolvedValue(null);

    const overview = await getManagerOverview(request("/api/dashboard/manager-overview"));
    expect(overview.status).toBe(401);

    const followUps = await getFollowUps(request("/api/follow-ups"));
    expect(followUps.status).toBe(401);

    const calls = await getStaffCalls(request("/api/staff/calls"));
    expect(calls.status).toBe(401);

    const bulk = await postBulkAssign(
      request("/api/assignments/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetStaffId: fixtures.rsoStaffId, followUpIds: [] }),
      }),
    );
    expect(bulk.status).toBe(401);
  });

  it("GET /api/dashboard/manager-overview reports mismatched assignment KPIs", async () => {
    const response = await getManagerOverview(request("/api/dashboard/manager-overview"));
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.assignment.openFollowUps).toBe(3);
    expect(body.assignment.mismatchedAssignments).toBe(1);
    expect(body.assignment.activeStaff).toBeGreaterThanOrEqual(2);
    expect(body.staffActivity.length).toBeGreaterThanOrEqual(2);
  });

  it("GET /api/follow-ups?mismatched=true returns only mismatched rows", async () => {
    const response = await getFollowUps(request("/api/follow-ups?mismatched=true"));
    expect(response.status).toBe(200);

    const rows = await response.json();
    expect(rows).toHaveLength(1);
    expect(rows[0].id).toBe(fixtures.mismatchedFollowUpId);
  });

  it("GET /api/follow-ups?personalScope=true scopes to manager-assigned follow-ups", async () => {
    const storeResponse = await getFollowUps(request("/api/follow-ups"));
    expect(storeResponse.status).toBe(200);
    const storeRows = await storeResponse.json();
    expect(storeRows).toHaveLength(3);

    const response = await getFollowUps(request("/api/follow-ups?personalScope=true"));
    expect(response.status).toBe(200);

    const rows = await response.json();
    const ids = rows.map((row: { id: string }) => row.id);
    expect(ids).toHaveLength(2);
    expect(ids).toContain(fixtures.managerFollowUpId);
    expect(ids).toContain(fixtures.mismatchedFollowUpId);
    expect(ids).not.toContain(fixtures.rsoFollowUpId);
  });

  it("GET /api/staff/calls uses store scope by default and personal scope when requested", async () => {
    const teamResponse = await getStaffCalls(
      request(
        `/api/staff/calls?year=${fixtures.year}&month=${fixtures.month}&queue=ALL&master=ALL`,
      ),
    );
    expect(teamResponse.status).toBe(200);
    const teamBody = await teamResponse.json();
    const teamIds = teamBody.data.map((item: { recordId: string }) => item.recordId);
    expect(teamIds).toContain(fixtures.rsoVisitId);
    expect(teamIds).toContain(fixtures.managerVisitId);

    const personalResponse = await getStaffCalls(
      request(
        `/api/staff/calls?personalScope=true&year=${fixtures.year}&month=${fixtures.month}&queue=ALL&master=ALL`,
      ),
    );
    expect(personalResponse.status).toBe(200);
    const personalBody = await personalResponse.json();
    const personalIds = personalBody.data.map((item: { recordId: string }) => item.recordId);
    expect(personalIds).toContain(fixtures.managerVisitId);
    expect(personalIds).not.toContain(fixtures.rsoVisitId);
  });

  it("EC-BE-063: GET /api/staff/calls rejects invalid viewStaffId", async () => {
    const response = await getStaffCalls(
      request(
        `/api/staff/calls?viewStaffId=clnonexistentstaff000000000&year=${fixtures.year}&month=${fixtures.month}`,
      ),
    );
    expect(response.status).toBe(400);
  });

  it("POST /api/assignments/bulk reassigns mismatched follow-ups", async () => {
    const response = await postBulkAssign(
      request("/api/assignments/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetStaffId: fixtures.rsoStaffId,
          followUpIds: [fixtures.mismatchedFollowUpId],
        }),
      }),
    );
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.assigned).toBe(1);
    expect(body.skipped).toBe(0);

    const followUp = await prisma.followUp.findUnique({
      where: { id: fixtures.mismatchedFollowUpId },
      include: { visit: { select: { staffId: true } } },
    });
    expect(followUp?.assignedStaffId).toBe(fixtures.rsoStaffId);
    expect(followUp?.visit?.staffId).toBe(fixtures.rsoStaffId);
  });

  it("EC-BE-064: POST /api/assignments/bulk rejects invalid payload", async () => {
    const response = await postBulkAssign(
      request("/api/assignments/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetStaffId: fixtures.rsoStaffId,
          followUpIds: [],
        }),
      }),
    );
    expect(response.status).toBe(400);
  });

  it("denies store manager staff mutations", async () => {
    const createResponse = await postStaff(
      request("/api/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Blocked Staff",
          employeeId: "BLOCK001",
          role: "STAFF",
        }),
      }),
    );
    expect(createResponse.status).toBe(401);

    const patchResponse = await patchStaff(
      request(`/api/staff/${fixtures.rsoStaffId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Renamed" }),
      }),
      { params: Promise.resolve({ id: fixtures.rsoStaffId }) },
    );
    expect(patchResponse.status).toBe(401);
  });
});
