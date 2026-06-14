import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import {
  disconnectStaffCallsSeed,
  seedStaffCallsFixtures,
} from "@/tests/fixtures/staff-calls-seed";
import * as sessionModule from "@/lib/auth/get-app-session";
import { createVisit } from "@/lib/services/visits";
import {
  listStaffCalls,
  recordStaffCallOutcome,
  revealStaffCallPhone,
} from "@/lib/services/staff-calls";
import { prisma } from "@/lib/db/prisma";
import { GET as getStaffCalls } from "@/app/api/staff/calls/route";
import {
  GET as getStaffCallRecord,
  POST as postStaffCallRecord,
} from "@/app/api/staff/calls/[visitId]/route";
import type { StaffSession } from "@/types";

const hasDb = Boolean(process.env.DATABASE_URL);

function request(url: string, init?: ConstructorParameters<typeof NextRequest>[1]): NextRequest {
  return new NextRequest(new URL(url, "http://localhost:3000"), init);
}

describe.skipIf(!hasDb)("staff calls integration", () => {
  let fixtures: Awaited<ReturnType<typeof seedStaffCallsFixtures>>;
  let staffSession: StaffSession;

  beforeAll(async () => {
    fixtures = await seedStaffCallsFixtures();
    staffSession = {
      role: "STAFF",
      userId: "staff-calls-auth",
      email: fixtures.staffEmail,
      staffId: fixtures.staffId,
      storeId: fixtures.storeId,
      name: "Calls Test Staff",
      employeeId: "CALLS001",
    };
  }, 60_000);

  afterAll(async () => {
    vi.restoreAllMocks();
    await disconnectStaffCallsSeed();
  });

  beforeEach(() => {
    vi.spyOn(sessionModule, "getAppSession").mockImplementation(async () => staffSession);
  });

  it("lists NOT_ANSWERED queue from denormalized fields", async () => {
    const result = await listStaffCalls({
      staffId: fixtures.staffId,
      storeId: fixtures.storeId,
      master: "ALL",
      segment: "ALL",
      valueTier: "ALL",
      queue: "NOT_ANSWERED",
      birthday: "ALL",
      anniversary: "ALL",
      year: fixtures.year,
      month: fixtures.month,
      page: 1,
      pageSize: 15,
    });

    const ids = result.data.map((item) => item.recordId);
    expect(ids).toContain(fixtures.visitNotAnsweredId);
    expect(ids).toContain(fixtures.fieldSaleNotAnsweredId);
    expect(ids).not.toContain(fixtures.visitRetentionId);
  });

  it("lists FOLLOW_UP queue from open follow-ups", async () => {
    const result = await listStaffCalls({
      staffId: fixtures.staffId,
      storeId: fixtures.storeId,
      master: "ALL",
      segment: "ALL",
      valueTier: "ALL",
      queue: "FOLLOW_UP",
      birthday: "ALL",
      anniversary: "ALL",
      year: fixtures.year,
      month: fixtures.month,
      page: 1,
      pageSize: 15,
    });

    expect(result.data.some((item) => item.recordId === fixtures.visitFollowUpId)).toBe(true);
  });

  it("filters EXTERNAL master source in DB", async () => {
    const result = await listStaffCalls({
      staffId: fixtures.staffId,
      storeId: fixtures.storeId,
      master: "EXTERNAL",
      segment: "ALL",
      valueTier: "ALL",
      queue: "ALL",
      birthday: "ALL",
      anniversary: "ALL",
      year: fixtures.year,
      month: fixtures.month,
      page: 1,
      pageSize: 15,
    });

    expect(result.data).toHaveLength(1);
    expect(result.data[0]?.recordId).toBe(fixtures.visitExternalId);
  });

  it("reveals phone for a store visit", async () => {
    const result = await revealStaffCallPhone({
      recordId: fixtures.visitRetentionId,
      masterSource: "STORE_VISIT",
      staffId: fixtures.staffId,
      storeId: fixtures.storeId,
    });

    expect(result?.phone).toBe("9811111101");
  });

  it("records NOT_ANSWERED outcome and updates denormalized fields", async () => {
    const result = await recordStaffCallOutcome({
      recordId: fixtures.visitRetentionId,
      masterSource: "STORE_VISIT",
      staffId: fixtures.staffId,
      storeId: fixtures.storeId,
      answered: "NOT_ANSWERED",
      scheduleFollowUp: false,
    });

    expect(result?.queue).toBe("NOT_ANSWERED");

    const listed = await listStaffCalls({
      staffId: fixtures.staffId,
      storeId: fixtures.storeId,
      master: "ALL",
      segment: "ALL",
      valueTier: "ALL",
      queue: "NOT_ANSWERED",
      birthday: "ALL",
      anniversary: "ALL",
      year: fixtures.year,
      month: fixtures.month,
      page: 1,
      pageSize: 15,
    });

    expect(listed.data.some((item) => item.recordId === fixtures.visitRetentionId)).toBe(true);
  });

  it("filters HIGH value tier from denormalized fields", async () => {
    const result = await listStaffCalls({
      staffId: fixtures.staffId,
      storeId: fixtures.storeId,
      master: "ALL",
      segment: "ALL",
      valueTier: "HIGH",
      queue: "ALL",
      birthday: "ALL",
      anniversary: "ALL",
      year: fixtures.year,
      month: fixtures.month,
      page: 1,
      pageSize: 15,
    });

    expect(result.data).toHaveLength(1);
    expect(result.data[0]?.recordId).toBe(fixtures.visitFollowUpId);
    expect(result.data[0]?.valueTier).toBe("HIGH");
  });

  it("filters birthday THIS_MONTH from denormalized birthMonth", async () => {
    const result = await listStaffCalls({
      staffId: fixtures.staffId,
      storeId: fixtures.storeId,
      master: "ALL",
      segment: "ALL",
      valueTier: "ALL",
      queue: "ALL",
      birthday: "THIS_MONTH",
      anniversary: "ALL",
      year: fixtures.year,
      month: fixtures.month,
      page: 1,
      pageSize: 15,
    });

    expect(result.data.some((item) => item.recordId === fixtures.visitRetentionId)).toBe(true);
    expect(result.data.every((item) => item.recordId !== fixtures.visitExternalId)).toBe(true);
  });

  it("paginates merged visit and field sale records", async () => {
    const page1 = await listStaffCalls({
      staffId: fixtures.staffId,
      storeId: fixtures.storeId,
      master: "ALL",
      segment: "ALL",
      valueTier: "ALL",
      queue: "ALL",
      birthday: "ALL",
      anniversary: "ALL",
      year: fixtures.year,
      month: fixtures.month,
      page: 1,
      pageSize: 2,
    });

    const page2 = await listStaffCalls({
      staffId: fixtures.staffId,
      storeId: fixtures.storeId,
      master: "ALL",
      segment: "ALL",
      valueTier: "ALL",
      queue: "ALL",
      birthday: "ALL",
      anniversary: "ALL",
      year: fixtures.year,
      month: fixtures.month,
      page: 2,
      pageSize: 2,
    });

    expect(page1.total).toBeGreaterThanOrEqual(5);
    expect(page1.data).toHaveLength(2);
    expect(page2.data.length).toBeGreaterThanOrEqual(1);
    expect(page1.data[0]?.recordId).not.toBe(page2.data[0]?.recordId);
  });

  it("sets denormalized fields when creating a visit", async () => {
    const visit = await createVisit({
      storeId: fixtures.storeId,
      staffId: fixtures.staffId,
      customerName: "Denorm Create Customer",
      customerPhone: "9811111199",
      customerType: "NEW",
      visitType: "WALK_IN",
      purchaseStatus: "PURCHASED",
      transactionAmount: 55_000,
      productsExplored: ["FINGER_RINGS"],
      productsPurchased: ["FINGER_RINGS"],
      schemesPitched: ["NONE"],
      sourceChannel: "ORGANIC_WALK_IN",
      dateOfBirth: new Date(fixtures.year, fixtures.month - 1, 5),
      followUpNeeded: false,
      marketingOptIn: false,
    });

    const stored = await prisma.visit.findUnique({
      where: { id: visit.id },
      select: { callValueTier: true, birthMonth: true, anniversaryMonth: true },
    });

    expect(stored?.callValueTier).toBe("HIGH");
    expect(stored?.birthMonth).toBe(fixtures.month);
  });

  it("GET /api/staff/calls returns filtered list", async () => {
    const response = await getStaffCalls(
      request(
        `/api/staff/calls?year=${fixtures.year}&month=${fixtures.month}&queue=NOT_ANSWERED`,
      ),
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.total).toBeGreaterThanOrEqual(2);
  });

  it("GET /api/staff/calls/[id] reveals phone", async () => {
    const response = await getStaffCallRecord(
      request(
        `/api/staff/calls/${fixtures.visitRetentionId}?masterSource=STORE_VISIT`,
      ),
      { params: Promise.resolve({ visitId: fixtures.visitRetentionId }) },
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.phone).toBeTruthy();
  });

  it("POST /api/staff/calls/[id] saves outcome", async () => {
    const response = await postStaffCallRecord(
      request(`/api/staff/calls/${fixtures.visitExternalId}?masterSource=EXTERNAL`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answered: "ANSWERED", scheduleFollowUp: false }),
      }),
      { params: Promise.resolve({ visitId: fixtures.visitExternalId }) },
    );
    expect(response.status).toBe(200);
  });
});
