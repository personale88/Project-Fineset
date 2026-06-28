import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/db/prisma";
import { updateStaff } from "@/lib/services/staff";
import { deleteAllSessionsForUser } from "@/lib/auth/session-store";

const hasDb = Boolean(process.env.DATABASE_URL);

vi.mock("@/lib/auth/session-store", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth/session-store")>();
  return {
    ...actual,
    deleteAllSessionsForUser: vi.fn(async () => undefined),
  };
});

describe.skipIf(!hasDb)("staff deactivation integration", () => {
  let storeId: string;
  let staffId: string;
  let appUserId: string;

  beforeAll(async () => {
    const store = await prisma.store.create({
      data: {
        name: "Deactivation Test Store",
        city: "Mumbai",
        state: "MH",
      },
    });
    storeId = store.id;

    const staff = await prisma.staff.create({
      data: {
        name: "Deactivate Me",
        employeeId: `DEACT${Date.now()}`,
        storeId,
        role: "STAFF",
        isActive: true,
      },
    });
    staffId = staff.id;

    const appUser = await prisma.appUser.create({
      data: {
        email: `deact-${Date.now()}@test.local`,
        name: staff.name,
        role: "STAFF",
        storeId,
        staffId,
        isActive: true,
      },
    });
    appUserId = appUser.id;
  }, 60_000);

  afterAll(async () => {
    await prisma.appUser.deleteMany({ where: { id: appUserId } }).catch(() => undefined);
    await prisma.staff.deleteMany({ where: { id: staffId } }).catch(() => undefined);
    await prisma.store.deleteMany({ where: { id: storeId } }).catch(() => undefined);
    await prisma.$disconnect();
  });

  it("EC-BE-065: syncs AppUser deactivation and clears sessions when staff is deactivated", async () => {
    await updateStaff(staffId, storeId, { isActive: false });

    const appUser = await prisma.appUser.findUnique({ where: { id: appUserId } });
    const staff = await prisma.staff.findUnique({ where: { id: staffId } });

    expect(appUser?.isActive).toBe(false);
    expect(staff?.isActive).toBe(false);
    expect(deleteAllSessionsForUser).toHaveBeenCalledWith(appUserId);
  });
});
