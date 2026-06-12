/**
 * Comprehensive mock data for local dev — visits, field sales, follow-ups, and call logs
 * covering filter edge cases for every seeded staff member and store manager.
 *
 * Creates ~300 records (75 per staff: 60 visits + 15 field sales) identified by phone
 * prefix 9810888. Safe to re-run; clears previous mock records first.
 *
 * Usage:
 *   npm run db:seed && npm run auth:bootstrap-dev && npm run db:seed:mock
 *
 * Logins (password: FineSet#1dev):
 *   staff-a@store-alpha.local (EMP001)
 *   store-manager@store-alpha.local (MGR001)
 */
import {
  Prisma,
  PrismaClient,
  type BudgetRange,
  type CallAnswerStatus,
  type CustomerType,
  type FieldActivityType,
  type FieldDeclineReason,
  type FollowUpStatus,
  type IntentTier,
  type PurchaseStatus,
  type SchemeEnrollmentOutcome,
  type SchemeProduct,
  type SourceChannel,
  type VisitType,
} from "@prisma/client";
import { fieldSaleDenormFields, visitDenormFields } from "../lib/services/call-record-denorm";
import { prepareCustomerPii } from "../lib/services/pii";

const prisma = new PrismaClient();

const MOCK_PHONE_PREFIX = "9810888";
const VISITS_PER_STAFF = 60;
const FIELD_SALES_PER_STAFF = 15;
const RECORDS_PER_STAFF = VISITS_PER_STAFF + FIELD_SALES_PER_STAFF;

const STAFF_TARGETS = [
  { employeeId: "EMP001", storeName: "Store Alpha" },
  { employeeId: "EMP002", storeName: "Store Alpha" },
  { employeeId: "EMP003", storeName: "Store Beta" },
  { employeeId: "MGR001", storeName: "Store Alpha" },
] as const;

const CUSTOMER_NAMES = [
  "Anita Reddy",
  "Karan Mehta",
  "Priya Sharma",
  "Amit Verma",
  "Vikram Singh",
  "Meera Patel",
  "Rahul Kumar",
  "Sunita Iyer",
  "Deepa Nair",
  "Lakshmi Rao",
  "Rajesh Naidu",
  "Sneha Gupta",
  "Arjun Malhotra",
  "Nisha Kapoor",
  "Suresh Babu",
  "Dr. Rajeshwaran Subramanian",
  "Li",
  "Mary-Jane O'Connor",
  "K",
  "Padmavathi Devi Krishnamurthy",
];

const AREAS = [
  "Banjara Hills",
  "Jubilee Hills",
  "Gachibowli",
  "Madhapur",
  "Hitech City",
  "Kondapur",
  "Secunderabad",
  "Indiranagar",
  "Koramangala",
  "Whitefield",
];

const PRODUCTS = [
  "FINGER_RINGS",
  "NECKLACE",
  "BANGLES",
  "EAR_RINGS",
  "CHAINS",
  "PENDANTS",
  "NECKLACE_PENDANT_EARRINGS",
];

const SOURCE_CHANNELS: SourceChannel[] = [
  "ORGANIC_WALK_IN",
  "REFERRAL",
  "SOCIAL_MEDIA",
  "INTERNET",
  "PHONE",
  "TANISHQ_REF",
  "CARATLANE_REF",
  "USER_CALLS",
  "OTHER",
];

const BUDGET_RANGES: BudgetRange[] = [
  "UNDER_15K",
  "K15_50K",
  "K50_1L",
  "ABOVE_1L",
  "NOT_STATED",
];

const INTENT_TIERS: IntentTier[] = ["HOT", "WARM", "COLD", "BROWSING"];

const FIELD_ACTIVITY_TYPES: FieldActivityType[] = [
  "DOOR_TO_DOOR",
  "HOUSING_SOCIETY",
  "CORPORATE",
  "EVENT_EXHIBITION",
  "MARKET_STALL",
  "REFERRAL_MEET",
  "OTHER",
];

