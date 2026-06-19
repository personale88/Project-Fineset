/**
 * Multi-store dev data for business owner dashboard (portfolio + notifications carousel).
 *
 * Links Store Alpha–Delta to manager@store-alpha.local and seeds visits, follow-ups,
 * and call-queue records per store.
 *
 * Usage: npm run db:seed:business-owner
 * Prereq: npm run db:seed (recommended) && npm run auth:bootstrap-dev
 */
import { PrismaClient } from "@prisma/client";
import { fieldSaleDenormFields, visitDenormFields } from "../lib/services/call-record-denorm";
import { prepareCustomerPii } from "../lib/services/pii";

const prisma = new PrismaClient();

const OWNER_EMAIL = "manager@store-alpha.local";
const OWNER_NAME = "Store Alpha Owner";

const DEV_STORES = [
  {
    name: "Store Alpha",
    category: "JEWELRY" as const,
    city: "Hyderabad",
    state: "Telangana",
    pincode: "500032",
    code: "01",
  },
  {
    name: "Store Beta",
    category: "HANDBAGS" as const,
    city: "Bengaluru",
    state: "Karnataka",
    pincode: "560001",
    code: "02",
  },
  {
    name: "Store Gamma",
    category: "WATCHES" as const,
    city: "Chennai",
    state: "Tamil Nadu",
    pincode: "600001",
    code: "03",
  },
  {
    name: "Store Delta",
    category: "OTHER" as const,
    customCategory: "Luxury Accessories",
    city: "Mumbai",
    state: "Maharashtra",
    pincode: "400001",
    code: "04",
  },
];

const STAFF_NAMES_BY_STORE: Record<string, string[]> = {
  "Store Alpha": ["Vamsi", "Mohan", "Bhargavi", "Sailaja"],
  "Store Beta": ["Priya", "Karthik", "Divya"],
  "Store Gamma": ["Arjun", "Lakshmi", "Naveen"],
  "Store Delta": ["Ravi", "Anitha", "Suresh"],
};

function daysAgo(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
}

function daysFromNow(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
}

function dayInCurrentMonth(day: number, hour = 11, minute = 0): Date {
  const now = new Date();
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const safeDay = Math.min(Math.max(day, 1), lastDay);
  return new Date(now.getFullYear(), now.getMonth(), safeDay, hour, minute, 0, 0);
}

function pastDayInCurrentMonth(daysBeforeToday: number): number {
  return Math.max(1, new Date().getDate() - daysBeforeToday);
}

function visitTime(hours: number, minutes: number, base = new Date()): Date {
  const date = new Date(base);
  date.setHours(hours, minutes, 0, 0);
  return date;
}

function customerPhone(storeCode: string, index: number): string {
  return `98120${storeCode}${String(index).padStart(3, "0")}`;
}

async function upsertDevStore(spec: (typeof DEV_STORES)[number]) {
  const existing = await prisma.store.findFirst({
    where: { name: { equals: spec.name, mode: "insensitive" } },
  });

  const data = {
    name: spec.name,
    category: spec.category,
    customCategory: "customCategory" in spec ? spec.customCategory : null,
    city: spec.city,
    state: spec.state,
    pincode: spec.pincode,
    businessOwnerName: OWNER_NAME,
    businessOwnerEmail: OWNER_EMAIL,
    isActive: true,
  };

  if (existing) {
    return prisma.store.update({ where: { id: existing.id }, data });
  }

  return prisma.store.create({ data });
}

async function ensureStaffMember(storeId: string, storeName: string, name: string, index: number) {
  const slug = storeName.replace(/\s+/g, "").toUpperCase().slice(0, 6);
  const employeeId = `EMP-${slug}-${String(index + 1).padStart(2, "0")}`;

  const byEmployeeId = await prisma.staff.findUnique({ where: { employeeId } });
  if (byEmployeeId) {
    if (byEmployeeId.storeId !== storeId) {
      throw new Error(`${employeeId} belongs to another store`);
    }
    return byEmployeeId;
  }

  const byName = await prisma.staff.findFirst({
    where: {
      storeId,
      name: { equals: name, mode: "insensitive" },
    },
  });
  if (byName) return byName;

  return prisma.staff.create({
    data: {
      name,
      employeeId,
      storeId,
      role: "STAFF",
      isActive: true,
    },
  });
}

