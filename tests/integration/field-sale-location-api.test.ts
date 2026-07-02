import { afterEach, describe, expect, it, vi } from "vitest";
import { POST as postFieldSale } from "@/app/api/field-sales/route";
import { DEFAULT_PLATFORM_SETTINGS } from "@/lib/platform/default-settings";
import * as sessionModule from "@/lib/auth/session";
import * as resolveStaffModule from "@/lib/auth/resolve-staff";
import * as platformSettingsModule from "@/lib/services/platform-settings";
import * as fieldSalesModule from "@/lib/services/field-sales";
import { prisma } from "@/lib/db/prisma";

const basePayload = {
  customerName: "GPS Test Customer",
  customerPhone: "9876543210",
  customerType: "NEW" as const,
  activityType: "DOOR_TO_DOOR" as const,
  schemesPitched: [] as const,
  followUpNeeded: false,
};

const staffContext = {
  staffId: "staff-gps-test",
  storeId: "store-gps-test",
};

const staffSession = {
  role: "STAFF" as const,
  userId: "user-gps-test",
  email: "gps-test@example.com",
  staffId: staffContext.staffId,
  storeId: staffContext.storeId,
  name: "GPS Test Staff",
  employeeId: "GPS001",
};

function postRequest(body: Record<string, unknown>) {
  return new Request("http://localhost:3000/api/field-sales", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-forwarded-for": "203.0.113.42",
      "user-agent": "vitest-field-sale-location",
    },
    body: JSON.stringify(body),
  });
}

describe("POST /api/field-sales location capture", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  function mockHappyPath() {
    vi.spyOn(sessionModule, "getServerSession").mockResolvedValue(staffSession);
    vi.spyOn(resolveStaffModule, "requirePortalActorContext").mockResolvedValue(staffContext);
    vi.spyOn(platformSettingsModule, "getPlatformSettings").mockResolvedValue(
      DEFAULT_PLATFORM_SETTINGS,
    );
    vi.spyOn(prisma.store, "findUnique").mockResolvedValue({
      latitude: 12.9716,
      longitude: 77.5946,
      geofenceRadiusMeters: 500,
    } as never);
    vi.spyOn(fieldSalesModule, "createFieldSale").mockResolvedValue({
      id: "field-sale-gps-1",
    } as never);
  }

  it("rejects POST without GPS when required", async () => {
    mockHappyPath();

    const response = await postFieldSale(postRequest(basePayload));
    const body = await response.json();

    expect(response.status).toBe(422);
    expect(body.code).toBe("location_required");
    expect(fieldSalesModule.createFieldSale).not.toHaveBeenCalled();
  });

  it("accepts coarse GPS and stores POOR_ACCURACY evidence", async () => {
    mockHappyPath();

    const response = await postFieldSale(
      postRequest({
        ...basePayload,
        locationCapture: {
          latitude: 12.9716,
          longitude: 77.5946,
          accuracyMeters: 120,
          capturedAt: new Date().toISOString(),
          status: "POOR_ACCURACY",
        },
      }),
    );

    expect(response.status).toBe(201);
    expect(fieldSalesModule.createFieldSale).toHaveBeenCalledWith(
      expect.objectContaining({
        locationEvidence: expect.objectContaining({
          locationStatus: "POOR_ACCURACY",
          submissionLatitude: 12.9716,
          locationAccuracyMeters: 120,
        }),
      }),
    );
  });

  it("rejects stale capturedAt timestamps", async () => {
    mockHappyPath();
    const stale = new Date(Date.now() - 5 * 60 * 1000);

    const response = await postFieldSale(
      postRequest({
        ...basePayload,
        locationCapture: {
          latitude: 12.9716,
          longitude: 77.5946,
          accuracyMeters: 12,
          capturedAt: stale.toISOString(),
          status: "DETECTED",
        },
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(422);
    expect(body.code).toBe("location_stale");
    expect(fieldSalesModule.createFieldSale).not.toHaveBeenCalled();
  });

  it("accepts valid capture and persists field sale", async () => {
    mockHappyPath();

    const response = await postFieldSale(
      postRequest({
        ...basePayload,
        locationCapture: {
          latitude: 12.9716,
          longitude: 77.5946,
          accuracyMeters: 12,
          capturedAt: new Date().toISOString(),
          status: "DETECTED",
        },
      }),
    );

    expect(response.status).toBe(201);
    expect(fieldSalesModule.createFieldSale).toHaveBeenCalledWith(
      expect.objectContaining({
        storeId: staffContext.storeId,
        staffId: staffContext.staffId,
        locationEvidence: expect.objectContaining({
          locationStatus: "DETECTED",
          submissionLatitude: 12.9716,
          submissionLongitude: 77.5946,
          submissionIp: "203.0.113.42",
        }),
      }),
    );
  });
});