const ENROLLMENT_OUTCOMES: SchemeEnrollmentOutcome[] = [
  "ENROLLED_GHS",
  "ENROLLED_GPP",
  "ENROLLED_BOTH",
  "INTERESTED",
  "DECLINED",
  "CALLBACK",
];

const DECLINE_REASONS: FieldDeclineReason[] = [
  "BUDGET",
  "ALREADY_ENROLLED",
  "NOT_INTERESTED",
  "NEEDS_TIME",
  "TRUST_CONCERNS",
  "COMPETITOR_SCHEME",
];

const FOLLOW_UP_STATUSES: FollowUpStatus[] = ["OPEN", "CLOSED", "CONVERTED", "NO_RESPONSE"];

const REASONS_NO_PURCHASE = [
  "EXPLORING",
  "BUDGET",
  "DESIGN_NOT_LIKED",
  "WILL_VISIT_AGAIN",
  "COMPETITOR",
] as const;

type QueueProfile = "RETENTION" | "NOT_ANSWERED" | "FOLLOW_UP" | "BIRTHDAY" | "ANNIVERSARY";

interface StaffContext {
  id: string;
  employeeId: string;
  storeId: string;
  storeName: string;
  recordOffset: number;
}

function mockPhone(globalIndex: number): string {
  return `${MOCK_PHONE_PREFIX}${String(globalIndex).padStart(4, "0")}`;
}

function pick<T>(items: readonly T[], index: number): T {
  return items[index % items.length];
}

function dayInMonth(year: number, month: number, day: number, hour = 10, minute = 0): Date {
  const lastDay = new Date(year, month, 0).getDate();
  const safeDay = Math.min(Math.max(day, 1), lastDay);
  return new Date(year, month - 1, safeDay, hour, minute, 0, 0);
}

function visitDateForIndex(index: number, year: number, month: number): Date {
  const day = (index % 28) + 1;
  const hour = 9 + (index % 8);
  const minute = (index * 7) % 60;

  if (index % 10 < 7) {
    return dayInMonth(year, month, day, hour, minute);
  }
  if (index % 10 < 9) {
    const prevMonth = month === 1 ? 12 : month - 1;
    const prevYear = month === 1 ? year - 1 : year;
    return dayInMonth(prevYear, prevMonth, day, hour, minute);
  }

  const olderMonth = month <= 2 ? month + 10 : month - 2;
  const olderYear = month <= 2 ? year - 1 : year;
  return dayInMonth(olderYear, olderMonth, day, hour, minute);
}

function transactionForValueTier(index: number): number | null {
  switch (index % 4) {
    case 0:
      return 8_000;
    case 1:
      return 28_000;
    case 2:
      return 85_000;
    default:
      return null;
  }
}

function monthlyCommitmentForTier(index: number): number | null {
  switch (index % 4) {
    case 0:
      return 5_000;
    case 1:
      return 22_000;
    case 2:
      return 60_000;
    default:
      return null;
  }
}

function queueProfileForVisitIndex(index: number): QueueProfile {
  const bucket = index % 20;
  if (bucket === 0) return "BIRTHDAY";
  if (bucket === 1) return "ANNIVERSARY";
  if (bucket < 5) return "NOT_ANSWERED";
  if (bucket < 10) return "FOLLOW_UP";
  return "RETENTION";
}

function customerTypeForIndex(index: number): CustomerType {
  if (index % 11 === 0) return "VIP";
  if (index % 5 === 0) return "REPEAT";
  return "NEW";
}

function purchaseStatusForIndex(index: number): PurchaseStatus {
  if (index % 17 === 0) return "PENDING";
  if (index % 3 === 0) return "PURCHASED";
  return "NOT_PURCHASED";
}