async function ensureStoreManager(storeId: string, storeName: string) {
  const employeeId = `MGR-${storeName.replace(/\s+/g, "").toUpperCase().slice(0, 6)}`;
  const existing = await prisma.staff.findUnique({ where: { employeeId } });
  if (existing) return existing;

  return prisma.staff.create({
    data: {
      name: `${storeName} Manager`,
      employeeId,
      storeId,
      role: "STORE_MANAGER",
      isActive: true,
    },
  });
}

async function visitExists(storeId: string, phone: string): Promise<boolean> {
  const pii = prepareCustomerPii("Seed Customer", phone);
  const found = await prisma.visit.findFirst({
    where: {
      storeId,
      customerPhoneHash: pii.phoneHash,
    },
    select: { id: true },
  });
  return Boolean(found);
}

interface SeedVisitSpec {
  storeCode: string;
  index: number;
  customerName: string;
  staffId: string;
  storeId: string;
  visitDate: Date;
  scenario:
    | "overdue_follow_up"
    | "due_today_follow_up"
    | "not_answered"
    | "follow_up_queue"
    | "birthday_month"
    | "anniversary_month"
    | "purchased";
}

async function seedVisit(spec: SeedVisitSpec) {
  const phone = customerPhone(spec.storeCode, spec.index);
  if (await visitExists(spec.storeId, phone)) {
    return null;
  }

  const pii = prepareCustomerPii(spec.customerName, phone);
  const now = new Date();
  const birthday =
    spec.scenario === "birthday_month"
      ? new Date(
          Date.UTC(now.getFullYear() - 35, now.getMonth(), pastDayInCurrentMonth(5)),
        )
      : null;
  const anniversary =
    spec.scenario === "anniversary_month"
      ? new Date(
          Date.UTC(now.getFullYear() - 8, now.getMonth(), pastDayInCurrentMonth(3)),
        )
      : null;

  const baseVisit = {
    storeId: spec.storeId,
    staffId: spec.staffId,
    customerName: pii.name,
    customerPhone: pii.phone,
    customerPhoneHash: pii.phoneHash,
    visitDate: spec.visitDate,
    inTime: visitTime(11, 0, spec.visitDate),
    outTime: visitTime(11, 45, spec.visitDate),
    durationMins: 45,
    customerType: "NEW" as const,
    visitType: "WALK_IN" as const,
    purchaseStatus: spec.scenario === "purchased" ? ("PURCHASED" as const) : ("NOT_PURCHASED" as const),
    productsExplored: ["NECKLACE", "EAR_RINGS"],
    productsPurchased: spec.scenario === "purchased" ? ["NECKLACE"] : [],
    transactionAmount: spec.scenario === "purchased" ? 85000 : null,
    intentTier: "WARM" as const,
    reasonNoPurchase: spec.scenario === "purchased" ? null : ("EXPLORING" as const),
    budgetStated: "K15_50K" as const,
    sourceChannel: "ORGANIC_WALK_IN" as const,
    area: "Central",
    dateOfBirth: birthday,
    anniversary,
    ...visitDenormFields({
      transactionAmount: spec.scenario === "purchased" ? 85000 : null,
      budgetStated: "K15_50K",
      purchaseStatus: spec.scenario === "purchased" ? "PURCHASED" : "NOT_PURCHASED",
      dateOfBirth: birthday,
      anniversary,
    }),
  };

  if (spec.scenario === "not_answered") {
    const visit = await prisma.visit.create({
      data: {
        ...baseVisit,
        lastCallAnswered: "NOT_ANSWERED",
        lastCallAt: visitTime(17, 0, spec.visitDate),
      },
    });
    await prisma.staffCallLog.create({
      data: {
        visitId: visit.id,
        staffId: spec.staffId,
        answered: "NOT_ANSWERED",
        feedback: "No answer after two rings",
      },
    });
    return visit;
  }

  if (spec.scenario === "overdue_follow_up") {
    const visit = await prisma.visit.create({
      data: {
        ...baseVisit,
        followUpNeeded: true,
        followUpDate: daysAgo(2),
      },
    });
    await prisma.followUp.create({
      data: {
        visitId: visit.id,
        assignedStaffId: spec.staffId,
        followUpDate: daysAgo(2),
        reason: "Overdue callback",
        status: "OPEN",
      },
    });
    return visit;
  }

  if (spec.scenario === "due_today_follow_up") {
    const dueDate = new Date();
    dueDate.setHours(12, 0, 0, 0);
    const visit = await prisma.visit.create({
      data: {
        ...baseVisit,
        followUpNeeded: true,
        followUpDate: dueDate,
      },
    });
    await prisma.followUp.create({
      data: {
        visitId: visit.id,
        assignedStaffId: spec.staffId,
        followUpDate: dueDate,
        reason: "Follow-up due today",
        status: "OPEN",
      },
    });
    return visit;
  }

  if (spec.scenario === "follow_up_queue") {
    const visit = await prisma.visit.create({
      data: {
        ...baseVisit,
        followUpNeeded: true,
        followUpDate: daysFromNow(4),
        lastCallAnswered: "ANSWERED",
        lastCallAt: visitTime(16, 0, spec.visitDate),
      },
    });
    await prisma.followUp.create({
      data: {
        visitId: visit.id,
        assignedStaffId: spec.staffId,
        followUpDate: daysFromNow(4),
        reason: "Open follow-up call queue",
        status: "OPEN",
      },
    });
    await prisma.staffCallLog.create({
      data: {
        visitId: visit.id,
        staffId: spec.staffId,
        answered: "ANSWERED",
        feedback: "Asked to call back next week",
      },
    });
    return visit;
  }

  return prisma.visit.create({ data: baseVisit });
}

