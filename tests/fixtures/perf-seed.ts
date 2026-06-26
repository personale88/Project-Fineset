import { prisma } from "@/lib/db/prisma";
import { prepareCustomerPii } from "@/lib/services/pii";
import { assertSafeTestDatabase } from "@/tests/helpers/assert-safe-test-database";
import { cleanupStoreFixtureByName } from "@/tests/helpers/scoped-store-cleanup";

const FIXTURE_STORE_NAME = "Perf Test Store";

export interface PerfSeedResult {
  storeId: string;
  staffId: string;
  managerEmail: string;
}

/** Minimal dataset for performance integration tests. */
export async function seedPerfFixtures(): Promise<PerfSeedResult> {
  assertSafeTestDatabase();
  await cleanupStoreFixtureByName(FIXTURE_STORE_NAME);

  const managerEmail = "perf-manager@test.local";

  const store = await prisma.store.create({
    data: {
      name: FIXTURE_STORE_NAME,
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
  await cleanupStoreFixtureByName(FIXTURE_STORE_NAME);
}
