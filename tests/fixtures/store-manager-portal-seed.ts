import { prisma } from "@/lib/db/prisma";
import { visitDenormFields } from "@/lib/services/call-record-denorm";
import { prepareCustomerPii } from "@/lib/services/pii";
import { assertSafeTestDatabase } from "@/tests/helpers/assert-safe-test-database";
import { cleanupStoreFixtureByName } from "@/tests/helpers/scoped-store-cleanup";

const FIXTURE_STORE_NAME = "Manager Portal Test Store";

export interface StoreManagerPortalSeedResult {
  storeId: string;
  managerStaffId: string;
  rsoStaffId: string;
  managerAppUserId: string;
  managerEmail: string;
  mismatchedFollowUpId: string;
  managerFollowUpId: string;
  rsoFollowUpId: string;
  rsoVisitId: string;
  managerVisitId: string;
  year: number;
  month: number;
}

export async function seedStoreManagerPortalFixtures(): Promise<StoreManagerPortalSeedResult> {
  assertSafeTestDatabase();
  await cleanupStoreFixtureByName(FIXTURE_STORE_NAME);

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const visitDate = new Date(year, month - 1, 12, 10, 0, 0);
  const managerEmail = "manager-portal@test.local";

  const store = await prisma.store.create({
    data: {
      name: FIXTURE_STORE_NAME,
      category: "JEWELRY",
      city: "Test City",
      state: "TS",
      businessOwnerName: "Owner",
      businessOwnerEmail: "owner-manager-portal@test.local",
    },
  });

  const rso = await prisma.staff.create({
    data: {
      name: "Portal RSO",
      employeeId: "MPRSO001",
      role: "STAFF",
      storeId: store.id,
    },
  });

  const manager = await prisma.staff.create({
    data: {
      name: "Portal Manager",
      employeeId: "MPMGR001",
      role: "STORE_MANAGER",
      storeId: store.id,
    },
  });

  const appUser = await prisma.appUser.create({
    data: {
      authId: "manager-portal-auth",
      email: managerEmail,
      name: manager.name,
      role: "STORE_MANAGER",
      storeId: store.id,
      staffId: manager.id,
      isActive: true,
      activatedAt: now,
    },
  });

  const pii = prepareCustomerPii("Mismatched Customer", "9812222201");
  const rsoVisit = await prisma.visit.create({
    data: {
      storeId: store.id,
      staffId: rso.id,
      visitDate,
      customerName: pii.name,
      customerPhone: pii.phone,
      customerPhoneHash: pii.phoneHash,
      customerNameSearch: pii.nameSearch,
      phoneLast4: pii.phoneLast4,
      customerType: "NEW",
      visitType: "WALK_IN",
      purchaseStatus: "NOT_PURCHASED",
      productsExplored: ["RINGS"],
      productsPurchased: [],
      sourceChannel: "ORGANIC_WALK_IN",
      followUpNeeded: true,
      followUpDate: visitDate,
      ...visitDenormFields({
        transactionAmount: null,
        budgetStated: "UNDER_15K",
        purchaseStatus: "NOT_PURCHASED",
        dateOfBirth: null,
        anniversary: null,
      }),
    },
  });

  const mismatchedFollowUp = await prisma.followUp.create({
    data: {
      visitId: rsoVisit.id,
      assignedStaffId: manager.id,
      followUpDate: visitDate,
      status: "OPEN",
      reason: "Mismatched assignment test",
    },
  });

  const rsoOnlyPii = prepareCustomerPii("RSO Customer", "9812222203");
  const rsoOnlyVisit = await prisma.visit.create({
    data: {
      storeId: store.id,
      staffId: rso.id,
      visitDate,
      customerName: rsoOnlyPii.name,
      customerPhone: rsoOnlyPii.phone,
      customerPhoneHash: rsoOnlyPii.phoneHash,
      customerNameSearch: rsoOnlyPii.nameSearch,
      phoneLast4: rsoOnlyPii.phoneLast4,
      customerType: "NEW",
      visitType: "WALK_IN",
      purchaseStatus: "NOT_PURCHASED",
      productsExplored: ["EARRINGS"],
      productsPurchased: [],
      sourceChannel: "ORGANIC_WALK_IN",
      followUpNeeded: true,
      followUpDate: visitDate,
      ...visitDenormFields({
        transactionAmount: null,
        budgetStated: "UNDER_15K",
        purchaseStatus: "NOT_PURCHASED",
        dateOfBirth: null,
        anniversary: null,
      }),
    },
  });

  const rsoFollowUp = await prisma.followUp.create({
    data: {
      visitId: rsoOnlyVisit.id,
      assignedStaffId: rso.id,
      followUpDate: visitDate,
      status: "OPEN",
      reason: "RSO aligned follow-up",
    },
  });

  const managerPii = prepareCustomerPii("Manager Customer", "9812222202");
  const managerVisit = await prisma.visit.create({
    data: {
      storeId: store.id,
      staffId: manager.id,
      visitDate,
      customerName: managerPii.name,
      customerPhone: managerPii.phone,
      customerPhoneHash: managerPii.phoneHash,
      customerNameSearch: managerPii.nameSearch,
      phoneLast4: managerPii.phoneLast4,
      customerType: "NEW",
      visitType: "WALK_IN",
      purchaseStatus: "NOT_PURCHASED",
      productsExplored: ["BANGLES"],
      productsPurchased: [],
      sourceChannel: "ORGANIC_WALK_IN",
      followUpNeeded: true,
      followUpDate: visitDate,
      ...visitDenormFields({
        transactionAmount: null,
        budgetStated: "UNDER_15K",
        purchaseStatus: "NOT_PURCHASED",
        dateOfBirth: null,
        anniversary: null,
      }),
    },
  });

  const managerFollowUp = await prisma.followUp.create({
    data: {
      visitId: managerVisit.id,
      assignedStaffId: manager.id,
      followUpDate: visitDate,
      status: "OPEN",
      reason: "Manager personal follow-up",
    },
  });

  return {
    storeId: store.id,
    managerStaffId: manager.id,
    rsoStaffId: rso.id,
    managerAppUserId: appUser.id,
    managerEmail,
    mismatchedFollowUpId: mismatchedFollowUp.id,
    managerFollowUpId: managerFollowUp.id,
    rsoFollowUpId: rsoFollowUp.id,
    rsoVisitId: rsoVisit.id,
    managerVisitId: managerVisit.id,
    year,
    month,
  };
}

export async function disconnectStoreManagerPortalSeed(): Promise<void> {
  await cleanupStoreFixtureByName(FIXTURE_STORE_NAME);
}
