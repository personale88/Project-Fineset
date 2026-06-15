import { prisma } from "@/lib/db/prisma";
import { prepareCustomerPii } from "@/lib/services/pii";

export interface PerfSeedResult {
  storeId: string;
  staffId: string;
  managerEmail: string;
}

/** Minimal dataset for performance integration tests. */
export async function seedPerfFixtures(): Promise<PerfSeedResult> {
  await prisma.authAuditLog.deleteMany();
  await prisma.appUser.deleteMany();
  await prisma.followUp.deleteMany();
  await prisma.staffCallLog.deleteMany();
  await prisma.fieldSale.deleteMany();
  await prisma.visit.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.staff.deleteMany();
  await prisma.importHistory.deleteMany();
  await prisma.store.deleteMany();

  const managerEmail = "perf-manager@test.local";

  const store = await prisma.store.create({
    data: {
      name: "Perf Test Store",
      category: "JEWELRY",
      city: "Test City",
      state: "TS",
      businessOwnerName: "Perf Manager",
      businessOwnerEmail: managerEmail,
    },
  });
  await prisma.appUser.create({
    data: {
      authId: "perf-manager-auth",
      email: managerEmail,
      name: "Perf Manager",
      role: "BUSINESS_OWNER",
      storeId: store.id,
    },
  });

  const staff = await prisma.staff.create({
    data: {
      name: "Perf Staff",
      employeeId: "PERF001",
      role: "STAFF",
      storeId: store.id,
    },
  });

  const pii = prepareCustomerPii("Perf Customer", "9810009999");
  const { customerNameSearch: _visitNameSearch, ...customerPii } = pii;
  const customer = await prisma.customer.create({
    data: { ...customerPii, storeId: store.id },
  });

  const now = new Date();
  await prisma.fieldSale.create({
    data: {
      storeId: store.id,
      staffId: staff.id,
      customerId: customer.id,
      activityDate: now,
      startTime: now,
      customerName: pii.name,
      customerPhone: pii.phone,
      customerPhoneHash: pii.phoneHash,
      customerNameSearch: pii.nameSearch,
      phoneLast4: pii.phoneLast4,
      customerType: "NEW",
      activityType: "DOOR_TO_DOOR",
      enrollmentOutcome: null,
      followUpNeeded: false,
    },
  });

  await prisma.visit.createMany({
    data: Array.from({ length: 25 }, (_, index) => ({
      storeId: store.id,
      staffId: staff.id,
      customerId: customer.id,
      visitDate: new Date(now.getFullYear(), now.getMonth(), index + 1, 10, 0, 0),
      customerName: pii.name,
      customerPhone: pii.phone,
      customerPhoneHash: pii.phoneHash,
      customerNameSearch: pii.nameSearch,
      phoneLast4: pii.phoneLast4,
      productsPurchased: [],
      productsExplored: [],
      purchaseStatus: index % 3 === 0 ? "PURCHASED" : "NOT_PURCHASED",
      transactionAmount: index % 3 === 0 ? 10_000 : null,
      customerType: "NEW",
      visitType: "WALK_IN",
      sourceChannel: "ORGANIC_WALK_IN",
      followUpNeeded: false,
    })),
  });

  return {
    storeId: store.id,
    staffId: staff.id,
    managerEmail,
  };
}

export async function disconnectPerfSeed(): Promise<void> {
  // Uses the shared Prisma singleton; avoid disconnecting between integration suites.
}