async function seedStoreActivity(
  store: Awaited<ReturnType<typeof upsertDevStore>>,
  storeCode: string,
) {
  const staffNames = STAFF_NAMES_BY_STORE[store.name] ?? ["Staff One", "Staff Two"];
  const staff = [];
  for (let i = 0; i < staffNames.length; i += 1) {
    staff.push(await ensureStaffMember(store.id, store.name, staffNames[i], i));
  }
  await ensureStoreManager(store.id, store.name);

  const scenarios: Array<{
    scenario: SeedVisitSpec["scenario"];
    index: number;
    customerName: string;
    staffIndex: number;
    day: number;
  }> = [
    {
      scenario: "overdue_follow_up",
      index: 1,
      customerName: `${store.name} Overdue Customer`,
      staffIndex: 0,
      day: 3,
    },
    {
      scenario: "due_today_follow_up",
      index: 2,
      customerName: `${store.name} Due Today Customer`,
      staffIndex: 1 % staff.length,
      day: 6,
    },
    {
      scenario: "not_answered",
      index: 3,
      customerName: `${store.name} Missed Call Customer`,
      staffIndex: 0,
      day: 8,
    },
    {
      scenario: "follow_up_queue",
      index: 4,
      customerName: `${store.name} Follow-up Queue Customer`,
      staffIndex: 2 % staff.length,
      day: 10,
    },
    {
      scenario: "birthday_month",
      index: 5,
      customerName: `${store.name} Birthday Customer`,
      staffIndex: 1 % staff.length,
      day: 12,
    },
    {
      scenario: "anniversary_month",
      index: 6,
      customerName: `${store.name} Anniversary Customer`,
      staffIndex: 0,
      day: 14,
    },
    {
      scenario: "purchased",
      index: 7,
      customerName: `${store.name} Purchased Customer`,
      staffIndex: 0,
      day: 16,
    },
  ];

  let created = 0;
  for (const item of scenarios) {
    const visit = await seedVisit({
      storeCode,
      index: item.index,
      customerName: item.customerName,
      staffId: staff[item.staffIndex].id,
      storeId: store.id,
      visitDate: dayInCurrentMonth(item.day),
      scenario: item.scenario,
    });
    if (visit) created += 1;
  }

  if (store.name !== "Store Alpha") {
    const pii = prepareCustomerPii(
      `${store.name} Field Sale Lead`,
      customerPhone(storeCode, 8),
    );
    const existingFieldSale = await prisma.fieldSale.findFirst({
      where: { storeId: store.id, customerPhoneHash: pii.phoneHash },
      select: { id: true },
    });
    if (!existingFieldSale) {
      const fieldSale = await prisma.fieldSale.create({
        data: {
          storeId: store.id,
          staffId: staff[0].id,
          customerName: pii.name,
          customerPhone: pii.phone,
          customerPhoneHash: pii.phoneHash,
          activityDate: dayInCurrentMonth(18),
          startTime: visitTime(10, 0, dayInCurrentMonth(18)),
          endTime: visitTime(10, 30, dayInCurrentMonth(18)),
          durationMins: 30,
          customerType: "NEW",
          area: store.city,
          gender: "FEMALE",
          ageGroup: "26-35",
          activityType: "HOUSING_SOCIETY",
          locationLabel: `${store.city} society visit`,
          schemesPitched: ["GHS"],
          enrollmentOutcome: "INTERESTED",
          intentTier: "WARM",
          followUpNeeded: true,
          followUpDate: daysAgo(1),
          ...fieldSaleDenormFields({
            monthlyCommitment: null,
            dateOfBirth: new Date(
              Date.UTC(new Date().getFullYear() - 30, new Date().getMonth(), pastDayInCurrentMonth(6)),
            ),
            anniversary: null,
          }),
        },
      });
      await prisma.followUp.create({
        data: {
          fieldSaleId: fieldSale.id,
          assignedStaffId: staff[0].id,
          followUpDate: daysAgo(1),
          reason: "Field sale follow-up overdue",
          status: "OPEN",
        },
      });
      created += 1;
    }
  }

  return { staffCount: staff.length, visitsCreated: created };
}