function buildVisitData(
  ctx: StaffContext,
  visitIndex: number,
  globalIndex: number,
  year: number,
  month: number,
): Prisma.VisitCreateInput {
  const name = pick(CUSTOMER_NAMES, globalIndex + visitIndex);
  const phone = mockPhone(globalIndex);
  const pii = prepareCustomerPii(name, phone);
  const queueProfile = queueProfileForVisitIndex(visitIndex);
  const purchaseStatus = purchaseStatusForIndex(visitIndex);
  const transactionAmount =
    purchaseStatus === "PURCHASED" ? transactionForValueTier(visitIndex) : null;
  const budgetStated = pick(BUDGET_RANGES, visitIndex);
  const visitDate = visitDateForIndex(visitIndex, year, month);
  const birthdayThisMonth =
    queueProfile === "BIRTHDAY" ? dayInMonth(year, month, 12 + (visitIndex % 10)) : null;
  const anniversaryThisMonth =
    queueProfile === "ANNIVERSARY" ? dayInMonth(year, month, 18 + (visitIndex % 8)) : null;

  const inTime = new Date(visitDate);
  inTime.setMinutes(inTime.getMinutes() - 5);
  const outTime = new Date(visitDate);
  outTime.setMinutes(outTime.getMinutes() + 20 + (visitIndex % 40));

  const explored = [pick(PRODUCTS, visitIndex), pick(PRODUCTS, visitIndex + 3)];
  const purchased =
    purchaseStatus === "PURCHASED" ? [explored[0]] : ([] as string[]);

  let lastCallAnswered: CallAnswerStatus | null = null;
  let followUpNeeded = false;
  let followUpDate: Date | null = null;

  if (queueProfile === "NOT_ANSWERED") {
    lastCallAnswered = "NOT_ANSWERED";
  } else if (queueProfile === "FOLLOW_UP") {
    followUpNeeded = true;
    followUpDate = dayInMonth(year, month, Math.min(28, 15 + (visitIndex % 10)));
    lastCallAnswered = visitIndex % 2 === 0 ? "ANSWERED" : null;
  } else if (queueProfile === "RETENTION" && visitIndex % 6 === 0) {
    lastCallAnswered = "ANSWERED";
  }

  const denorm = visitDenormFields({
    transactionAmount,
    budgetStated,
    purchaseStatus,
    dateOfBirth: birthdayThisMonth,
    anniversary: anniversaryThisMonth,
  });

  return {
    store: { connect: { id: ctx.storeId } },
    staff: { connect: { id: ctx.id } },
    visitDate,
    inTime,
    outTime,
    durationMins: 20 + (visitIndex % 60),
    customerName: pii.name,
    customerPhone: pii.phone,
    customerPhoneHash: pii.phoneHash,
    customerNameSearch: pii.customerNameSearch,
    phoneLast4: pii.phoneLast4,
    customerType: customerTypeForIndex(visitIndex),
    visitType: (visitIndex % 4 === 0 ? "APPOINTMENT" : "WALK_IN") as VisitType,
    area: pick(AREAS, visitIndex),
    gender: visitIndex % 2 === 0 ? "FEMALE" : "MALE",
    ageGroup: pick(["18-25", "26-35", "36-50", "50+"], visitIndex),
    dateOfBirth: birthdayThisMonth,
    anniversary: anniversaryThisMonth,
    purchaseStatus,
    productsExplored: explored,
    productsPurchased: purchased,
    transactionAmount,
    intentTier: pick(INTENT_TIERS, visitIndex),
    reasonNoPurchase:
      purchaseStatus === "NOT_PURCHASED"
        ? pick([...REASONS_NO_PURCHASE], visitIndex)
        : null,
    competitorMention:
      visitIndex % 9 === 0 ? pick(["Tanishq", "CaratLane", "Malabar"], visitIndex) : null,
    purchaseOccasion:
      purchaseStatus === "PURCHASED"
        ? pick(["WEDDING", "ANNIVERSARY", "BIRTHDAY", "FESTIVAL"], visitIndex)
        : null,
    metalKtPref: purchaseStatus === "PURCHASED" ? pick(["GOLD_22KT", "GOLD_18KT"], visitIndex) : null,
    budgetStated,
    schemeEnrolled: visitIndex % 13 === 0,
    schemesPitched: visitIndex % 7 === 0 ? (["GHS", "GPP"] as SchemeProduct[]) : [],
    followUpNeeded,
    followUpDate,
    staffNotes:
      visitIndex % 8 === 0
        ? "Customer asked for custom design quote — follow up with CAD render."
        : null,
    sourceChannel: pick(SOURCE_CHANNELS, visitIndex),
    lastCallAnswered,
    lastCallAt: lastCallAnswered ? visitDate : null,
    ...denorm,
  };
}

