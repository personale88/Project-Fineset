import { prisma } from "@/lib/db/prisma";
import { visitDenormFields, fieldSaleDenormFields } from "@/lib/services/call-record-denorm";
import { prepareCustomerPii } from "@/lib/services/pii";
import { assertSafeTestDatabase } from "@/tests/helpers/assert-safe-test-database";
import { cleanupStoreFixtureByName } from "@/tests/helpers/scoped-store-cleanup";

const FIXTURE_STORE_NAME = "Staff Calls Test Store";

export interface StaffCallsSeedResult {
  storeId: string;
  staffId: string;
  visitRetentionId: string;
  visitNotAnsweredId: string;
  visitFollowUpId: string;
  visitExternalId: string;
  fieldSaleNotAnsweredId: string;
  staffEmail: string;
  year: number;
  month: number;
}

export async function seedStaffCallsFixtures(): Promise<StaffCallsSeedResult> {
  assertSafeTestDatabase();
  await cleanupStoreFixtureByName(FIXTURE_STORE_NAME);

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const visitDate = new Date(year, month - 1, 15, 10, 0, 0);
  const staffEmail = "staff-calls@test.local";

  const store = await prisma.store.create({
    data: {
      name: FIXTURE_STORE_NAME,
      category: "JEWELRY",
      city: "Test City",
      state: "TS",
      businessOwnerName: "Owner",
      businessOwnerEmail: "owner-staff-calls@test.local",
    },
  });

  const staff = await prisma.staff.create({
    data: {
      name: "Calls Test Staff",
      employeeId: "CALLS001",
      role: "STAFF",
      storeId: store.id,
    },
  });

  await prisma.appUser.create({
    data: {
      authId: "staff-calls-auth",
      email: staffEmail,
      name: staff.name,
      role: "STAFF",
      storeId: store.id,
      staffId: staff.id,
      isActive: true,
      activatedAt: now,
    },
  });

  const basePii = prepareCustomerPii("Calls Test Customer", "9811111101");
  const birthdayThisMonth = new Date(year, month - 1, 10);

  const visitRetention = await prisma.visit.create({
    data: {
      storeId: store.id,
      staffId: staff.id,
      visitDate,
      customerName: basePii.name,
      customerPhone: basePii.phone,
      customerPhoneHash: basePii.phoneHash,
      customerNameSearch: basePii.nameSearch,
      phoneLast4: basePii.phoneLast4,
      customerType: "NEW",
      visitType: "WALK_IN",
      purchaseStatus: "NOT_PURCHASED",
      productsExplored: ["RINGS"],
      productsPurchased: [],
      sourceChannel: "ORGANIC_WALK_IN",
      followUpNeeded: false,
      dateOfBirth: birthdayThisMonth,
      ...visitDenormFields({
        transactionAmount: null,
        budgetStated: "UNDER_15K",
        purchaseStatus: "NOT_PURCHASED",
        dateOfBirth: birthdayThisMonth,
        anniversary: null,
      }),
    },
  });

  const visitNotAnswered = await prisma.visit.create({
    data: {
      storeId: store.id,
      staffId: staff.id,
      visitDate,
      customerName: "Not Answered Customer",
      customerPhone: "9811111102",
      customerPhoneHash: prepareCustomerPii("Not Answered Customer", "9811111102").phoneHash,
      customerNameSearch: prepareCustomerPii("Not Answered Customer", "9811111102").nameSearch,
      phoneLast4: "1102",
      customerType: "NEW",
      visitType: "WALK_IN",
      purchaseStatus: "NOT_PURCHASED",
      productsExplored: ["BANGLES"],
      productsPurchased: [],
      sourceChannel: "ORGANIC_WALK_IN",
      followUpNeeded: true,
      lastCallAnswered: "NOT_ANSWERED",
      lastCallAt: visitDate,
      ...visitDenormFields({
        transactionAmount: null,
        budgetStated: null,
        purchaseStatus: "NOT_PURCHASED",
        dateOfBirth: null,
        anniversary: null,
      }),
    },
  });

  await prisma.staffCallLog.create({
    data: {
      visitId: visitNotAnswered.id,
      staffId: staff.id,
      answered: "NOT_ANSWERED",
      feedback: "No answer",
    },
  });

  const visitFollowUp = await prisma.visit.create({
    data: {
      storeId: store.id,
      staffId: staff.id,
      visitDate,
      customerName: "Follow Up Customer",
      customerPhone: "9811111103",
      customerPhoneHash: prepareCustomerPii("Follow Up Customer", "9811111103").phoneHash,
      customerNameSearch: prepareCustomerPii("Follow Up Customer", "9811111103").nameSearch,
      phoneLast4: "1103",
      customerType: "REPEAT",
      visitType: "WALK_IN",
      purchaseStatus: "PURCHASED",
      productsExplored: ["NECKLACE"],
      productsPurchased: ["NECKLACE"],
      transactionAmount: 60_000,
      sourceChannel: "ORGANIC_WALK_IN",
      followUpNeeded: true,
      ...visitDenormFields({
        transactionAmount: 60_000,
        budgetStated: null,
        purchaseStatus: "PURCHASED",
        dateOfBirth: null,
        anniversary: null,
      }),
    },
  });

  await prisma.followUp.create({
    data: {
      visitId: visitFollowUp.id,
      assignedStaffId: staff.id,
      followUpDate: new Date(year, month - 1, 20),
      status: "OPEN",
      reason: "Scheduled follow-up",
    },
  });

  const visitExternal = await prisma.visit.create({
    data: {
      storeId: store.id,
      staffId: staff.id,
      visitDate,
      customerName: "External Customer",
      customerPhone: "9811111104",
      customerPhoneHash: prepareCustomerPii("External Customer", "9811111104").phoneHash,
      customerNameSearch: prepareCustomerPii("External Customer", "9811111104").nameSearch,
      phoneLast4: "1104",
      customerType: "NEW",
      visitType: "WALK_IN",
      purchaseStatus: "NOT_PURCHASED",
      productsExplored: ["CHAINS"],
      productsPurchased: [],
      sourceChannel: "REFERRAL",
      followUpNeeded: false,
      ...visitDenormFields({
        transactionAmount: null,
        budgetStated: null,
        purchaseStatus: "NOT_PURCHASED",
        dateOfBirth: null,
        anniversary: null,
      }),
    },
  });

  const fieldSaleNotAnswered = await prisma.fieldSale.create({
    data: {
      storeId: store.id,
      staffId: staff.id,
      activityDate: visitDate,
      customerName: "Field Sale Customer",
      customerPhone: "9811111105",
      customerPhoneHash: prepareCustomerPii("Field Sale Customer", "9811111105").phoneHash,
      customerNameSearch: prepareCustomerPii("Field Sale Customer", "9811111105").nameSearch,
      phoneLast4: "1105",
      customerType: "NEW",
      activityType: "DOOR_TO_DOOR",
      followUpNeeded: false,
      lastCallAnswered: "NOT_ANSWERED",
      lastCallAt: visitDate,
      monthlyCommitment: 20_000,
      ...fieldSaleDenormFields({
        monthlyCommitment: 20_000,
        dateOfBirth: null,
        anniversary: null,
      }),
    },
  });

  await prisma.staffCallLog.create({
    data: {
      fieldSaleId: fieldSaleNotAnswered.id,
      staffId: staff.id,
      answered: "NOT_ANSWERED",
    },
  });

  return {
    storeId: store.id,
    staffId: staff.id,
    visitRetentionId: visitRetention.id,
    visitNotAnsweredId: visitNotAnswered.id,
    visitFollowUpId: visitFollowUp.id,
    visitExternalId: visitExternal.id,
    fieldSaleNotAnsweredId: fieldSaleNotAnswered.id,
    staffEmail,
    year,
    month,
  };
}

export async function disconnectStaffCallsSeed(): Promise<void> {
  await cleanupStoreFixtureByName(FIXTURE_STORE_NAME);
}