async function linkBusinessOwner(primaryStoreId: string) {
  await prisma.appUser.upsert({
    where: { email: OWNER_EMAIL.toLowerCase() },
    create: {
      authId: `dev-${OWNER_EMAIL.toLowerCase()}`,
      email: OWNER_EMAIL.toLowerCase(),
      name: OWNER_NAME,
      role: "BUSINESS_OWNER",
      storeId: primaryStoreId,
      isActive: true,
      activatedAt: new Date(),
    },
    update: {
      name: OWNER_NAME,
      role: "BUSINESS_OWNER",
      storeId: primaryStoreId,
      isActive: true,
      activatedAt: new Date(),
    },
  });
  console.log(`✓ Upserted AppUser for ${OWNER_EMAIL}`);
}

async function main() {
  console.log(`Seeding business-owner multi-store data for ${OWNER_EMAIL}...\n`);

  const upsertedStores = [];
  for (const spec of DEV_STORES) {
    const store = await upsertDevStore(spec);
    const activity = await seedStoreActivity(store, spec.code);
    upsertedStores.push({ store, activity });
    console.log(
      `✓ ${store.name} (${store.city}) — ${activity.staffCount} staff, ${activity.visitsCreated} new records`,
    );
  }

  const alpha = upsertedStores.find((entry) => entry.store.name === "Store Alpha")?.store;
  if (alpha) {
    await linkBusinessOwner(alpha.id);
    console.log(`✓ Linked business owner profile to ${alpha.name}`);
  }

  console.log("\nDone.");
  console.log(`Sign in as ${OWNER_EMAIL} and open /business-owner/dashboard`);
  console.log("You should see 4 stores in the carousel with pending calls and reminders.");
  console.log("Dev password (after auth:bootstrap-dev): FineSet#1dev");
}

main()
  .catch((err: unknown) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