function buildFieldSaleData(
  ctx: StaffContext,
  fieldIndex: number,
  globalIndex: number,
  year: number,
  month: number,
): Prisma.FieldSaleCreateInput {
  const name = pick(CUSTOMER_NAMES, globalIndex + fieldIndex + 40);
  const phone = mockPhone(globalIndex);
  const pii = prepareCustomerPii(name, phone);
  const activityDate = visitDateForIndex(fieldIndex + 3, year, month);
  const monthlyCommitment = monthlyCommitmentForTier(fieldIndex);
  const enrollmentOutcome = pick(ENROLLMENT_OUTCOMES, fieldIndex);
  const queueProfile = queueProfileForVisitIndex(fieldIndex);

  let lastCallAnswered: CallAnswerStatus | null = null;
  let followUpNeeded = false;
  let followUpDate: Date | null = null;

  if (queueProfile === "NOT_ANSWERED") {
    lastCallAnswered = "NOT_ANSWERED";
  } else if (queueProfile === "FOLLOW_UP") {
    followUpNeeded = true;
    followUpDate = dayInMonth(year, month, 20);
  }

  const startTime = new Date(activityDate);
  const endTime = new Date(activityDate);
  endTime.setMinutes(endTime.getMinutes() + 25 + (fieldIndex % 20));

  const denorm = fieldSaleDenormFields({
    monthlyCommitment,
    dateOfBirth: fieldIndex % 5 === 0 ? dayInMonth(year, month, 8) : null,
    anniversary: null,
  });

  return {
    store: { connect: { id: ctx.storeId } },
    staff: { connect: { id: ctx.id } },
    activityDate,
    startTime,
    endTime,
    durationMins: 25 + (fieldIndex % 30),
    customerName: pii.name,
    customerPhone: pii.phone,
    customerPhoneHash: pii.phoneHash,
    customerNameSearch: pii.customerNameSearch,
    phoneLast4: pii.phoneLast4,
    customerType: customerTypeForIndex(fieldIndex),
    area: pick(AREAS, fieldIndex),
    gender: fieldIndex % 2 === 0 ? "FEMALE" : "MALE",
    ageGroup: pick(["18-25", "26-35", "36-50", "50+"], fieldIndex),
    profession: pick(
      ["Shop owner", "IT professional", "Doctor", "Teacher", "Homemaker"],
      fieldIndex,
    ),
    activityType: pick(FIELD_ACTIVITY_TYPES, fieldIndex),
    locationLabel: pick(
      ["Lake View Apartments", "Tech Park Gate 2", "Main Bazaar", "Society Clubhouse"],
      fieldIndex,
    ),
    schemesPitched:
      fieldIndex % 3 === 0
        ? (["GHS", "GPP"] as SchemeProduct[])
        : fieldIndex % 3 === 1
          ? (["GHS"] as SchemeProduct[])
          : (["GPP"] as SchemeProduct[]),
    enrollmentOutcome,
    monthlyCommitment,
    intentTier: pick(INTENT_TIERS, fieldIndex),
    reasonNoEnrollment:
      enrollmentOutcome === "DECLINED" ? pick(DECLINE_REASONS, fieldIndex) : null,
    competitorMention: fieldIndex % 6 === 0 ? "Local chit fund" : null,
    followUpNeeded,
    followUpDate,
    staffNotes:
      fieldIndex % 4 === 0 ? "Requested brochure and callback after salary credit." : null,
    lastCallAnswered,
    lastCallAt: lastCallAnswered ? activityDate : null,
    ...denorm,
  };
}

async function clearPreviousMockData(): Promise<void> {
  const hashes: string[] = [];
  for (let i = 1; i <= STAFF_TARGETS.length * RECORDS_PER_STAFF; i++) {
    hashes.push(prepareCustomerPii("cleanup", mockPhone(i)).phoneHash);
  }

  const [visits, fieldSales] = await Promise.all([
    prisma.visit.findMany({
      where: { customerPhoneHash: { in: hashes } },
      select: { id: true },
    }),
    prisma.fieldSale.findMany({
      where: { customerPhoneHash: { in: hashes } },
      select: { id: true },
    }),
  ]);

  const visitIds = visits.map((v) => v.id);
  const fieldSaleIds = fieldSales.map((f) => f.id);

  if (visitIds.length > 0) {
    await prisma.staffCallLog.deleteMany({ where: { visitId: { in: visitIds } } });
    await prisma.followUp.deleteMany({ where: { visitId: { in: visitIds } } });
    await prisma.visit.deleteMany({ where: { id: { in: visitIds } } });
  }

  if (fieldSaleIds.length > 0) {
    await prisma.staffCallLog.deleteMany({ where: { fieldSaleId: { in: fieldSaleIds } } });
    await prisma.followUp.deleteMany({ where: { fieldSaleId: { in: fieldSaleIds } } });
    await prisma.fieldSale.deleteMany({ where: { id: { in: fieldSaleIds } } });
  }
}

async function resolveStaffContexts(): Promise<StaffContext[]> {
  const contexts: StaffContext[] = [];

  for (let staffIndex = 0; staffIndex < STAFF_TARGETS.length; staffIndex++) {
    const target = STAFF_TARGETS[staffIndex];
    const store = await prisma.store.findFirst({
      where: { name: { equals: target.storeName, mode: "insensitive" } },
    });
    if (!store) {
      throw new Error(`Store "${target.storeName}" not found. Run npm run db:seed first.`);
    }

    const staff = await prisma.staff.findUnique({
      where: { employeeId: target.employeeId },
    });
    if (!staff || staff.storeId !== store.id) {
      throw new Error(
        `Staff ${target.employeeId} not found for ${target.storeName}. Run npm run db:seed first.`,
      );
    }

    contexts.push({
      id: staff.id,
      employeeId: staff.employeeId,
      storeId: store.id,
      storeName: target.storeName,
      recordOffset: staffIndex * RECORDS_PER_STAFF,
    });
  }

  return contexts;
}

async function seedStaffVisits(
  ctx: StaffContext,
  year: number,
  month: number,
): Promise<{
  visitsCreated: number;
  followUpsCreated: number;
  callLogsCreated: number;
}> {
  let visitsCreated = 0;
  let followUpsCreated = 0;
  let callLogsCreated = 0;

  for (let i = 0; i < VISITS_PER_STAFF; i++) {
    const globalIndex = ctx.recordOffset + i + 1;
    const data = buildVisitData(ctx, i, globalIndex, year, month);
    const visit = await prisma.visit.create({ data });

    visitsCreated++;

    const queueProfile = queueProfileForVisitIndex(i);
    if (queueProfile === "NOT_ANSWERED") {
      await prisma.staffCallLog.create({
        data: {
          visitId: visit.id,
          staffId: ctx.id,
          answered: "NOT_ANSWERED",
          feedback: pick(
            [
              "Rang twice, no answer",
              "Voicemail",
              "Number busy",
              "Call disconnected after one ring",
            ],
            i,
          ),
        },
      });
      callLogsCreated++;
    }

    if (queueProfile === "FOLLOW_UP" || (i % 11 === 0 && queueProfile === "RETENTION")) {
      const status = pick(FOLLOW_UP_STATUSES, i);
      await prisma.followUp.create({
        data: {
          visitId: visit.id,
          assignedStaffId: ctx.id,
          followUpDate: visit.followUpDate ?? dayInMonth(year, month, 22),
          reason: pick(
            [
              "Design alternatives follow-up",
              "Budget discussion",
              "Post-purchase satisfaction check",
              "Competitor comparison",
              "Scheme enrollment callback",
            ],
            i,
          ),
          status,
          callOutcome: status === "NO_RESPONSE" ? "NOT_ANSWERED" : null,
          outcomeDate: status !== "OPEN" ? visitDateForIndex(i, year, month) : null,
        },
      });
      followUpsCreated++;
    }

    if (queueProfile === "RETENTION" && i % 6 === 0) {
      await prisma.staffCallLog.create({
        data: {
          visitId: visit.id,
          staffId: ctx.id,
          answered: "ANSWERED",
          feedback: "Customer confirmed interest, will visit next weekend.",
        },
      });
      callLogsCreated++;
    }
  }

  return { visitsCreated, followUpsCreated, callLogsCreated };
}

async function seedStaffFieldSales(
  ctx: StaffContext,
  year: number,
  month: number,
): Promise<{
  fieldSalesCreated: number;
  followUpsCreated: number;
  callLogsCreated: number;
}> {
  let fieldSalesCreated = 0;
  let followUpsCreated = 0;
  let callLogsCreated = 0;

  for (let i = 0; i < FIELD_SALES_PER_STAFF; i++) {
    const globalIndex = ctx.recordOffset + VISITS_PER_STAFF + i + 1;
    const data = buildFieldSaleData(ctx, i, globalIndex, year, month);
    const fieldSale = await prisma.fieldSale.create({ data });

    fieldSalesCreated++;

    const queueProfile = queueProfileForVisitIndex(i);
    if (queueProfile === "NOT_ANSWERED") {
      await prisma.staffCallLog.create({
        data: {
          fieldSaleId: fieldSale.id,
          staffId: ctx.id,
          answered: "NOT_ANSWERED",
          feedback: "No answer on field-sale callback",
        },
      });
      callLogsCreated++;
    }

    if (queueProfile === "FOLLOW_UP" || i % 5 === 0) {
      await prisma.followUp.create({
        data: {
          fieldSaleId: fieldSale.id,
          assignedStaffId: ctx.id,
          followUpDate: fieldSale.followUpDate ?? dayInMonth(year, month, 25),
          reason: "Scheme enrollment follow-up",
          status: pick(FOLLOW_UP_STATUSES, i),
        },
      });
      followUpsCreated++;
    }
  }

  return { fieldSalesCreated, followUpsCreated, callLogsCreated };
}

async function main(): Promise<void> {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  await clearPreviousMockData();
  const staffContexts = await resolveStaffContexts();

  const totals = {
    visits: 0,
    fieldSales: 0,
    followUps: 0,
    callLogs: 0,
  };

  const perStaff: Record<string, { visits: number; fieldSales: number }> = {};

  for (const ctx of staffContexts) {
    const visitResult = await seedStaffVisits(ctx, year, month);
    const fieldResult = await seedStaffFieldSales(ctx, year, month);

    totals.visits += visitResult.visitsCreated;
    totals.fieldSales += fieldResult.fieldSalesCreated;
    totals.followUps += visitResult.followUpsCreated + fieldResult.followUpsCreated;
    totals.callLogs += visitResult.callLogsCreated + fieldResult.callLogsCreated;

    perStaff[ctx.employeeId] = {
      visits: visitResult.visitsCreated,
      fieldSales: fieldResult.fieldSalesCreated,
    };
  }

  const totalRecords = totals.visits + totals.fieldSales;

  console.log("Mock edge-case seed complete:", {
    year,
    month,
    totalRecords,
    totals,
    perStaff,
    phonePrefix: MOCK_PHONE_PREFIX,
    logins: {
      staffA: "staff-a@store-alpha.local",
      storeManager: "store-manager@store-alpha.local",
      password: "FineSet#1dev",
    },
    edgeCases: [
      "customer types NEW/REPEAT/VIP",
      "purchase PURCHASED/NOT_PURCHASED/PENDING",
      "value tiers HIGH/MID/LOW via amount and budget",
      "queues RETENTION/NOT_ANSWERED/FOLLOW_UP",
      "birthday and anniversary this month",
      "all source channels and field activity types",
      "follow-up statuses OPEN/CLOSED/CONVERTED/NO_RESPONSE",
      "long/short customer names",
      "current and prior month dates",
    ],
  });
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
