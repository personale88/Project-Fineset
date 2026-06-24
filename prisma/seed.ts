import { PrismaClient, type BillingPaymentStatus } from "@prisma/client";
import { randomUUID } from "crypto";
import { hashCredential } from "../lib/auth/credentials";
import { buildInvoiceNumber } from "../lib/emails/render-invoice-email";
import { getActivationBillingPeriod } from "../lib/billing/activation-cycle";
import { fieldSaleDenormFields, visitDenormFields } from "../lib/services/call-record-denorm";
import { grantAnalyticsCredits } from "../lib/services/analytics-credits";
import { prepareCustomerPii } from "../lib/services/pii";

const prisma = new PrismaClient();
const DEV_PASSWORD = "FineSet#1dev";

async function seedStore(data: {
  name: string;
  category: "JEWELRY" | "HANDBAGS" | "WATCHES" | "OTHER";
  city: string;
  state: string;
  pincode?: string;
  businessOwnerName?: string;
  businessOwnerEmail?: string;
  dataExpiryAt?: Date | null;
  renewalDueAt?: Date | null;
  isActive?: boolean;
}) {
  return prisma.store.create({
    data: {
      ...data,
      isActive: data.isActive ?? true,
    },
  });
}

async function seedStoreManager(data: {
  storeId: string;
  name: string;
  employeeId: string;
  phone: string;
}) {
  return prisma.staff.create({
    data: {
      name: data.name,
      employeeId: data.employeeId,
      phone: data.phone,
      role: "STORE_MANAGER",
      storeId: data.storeId,
    },
  });
}

async function upsertAppUser(data: {
  email: string;
  name: string;
  role: "MASTER_ADMIN" | "BUSINESS_OWNER" | "STORE_MANAGER" | "STAFF";
  storeId?: string | null;
  staffId?: string;
  lastLoginAt?: Date | null;
}): Promise<void> {
  const passwordHash = await hashCredential(DEV_PASSWORD);
  const now = new Date();

  await prisma.appUser.upsert({
    where: { email: data.email },
    create: {
      authId: randomUUID(),
      email: data.email,
      name: data.name,
      role: data.role,
      storeId: data.storeId ?? undefined,
      staffId: data.staffId,
      passwordHash,
      isActive: true,
      activatedAt: now,
      lastLoginAt: data.lastLoginAt ?? null,
    },
    update: {
      name: data.name,
      role: data.role,
      storeId: data.storeId ?? undefined,
      ...(data.staffId ? { staffId: data.staffId } : {}),
      passwordHash,
      isActive: true,
      ...(data.lastLoginAt !== undefined ? { lastLoginAt: data.lastLoginAt } : {}),
    },
  });
}

async function seedStaff(data: {
  name: string;
  employeeId: string;
  storeId: string;
}) {
  return prisma.staff.create({
    data: {
      name: data.name,
      employeeId: data.employeeId,
      role: "STAFF",
      storeId: data.storeId,
    },
  });
}

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

function visitTime(hours: number, minutes: number, base = new Date()): Date {
  const date = new Date(base);
  date.setHours(hours, minutes, 0, 0);
  return date;
}

/** Keeps staff-call seed visits inside the active month (default filter on /staff/dashboard/calls). */
function dayInCurrentMonth(day: number, hour = 11, minute = 0): Date {
  const now = new Date();
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const safeDay = Math.min(Math.max(day, 1), lastDay);
  return new Date(now.getFullYear(), now.getMonth(), safeDay, hour, minute, 0, 0);
}

function customerPii(name: string, phone: string) {
  return prepareCustomerPii(name, phone);
}

function customerCreatePii(pii: ReturnType<typeof customerPii>) {
  const { name, phone, phoneHash, nameSearch, phoneLast4 } = pii;
  return { name, phone, phoneHash, nameSearch, phoneLast4 };
}

function dayInPastMonth(monthsBack: number, day: number, hour = 11, minute = 0): Date {
  const now = new Date();
  const lastDay = new Date(now.getFullYear(), now.getMonth() - monthsBack + 1, 0).getDate();
  const safeDay = Math.min(Math.max(day, 1), lastDay);
  return new Date(
    now.getFullYear(),
    now.getMonth() - monthsBack,
    safeDay,
    hour,
    minute,
    0,
    0,
  );
}

type BillingInvoiceSeedEntry = {
  monthsAgo: number;
  day?: number;
  grandTotal: number;
};

async function seedBillingAccountWithInvoices(params: {
  businessKey: string;
  businessName: string;
  businessEmail: string;
  paymentStatus: BillingPaymentStatus;
  billingAnchorAt: Date;
  paidAt?: Date | null;
  paidThroughPeriodEnd?: Date | null;
  invoices: BillingInvoiceSeedEntry[];
  sentByEmail?: string;
}): Promise<{ invoiceCount: number }> {
  const account = await prisma.billingBusinessAccount.upsert({
    where: { businessKey: params.businessKey },
    create: {
      businessKey: params.businessKey,
      businessName: params.businessName,
      businessEmail: params.businessEmail,
      paymentStatus: params.paymentStatus,
      paidAt: params.paidAt ?? null,
      paidThroughPeriodEnd: params.paidThroughPeriodEnd ?? null,
      billingAnchorAt: params.billingAnchorAt,
    },
    update: {
      businessName: params.businessName,
      businessEmail: params.businessEmail,
      paymentStatus: params.paymentStatus,
      paidAt: params.paidAt ?? null,
      paidThroughPeriodEnd: params.paidThroughPeriodEnd ?? null,
      billingAnchorAt: params.billingAnchorAt,
    },
  });

  await prisma.billingInvoiceLog.deleteMany({ where: { accountId: account.id } });

  const sentByEmail = params.sentByEmail ?? "admin@fineset.local";
  const logs = params.invoices
    .map((invoice) => {
      const sentAt = dayInPastMonth(invoice.monthsAgo, invoice.day ?? 15, 10, 30);
      return {
        accountId: account.id,
        invoiceNumber: buildInvoiceNumber(params.businessKey, sentAt),
        sentTo: params.businessEmail,
        grandTotal: invoice.grandTotal,
        sentByEmail,
        createdAt: sentAt,
      };
    })
    .sort((left, right) => left.createdAt.getTime() - right.createdAt.getTime());

  for (const log of logs) {
    await prisma.billingInvoiceLog.create({ data: log });
  }

  const latest = logs.at(-1);
  if (latest) {
    await prisma.billingBusinessAccount.update({
      where: { id: account.id },
      data: {
        lastInvoiceNumber: latest.invoiceNumber,
        lastInvoiceSentAt: latest.createdAt,
      },
    });
  }

  return { invoiceCount: logs.length };
}

type AnalyticsVisitSeed = {
  visitDate: Date;
  storeId: string;
  staffId: string;
  customerType: "NEW" | "REPEAT" | "VIP";
  purchaseStatus: "PURCHASED" | "NOT_PURCHASED" | "PENDING";
  transactionAmount: number | null;
  sourceChannel:
    | "ORGANIC_WALK_IN"
    | "REFERRAL"
    | "SOCIAL_MEDIA"
    | "INTERNET"
    | "PHONE"
    | "TANISHQ_REF";
  area: string;
  intentTier: "HOT" | "WARM" | "COLD" | "BROWSING";
  budgetStated: "UNDER_15K" | "K15_50K" | "K50_1L" | "ABOVE_1L";
  productsExplored: string[];
  gender: string;
  ageGroup: string;
  schemesPitched?: ("GHS" | "GPP")[];
  enrollmentOutcome?: "ENROLLED_GHS" | "ENROLLED_GPP" | "DECLINED" | "INTERESTED";
  schemeEnrolled?: boolean;
};

async function createAnalyticsVisit(index: number, plan: AnalyticsVisitSeed) {
  const pii = customerPii(`Portfolio Visitor ${index}`, `981003${String(index).padStart(4, "0")}`);
  const purchased = plan.purchaseStatus === "PURCHASED";

  return prisma.visit.create({
    data: {
      storeId: plan.storeId,
      staffId: plan.staffId,
      customerName: pii.name,
      customerPhone: pii.phone,
      customerPhoneHash: pii.phoneHash,
      visitDate: plan.visitDate,
      inTime: visitTime(10 + (index % 6), index % 50, plan.visitDate),
      outTime: visitTime(11 + (index % 6), (index % 50) + 30, plan.visitDate),
      durationMins: 35 + (index % 25),
      customerType: plan.customerType,
      visitType: index % 5 === 0 ? "APPOINTMENT" : "WALK_IN",
      purchaseStatus: plan.purchaseStatus,
      productsExplored: plan.productsExplored,
      productsPurchased: purchased ? [plan.productsExplored[0]!] : [],
      transactionAmount: plan.transactionAmount,
      intentTier: plan.intentTier,
      budgetStated: plan.budgetStated,
      sourceChannel: plan.sourceChannel,
      area: plan.area,
      gender: plan.gender,
      ageGroup: plan.ageGroup,
      schemesPitched: plan.schemesPitched ?? [],
      enrollmentOutcome: plan.enrollmentOutcome,
      schemeEnrolled: plan.schemeEnrolled ?? false,
      ...visitDenormFields({
        transactionAmount: plan.transactionAmount,
        budgetStated: plan.budgetStated,
        purchaseStatus: plan.purchaseStatus,
        dateOfBirth: null,
        anniversary: null,
      }),
    },
  });
}

async function seedPortfolioAnalyticsData(context: {
  storeAlpha: { id: string };
  sharmaGachibowli: { id: string };
  storeBeta: { id: string };
  luxeKoramangala: { id: string };
  royalBandra: { id: string };
  diamondSurat: { id: string };
  staffA: { id: string };
  staffB: { id: string };
  staffC: { id: string };
  staffSharma: { id: string };
  staffRoyal: { id: string };
  staffLuxe: { id: string };
  staffSurat: { id: string };
}): Promise<{ visits: number; fieldSales: number }> {
  const storeSlots = [
    {
      storeId: context.storeAlpha.id,
      staffId: context.staffA.id,
      areas: ["Banjara Hills", "Jubilee Hills", "Gachibowli", "Madhapur"],
    },
    {
      storeId: context.sharmaGachibowli.id,
      staffId: context.staffSharma.id,
      areas: ["Gachibowli", "Financial District", "Nanakramguda"],
    },
    {
      storeId: context.storeBeta.id,
      staffId: context.staffC.id,
      areas: ["Indiranagar", "Koramangala", "Whitefield"],
    },
    {
      storeId: context.luxeKoramangala.id,
      staffId: context.staffLuxe.id,
      areas: ["Koramangala", "HSR Layout", "BTM Layout"],
    },
    {
      storeId: context.royalBandra.id,
      staffId: context.staffRoyal.id,
      areas: ["Bandra West", "Khar", "Juhu"],
    },
    {
      storeId: context.diamondSurat.id,
      staffId: context.staffSurat.id,
      areas: ["Varachha", "Adajan", "Vesu"],
    },
  ] as const;

  const customerTypes = ["NEW", "REPEAT", "VIP"] as const;
  const sources = [
    "ORGANIC_WALK_IN",
    "REFERRAL",
    "SOCIAL_MEDIA",
    "INTERNET",
    "PHONE",
    "TANISHQ_REF",
  ] as const;
  const intents = ["HOT", "WARM", "COLD", "BROWSING"] as const;
  const budgets = ["UNDER_15K", "K15_50K", "K50_1L", "ABOVE_1L"] as const;
  const products = [
    ["FINGER_RINGS"],
    ["NECKLACE", "EAR_RINGS"],
    ["BANGLES"],
    ["PENDANTS"],
    ["NECKLACE_PENDANT_EARRINGS"],
    ["CHAINS"],
  ] as const;
  const genders = ["MALE", "FEMALE"] as const;
  const ageGroups = ["18-25", "26-35", "36-50", "50+"] as const;

  const plans: AnalyticsVisitSeed[] = [];
  let cursor = 0;

  const pushVisit = (visitDate: Date, slotIndex: number, purchased: boolean) => {
    const slot = storeSlots[slotIndex % storeSlots.length]!;
    const budget = budgets[cursor % budgets.length]!;
    const amount = purchased
      ? budget === "UNDER_15K"
        ? 12000
        : budget === "K15_50K"
          ? 32000
          : budget === "K50_1L"
            ? 78000
            : 145000
      : null;

    plans.push({
      visitDate,
      storeId: slot.storeId,
      staffId: slot.staffId,
      customerType: customerTypes[cursor % customerTypes.length]!,
      purchaseStatus: purchased ? "PURCHASED" : "NOT_PURCHASED",
      transactionAmount: amount,
      sourceChannel: sources[cursor % sources.length]!,
      area: slot.areas[cursor % slot.areas.length]!,
      intentTier: intents[cursor % intents.length]!,
      budgetStated: budget,
      productsExplored: [...products[cursor % products.length]!],
      gender: genders[cursor % genders.length]!,
      ageGroup: ageGroups[cursor % ageGroups.length]!,
      ...(cursor % 7 === 0
        ? {
            schemesPitched: ["GHS"] as ("GHS" | "GPP")[],
            enrollmentOutcome: (cursor % 14 === 0 ? "ENROLLED_GHS" : "INTERESTED") as
              | "ENROLLED_GHS"
              | "INTERESTED",
            schemeEnrolled: cursor % 14 === 0,
          }
        : {}),
    });
    cursor += 1;
  };

  // Last 30 days — rolling window used by most AI analytics prompts
  for (let dayOffset = 0; dayOffset < 30; dayOffset += 1) {
    if (dayOffset % 2 === 0) {
      pushVisit(dayOffset === 0 ? new Date() : daysAgo(dayOffset), dayOffset, dayOffset % 3 === 0);
    }
    if (dayOffset % 5 === 0) {
      pushVisit(daysAgo(dayOffset), dayOffset + 1, dayOffset % 4 === 0);
    }
  }

  // Previous calendar month — month-over-month comparisons
  for (let day = 2; day <= 28; day += 2) {
    pushVisit(dayInPastMonth(1, day, 9 + (day % 7)), day, day % 3 !== 1);
  }

  // Same month last year — year-over-year comparisons
  for (let day = 3; day <= 27; day += 3) {
    pushVisit(dayInPastMonth(12, day, 11 + (day % 5)), day + 2, day % 4 === 0);
  }

  // Mid-range history (45–75 days ago)
  for (const dayOffset of [45, 48, 52, 55, 58, 62, 65, 68, 72, 75]) {
    pushVisit(daysAgo(dayOffset), dayOffset, dayOffset % 5 === 0);
  }

  // Store Alpha — extra density for store-level filter testing
  for (let day = 1; day <= 20; day += 1) {
    pushVisit(dayInPastMonth(0, day, 14 + (day % 4)), day, day % 2 === 0);
  }

  let visitIndex = 5000;
  for (const plan of plans) {
    await createAnalyticsVisit(visitIndex, plan);
    visitIndex += 1;
  }

  let fieldSales = 0;
  const fieldSaleStores = [
    { storeId: context.storeAlpha.id, staffId: context.staffA.id, area: "Miyapur" },
    { storeId: context.sharmaGachibowli.id, staffId: context.staffSharma.id, area: "Kondapur" },
    { storeId: context.diamondSurat.id, staffId: context.staffSurat.id, area: "Ring Road" },
  ] as const;

  for (let i = 0; i < fieldSaleStores.length; i += 1) {
    for (const dayOffset of [2, 9, 18, 27]) {
      const slot = fieldSaleStores[i]!;
      const activityDate = daysAgo(dayOffset);
      const pii = customerPii(
        `Field Lead ${6000 + fieldSales}`,
        `981004${String(6000 + fieldSales).padStart(4, "0")}`,
      );
      await prisma.fieldSale.create({
        data: {
          storeId: slot.storeId,
          staffId: slot.staffId,
          customerName: pii.name,
          customerPhone: pii.phone,
          customerPhoneHash: pii.phoneHash,
          activityDate,
          startTime: visitTime(10, 0, activityDate),
          endTime: visitTime(10, 40, activityDate),
          durationMins: 40,
          customerType: i % 2 === 0 ? "NEW" : "REPEAT",
          area: slot.area,
          gender: i % 2 === 0 ? "MALE" : "FEMALE",
          ageGroup: "26-35",
          profession: "Professional",
          activityType: "HOUSING_SOCIETY",
          locationLabel: `Society Block ${fieldSales + 1}`,
          schemesPitched: fieldSales % 2 === 0 ? ["GHS"] : ["GPP"],
          enrollmentOutcome: fieldSales % 3 === 0 ? "ENROLLED_GHS" : "INTERESTED",
          monthlyCommitment: 5000 + fieldSales * 1500,
          intentTier: "WARM",
          ...fieldSaleDenormFields({
            monthlyCommitment: 5000 + fieldSales * 1500,
            dateOfBirth: null,
            anniversary: null,
          }),
        },
      });
      fieldSales += 1;
    }
  }

  return { visits: plans.length, fieldSales };
}

async function main(): Promise<void> {
  await prisma.authAuditLog.deleteMany();
  await prisma.billingFollowUp.deleteMany();
  await prisma.billingInvoiceLog.deleteMany();
  await prisma.billingBusinessAccount.deleteMany();
  await prisma.analyticsCreditLedger.deleteMany();
  await prisma.analyticsCreditAccount.deleteMany();
  await prisma.appUser.deleteMany();
  await prisma.followUp.deleteMany();
  await prisma.staffCallLog.deleteMany();
  await prisma.fieldSale.deleteMany();
  await prisma.visit.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.staff.deleteMany();
  await prisma.store.deleteMany();

  const storeAlpha = await seedStore({
    name: "Store Alpha",
    category: "JEWELRY",
    city: "Hyderabad",
    state: "Telangana",
    pincode: "500032",
    businessOwnerName: "Store Alpha Owner",
    businessOwnerEmail: "manager@store-alpha.local",
    dataExpiryAt: daysFromNow(365),
    renewalDueAt: daysFromNow(30),
  });

  const storeBeta = await seedStore({
    name: "Store Beta",
    category: "HANDBAGS",
    city: "Bengaluru",
    state: "Karnataka",
    pincode: "560001",
    businessOwnerName: "Preeti Handbags",
    businessOwnerEmail: "preeti@handbags-boutique.local",
    renewalDueAt: daysFromNow(120),
    dataExpiryAt: daysFromNow(400),
  });

  // ── Admin portfolio test businesses ───────────────────────────────────────

  const sharmaGachibowli = await seedStore({
    name: "Sharma Jewellers Gachibowli",
    category: "JEWELRY",
    city: "Hyderabad",
    state: "Telangana",
    pincode: "500032",
    businessOwnerName: "Store Alpha Owner",
    businessOwnerEmail: "manager@store-alpha.local",
    renewalDueAt: daysFromNow(30),
    dataExpiryAt: daysFromNow(365),
  });

  const royalBandra = await seedStore({
    name: "Royal Watches Bandra",
    category: "WATCHES",
    city: "Mumbai",
    state: "Maharashtra",
    pincode: "400050",
    businessOwnerName: "Rajesh Malhotra",
    businessOwnerEmail: "owner@royal-time.local",
    renewalDueAt: daysFromNow(-12),
    dataExpiryAt: daysFromNow(240),
  });

  await seedStore({
    name: "Royal Watches Andheri",
    category: "WATCHES",
    city: "Mumbai",
    state: "Maharashtra",
    pincode: "400053",
    businessOwnerName: "Rajesh Malhotra",
    businessOwnerEmail: "owner@royal-time.local",
    renewalDueAt: daysFromNow(-12),
    dataExpiryAt: daysFromNow(240),
  });

  const luxeKoramangala = await seedStore({
    name: "Luxe Bags Koramangala",
    category: "HANDBAGS",
    city: "Bengaluru",
    state: "Karnataka",
    pincode: "560034",
    businessOwnerName: "Ananya Reddy",
    businessOwnerEmail: "bags@luxebags.local",
    renewalDueAt: daysFromNow(18),
    dataExpiryAt: daysFromNow(320),
  });

  await seedStore({
    name: "Chennai Gold Palace T Nagar",
    category: "JEWELRY",
    city: "Chennai",
    state: "Tamil Nadu",
    pincode: "600017",
  });

  const heritageKochi = await seedStore({
    name: "Heritage Jewels MG Road",
    category: "JEWELRY",
    city: "Kochi",
    state: "Kerala",
    pincode: "682011",
    businessOwnerName: "Thomas Varghese",
    businessOwnerEmail: "heritage@kochi.local",
    renewalDueAt: daysFromNow(45),
    dataExpiryAt: daysFromNow(-8),
    isActive: false,
  });

  const diamondSurat = await seedStore({
    name: "Diamond District Surat",
    category: "JEWELRY",
    city: "Surat",
    state: "Gujarat",
    pincode: "395003",
    businessOwnerName: "Kiran Patel",
    businessOwnerEmail: "mixed@jewels.local",
    renewalDueAt: daysFromNow(95),
    dataExpiryAt: daysFromNow(540),
  });

  await seedStore({
    name: "Diamond District Varachha",
    category: "JEWELRY",
    city: "Surat",
    state: "Gujarat",
    pincode: "395006",
    businessOwnerName: "Kiran Patel",
    businessOwnerEmail: "mixed@jewels.local",
    renewalDueAt: daysFromNow(95),
    dataExpiryAt: daysFromNow(540),
    isActive: false,
  });

  await seedStoreManager({
    storeId: sharmaGachibowli.id,
    name: "Ravi Sharma",
    employeeId: "MGR002",
    phone: "9848012345",
  });

  await seedStoreManager({
    storeId: royalBandra.id,
    name: "Neha Kapoor",
    employeeId: "MGR003",
    phone: "9820012345",
  });

  await seedStoreManager({
    storeId: luxeKoramangala.id,
    name: "Divya Menon",
    employeeId: "MGR004",
    phone: "9886012345",
  });

  await seedStoreManager({
    storeId: heritageKochi.id,
    name: "Thomas Varghese",
    employeeId: "MGR006",
    phone: "9847012345",
  });

  await seedStoreManager({
    storeId: diamondSurat.id,
    name: "Harsh Patel",
    employeeId: "MGR005",
    phone: "9879012345",
  });

  const staffA = await seedStaff({
    name: "Vamsi",
    employeeId: "EMP001",
    storeId: storeAlpha.id,
  });

  const staffB = await seedStaff({
    name: "Mohan",
    employeeId: "EMP002",
    storeId: storeAlpha.id,
  });

  await seedStaff({
    name: "Bhargavi",
    employeeId: "EMP004",
    storeId: storeAlpha.id,
  });

  await seedStaff({
    name: "Parimala",
    employeeId: "EMP005",
    storeId: storeAlpha.id,
  });

  await seedStaff({
    name: "Sailaja",
    employeeId: "EMP006",
    storeId: storeAlpha.id,
  });

  await seedStaff({
    name: "Bhavani",
    employeeId: "EMP007",
    storeId: storeAlpha.id,
  });

  const staffC = await seedStaff({
    name: "Staff Member C",
    employeeId: "EMP003",
    storeId: storeBeta.id,
  });

  const staffSharma = await seedStaff({
    name: "Arjun Reddy",
    employeeId: "EMP101",
    storeId: sharmaGachibowli.id,
  });

  const staffRoyal = await seedStaff({
    name: "Priya Shah",
    employeeId: "EMP102",
    storeId: royalBandra.id,
  });

  const staffLuxe = await seedStaff({
    name: "Kavya N",
    employeeId: "EMP103",
    storeId: luxeKoramangala.id,
  });

  const staffSurat = await seedStaff({
    name: "Dev Patel",
    employeeId: "EMP104",
    storeId: diamondSurat.id,
  });

  const managerAlpha = await prisma.staff.create({
    data: {
      name: "Store Alpha Manager",
      employeeId: "MGR001",
      phone: "9849098765",
      role: "STORE_MANAGER",
      storeId: storeAlpha.id,
    },
  });

  // ── Customers (Store Alpha) ──────────────────────────────────────────────

  const piiAnita = customerPii("Anita Reddy", "9810001001");
  const customerAnita = await prisma.customer.create({
    data: {
      ...customerCreatePii(piiAnita),
      area: "Banjara Hills",
      gender: "FEMALE",
      ageGroup: "36-50",
      storeId: storeAlpha.id,
    },
  });

  const piiKaran = customerPii("Karan Mehta", "9810001002");
  const customerKaran = await prisma.customer.create({
    data: {
      ...customerCreatePii(piiKaran),
      area: "Jubilee Hills",
      gender: "MALE",
      ageGroup: "26-35",
      storeId: storeAlpha.id,
    },
  });

  const piiPriya = customerPii("Priya Sharma", "9810001004");
  await prisma.customer.create({
    data: {
      ...customerCreatePii(piiPriya),
      area: "Gachibowli",
      gender: "FEMALE",
      ageGroup: "18-25",
      storeId: storeAlpha.id,
    },
  });

  const piiAmit = customerPii("Amit Verma", "9810001005");
  await prisma.customer.create({
    data: {
      ...customerCreatePii(piiAmit),
      area: "Madhapur",
      gender: "MALE",
      ageGroup: "36-50",
      storeId: storeAlpha.id,
    },
  });

  const piiVikram = customerPii("Vikram Singh", "9810001006");
  await prisma.customer.create({
    data: {
      ...customerCreatePii(piiVikram),
      area: "Hitech City",
      gender: "MALE",
      ageGroup: "50+",
      storeId: storeAlpha.id,
    },
  });

  const piiMeera = customerPii("Meera Patel", "9810001007");
  await prisma.customer.create({
    data: {
      ...customerCreatePii(piiMeera),
      area: "Kondapur",
      gender: "FEMALE",
      ageGroup: "26-35",
      storeId: storeAlpha.id,
    },
  });

  const piiRahul = customerPii("Rahul Kumar", "9810001008");
  await prisma.customer.create({
    data: {
      ...customerCreatePii(piiRahul),
      area: "Secunderabad",
      gender: "MALE",
      ageGroup: "26-35",
      storeId: storeAlpha.id,
    },
  });

  const piiSunita = customerPii("Sunita Iyer", "9810001009");
  await prisma.customer.create({
    data: {
      ...customerCreatePii(piiSunita),
      area: "Ameerpet",
      gender: "FEMALE",
      ageGroup: "36-50",
      storeId: storeAlpha.id,
    },
  });

  const piiDeepa = customerPii("Deepa Nair", "9810001010");
  await prisma.customer.create({
    data: {
      ...customerCreatePii(piiDeepa),
      area: "Kukatpally",
      gender: "FEMALE",
      ageGroup: "26-35",
      storeId: storeAlpha.id,
    },
  });

  // ── Staff A visits — retention & follow-up call queues ─────────────────────

  const visitAnitaDate = dayInCurrentMonth(1);
  const visitAnita = await prisma.visit.create({
    data: {
      storeId: storeAlpha.id,
      staffId: staffA.id,
      customerId: customerAnita.id,
      customerName: piiAnita.name,
      customerPhone: piiAnita.phone,
      customerPhoneHash: piiAnita.phoneHash,
      visitDate: visitAnitaDate,
      inTime: visitTime(11, 15, visitAnitaDate),
      outTime: visitTime(12, 5, visitAnitaDate),
      durationMins: 50,
      customerType: "REPEAT",
      visitType: "WALK_IN",
      purchaseStatus: "PURCHASED",
      productsExplored: ["FINGER_RINGS", "NECKLACE"],
      productsPurchased: ["FINGER_RINGS"],
      transactionAmount: 72000,
      intentTier: "HOT",
      purchaseOccasion: "ANNIVERSARY",
      metalKtPref: "GOLD_22KT",
      budgetStated: "K50_1L",
      sourceChannel: "REFERRAL",
      area: "Banjara Hills",
      ...visitDenormFields({
        transactionAmount: 72000,
        budgetStated: "K50_1L",
        purchaseStatus: "PURCHASED",
        dateOfBirth: null,
        anniversary: null,
      }),
    },
  });

  const visitPriyaDate = dayInCurrentMonth(2);
  await prisma.visit.create({
    data: {
      storeId: storeAlpha.id,
      staffId: staffA.id,
      customerName: piiPriya.name,
      customerPhone: piiPriya.phone,
      customerPhoneHash: piiPriya.phoneHash,
      visitDate: visitPriyaDate,
      inTime: visitTime(14, 30, visitPriyaDate),
      outTime: visitTime(15, 10, visitPriyaDate),
      durationMins: 40,
      customerType: "NEW",
      visitType: "WALK_IN",
      purchaseStatus: "NOT_PURCHASED",
      productsExplored: ["NECKLACE", "EAR_RINGS"],
      productsPurchased: [],
      intentTier: "HOT",
      reasonNoPurchase: "EXPLORING",
      budgetStated: "K50_1L",
      sourceChannel: "SOCIAL_MEDIA",
      area: "Gachibowli",
      ...visitDenormFields({
        transactionAmount: null,
        budgetStated: "K50_1L",
        purchaseStatus: "NOT_PURCHASED",
        dateOfBirth: null,
        anniversary: null,
      }),
    },
  });

  const visitAmitDate = dayInCurrentMonth(3);
  await prisma.visit.create({
    data: {
      storeId: storeAlpha.id,
      staffId: staffA.id,
      customerName: piiAmit.name,
      customerPhone: piiAmit.phone,
      customerPhoneHash: piiAmit.phoneHash,
      visitDate: visitAmitDate,
      inTime: visitTime(16, 0, visitAmitDate),
      outTime: visitTime(16, 25, visitAmitDate),
      durationMins: 25,
      customerType: "REPEAT",
      visitType: "APPOINTMENT",
      purchaseStatus: "NOT_PURCHASED",
      productsExplored: ["CHAINS"],
      productsPurchased: [],
      intentTier: "COLD",
      reasonNoPurchase: "BUDGET",
      budgetStated: "UNDER_15K",
      sourceChannel: "REFERRAL",
      area: "Madhapur",
      ...visitDenormFields({
        transactionAmount: null,
        budgetStated: "UNDER_15K",
        purchaseStatus: "NOT_PURCHASED",
        dateOfBirth: null,
        anniversary: null,
      }),
    },
  });

  const visitVikramDate = dayInCurrentMonth(4);
  await prisma.visit.create({
    data: {
      storeId: storeAlpha.id,
      staffId: staffA.id,
      customerName: piiVikram.name,
      customerPhone: piiVikram.phone,
      customerPhoneHash: piiVikram.phoneHash,
      visitDate: visitVikramDate,
      inTime: visitTime(12, 0, visitVikramDate),
      outTime: visitTime(13, 20, visitVikramDate),
      durationMins: 80,
      customerType: "VIP",
      visitType: "APPOINTMENT",
      purchaseStatus: "PURCHASED",
      productsExplored: ["NECKLACE_PENDANT_EARRINGS"],
      productsPurchased: ["NECKLACE_PENDANT_EARRINGS"],
      transactionAmount: 125000,
      intentTier: "HOT",
      purchaseOccasion: "WEDDING",
      metalKtPref: "GOLD_22KT",
      budgetStated: "ABOVE_1L",
      sourceChannel: "PHONE",
      area: "Hitech City",
      ...visitDenormFields({
        transactionAmount: 125000,
        budgetStated: "ABOVE_1L",
        purchaseStatus: "PURCHASED",
        dateOfBirth: null,
        anniversary: null,
      }),
    },
  });

  const visitMeeraDate = dayInCurrentMonth(5);
  const visitMeera = await prisma.visit.create({
    data: {
      storeId: storeAlpha.id,
      staffId: staffA.id,
      customerName: piiMeera.name,
      customerPhone: piiMeera.phone,
      customerPhoneHash: piiMeera.phoneHash,
      visitDate: visitMeeraDate,
      inTime: visitTime(10, 45, visitMeeraDate),
      outTime: visitTime(11, 30, visitMeeraDate),
      durationMins: 45,
      customerType: "NEW",
      visitType: "WALK_IN",
      purchaseStatus: "NOT_PURCHASED",
      productsExplored: ["BANGLES", "EAR_RINGS"],
      productsPurchased: [],
      intentTier: "WARM",
      reasonNoPurchase: "DESIGN_NOT_LIKED",
      budgetStated: "K15_50K",
      followUpNeeded: true,
      followUpDate: daysFromNow(1),
      sourceChannel: "ORGANIC_WALK_IN",
      area: "Kondapur",
      lastCallAnswered: "NOT_ANSWERED",
      lastCallAt: visitTime(17, 0, visitMeeraDate),
      ...visitDenormFields({
        transactionAmount: null,
        budgetStated: "K15_50K",
        purchaseStatus: "NOT_PURCHASED",
        dateOfBirth: null,
        anniversary: null,
      }),
    },
  });

  await prisma.followUp.create({
    data: {
      visitId: visitMeera.id,
      assignedStaffId: staffA.id,
      followUpDate: daysFromNow(1),
      reason: "Design alternatives follow-up",
      status: "OPEN",
      callOutcome: "NOT_ANSWERED",
      outcomeDate: daysAgo(1),
    },
  });

  await prisma.staffCallLog.create({
    data: {
      visitId: visitMeera.id,
      staffId: staffA.id,
      answered: "NOT_ANSWERED",
      feedback: "Rang twice, no answer",
    },
  });

  const visitRahulDate = dayInCurrentMonth(6);
  const visitRahul = await prisma.visit.create({
    data: {
      storeId: storeAlpha.id,
      staffId: staffA.id,
      customerName: piiRahul.name,
      customerPhone: piiRahul.phone,
      customerPhoneHash: piiRahul.phoneHash,
      visitDate: visitRahulDate,
      inTime: visitTime(15, 0, visitRahulDate),
      outTime: visitTime(15, 40, visitRahulDate),
      durationMins: 40,
      customerType: "NEW",
      visitType: "WALK_IN",
      purchaseStatus: "NOT_PURCHASED",
      productsExplored: ["FINGER_RINGS"],
      productsPurchased: [],
      intentTier: "WARM",
      reasonNoPurchase: "WILL_VISIT_AGAIN",
      budgetStated: "K15_50K",
      followUpNeeded: true,
      followUpDate: daysFromNow(3),
      sourceChannel: "INTERNET",
      area: "Secunderabad",
      lastCallAnswered: "ANSWERED",
      lastCallAt: visitTime(16, 0, visitRahulDate),
      ...visitDenormFields({
        transactionAmount: null,
        budgetStated: "K15_50K",
        purchaseStatus: "NOT_PURCHASED",
        dateOfBirth: null,
        anniversary: null,
      }),
    },
  });

  await prisma.staffCallLog.create({
    data: {
      visitId: visitRahul.id,
      staffId: staffA.id,
      answered: "ANSWERED",
      feedback: "Interested in ring designs, asked to call back next week",
    },
  });

  const visitSunitaDate = dayInCurrentMonth(7);
  const visitSunita = await prisma.visit.create({
    data: {
      storeId: storeAlpha.id,
      staffId: staffA.id,
      customerName: piiSunita.name,
      customerPhone: piiSunita.phone,
      customerPhoneHash: piiSunita.phoneHash,
      visitDate: visitSunitaDate,
      inTime: visitTime(11, 0, visitSunitaDate),
      outTime: visitTime(11, 50, visitSunitaDate),
      durationMins: 50,
      customerType: "REPEAT",
      visitType: "WALK_IN",
      purchaseStatus: "NOT_PURCHASED",
      productsExplored: ["PENDANTS", "NECKLACE"],
      productsPurchased: [],
      intentTier: "HOT",
      reasonNoPurchase: "COMPETITOR",
      competitorMention: "Tanishq",
      budgetStated: "K50_1L",
      followUpNeeded: true,
      followUpDate: daysFromNow(2),
      sourceChannel: "TANISHQ_REF",
      area: "Ameerpet",
      ...visitDenormFields({
        transactionAmount: null,
        budgetStated: "K50_1L",
        purchaseStatus: "NOT_PURCHASED",
        dateOfBirth: null,
        anniversary: null,
      }),
    },
  });

  await prisma.followUp.create({
    data: {
      visitId: visitSunita.id,
      assignedStaffId: staffA.id,
      followUpDate: daysFromNow(2),
      reason: "Competitor comparison follow-up",
      status: "OPEN",
    },
  });

  const visitDeepaDate = dayInCurrentMonth(8);
  await prisma.visit.create({
    data: {
      storeId: storeAlpha.id,
      staffId: staffA.id,
      customerName: piiDeepa.name,
      customerPhone: piiDeepa.phone,
      customerPhoneHash: piiDeepa.phoneHash,
      visitDate: visitDeepaDate,
      inTime: visitTime(17, 15, visitDeepaDate),
      outTime: visitTime(17, 45, visitDeepaDate),
      durationMins: 30,
      customerType: "NEW",
      visitType: "WALK_IN",
      purchaseStatus: "NOT_PURCHASED",
      productsExplored: ["EAR_RINGS"],
      productsPurchased: [],
      intentTier: "BROWSING",
      reasonNoPurchase: "EXPLORING",
      budgetStated: "UNDER_15K",
      sourceChannel: "ORGANIC_WALK_IN",
      area: "Kukatpally",
      ...visitDenormFields({
        transactionAmount: null,
        budgetStated: "UNDER_15K",
        purchaseStatus: "NOT_PURCHASED",
        dateOfBirth: null,
        anniversary: null,
      }),
    },
  });

  // ── Staff B visit (Store Alpha) ────────────────────────────────────────────

  const visitKaran = await prisma.visit.create({
    data: {
      storeId: storeAlpha.id,
      staffId: staffB.id,
      customerId: customerKaran.id,
      customerName: piiKaran.name,
      customerPhone: piiKaran.phone,
      customerPhoneHash: piiKaran.phoneHash,
      visitDate: daysAgo(2),
      inTime: visitTime(13, 0, daysAgo(2)),
      outTime: visitTime(13, 35, daysAgo(2)),
      durationMins: 35,
      customerType: "NEW",
      visitType: "WALK_IN",
      purchaseStatus: "NOT_PURCHASED",
      productsExplored: ["BANGLES", "EAR_RINGS"],
      productsPurchased: [],
      intentTier: "WARM",
      reasonNoPurchase: "BUDGET",
      budgetStated: "UNDER_15K",
      followUpNeeded: true,
      followUpDate: daysFromNow(3),
      sourceChannel: "ORGANIC_WALK_IN",
      area: "Jubilee Hills",
    },
  });

  await prisma.followUp.create({
    data: {
      visitId: visitKaran.id,
      assignedStaffId: staffB.id,
      followUpDate: daysFromNow(3),
      reason: "Budget follow-up",
      status: "OPEN",
    },
  });

  // ── Staff C visit (Store Beta) ─────────────────────────────────────────────

  const piiCustomerC = customerPii("Lakshmi Rao", "9810001003");
  await prisma.customer.create({
    data: {
      ...customerCreatePii(piiCustomerC),
      area: "Indiranagar",
      gender: "FEMALE",
      ageGroup: "18-25",
      storeId: storeBeta.id,
    },
  });

  await prisma.visit.create({
    data: {
      storeId: storeBeta.id,
      staffId: staffC.id,
      customerName: piiCustomerC.name,
      customerPhone: piiCustomerC.phone,
      customerPhoneHash: piiCustomerC.phoneHash,
      visitDate: daysAgo(3),
      inTime: visitTime(12, 30, daysAgo(3)),
      outTime: visitTime(13, 0, daysAgo(3)),
      durationMins: 30,
      customerType: "VIP",
      visitType: "APPOINTMENT",
      purchaseStatus: "NOT_PURCHASED",
      productsExplored: ["NECKLACE_PENDANT_EARRINGS"],
      productsPurchased: [],
      intentTier: "HOT",
      budgetStated: "ABOVE_1L",
      sourceChannel: "PHONE",
      area: "Indiranagar",
    },
  });

  // ── Field sales (Staff A — GHS / GPP) ─────────────────────────────────────

  const piiField1 = customerPii("Rajesh Naidu", "9810002001");
  const fieldSale1Date = dayInCurrentMonth(9);
  await prisma.fieldSale.create({
    data: {
      storeId: storeAlpha.id,
      staffId: staffA.id,
      customerName: piiField1.name,
      customerPhone: piiField1.phone,
      customerPhoneHash: piiField1.phoneHash,
      activityDate: fieldSale1Date,
      startTime: visitTime(10, 0, fieldSale1Date),
      endTime: visitTime(10, 35, fieldSale1Date),
      durationMins: 35,
      customerType: "NEW",
      area: "Miyapur",
      gender: "MALE",
      ageGroup: "36-50",
      profession: "Shop owner",
      activityType: "HOUSING_SOCIETY",
      locationLabel: "Lake View Apartments",
      schemesPitched: ["GHS"],
      enrollmentOutcome: "ENROLLED_GHS",
      monthlyCommitment: 5000,
      intentTier: "HOT",
      ...fieldSaleDenormFields({
        monthlyCommitment: 5000,
        dateOfBirth: null,
        anniversary: null,
      }),
    },
  });

  const piiLakshmi = customerPii("Lakshmi Devi", "9810001042");
  const managerVisitDate = daysAgo(10);
  const managerVisit = await prisma.visit.create({
    data: {
      storeId: storeAlpha.id,
      staffId: managerAlpha.id,
      customerName: piiLakshmi.name,
      customerPhone: piiLakshmi.phone,
      customerPhoneHash: piiLakshmi.phoneHash,
      customerNameSearch: piiLakshmi.nameSearch,
      phoneLast4: piiLakshmi.phoneLast4,
      visitDate: managerVisitDate,
      inTime: visitTime(11, 30, managerVisitDate),
      outTime: visitTime(12, 15, managerVisitDate),
      durationMins: 45,
      customerType: "REPEAT",
      visitType: "WALK_IN",
      purchaseStatus: "NOT_PURCHASED",
      productsExplored: ["FINGER_RINGS", "NECKLACE"],
      productsPurchased: [],
      intentTier: "WARM",
      reasonNoPurchase: "WILL_VISIT_AGAIN",
      budgetStated: "K15_50K",
      followUpNeeded: true,
      followUpDate: daysAgo(7),
      sourceChannel: "ORGANIC_WALK_IN",
      area: "Banjara Hills",
      ...visitDenormFields({
        transactionAmount: null,
        budgetStated: "K15_50K",
        purchaseStatus: "NOT_PURCHASED",
        dateOfBirth: null,
        anniversary: null,
      }),
    },
  });

  await prisma.followUp.create({
    data: {
      visitId: managerVisit.id,
      assignedStaffId: managerAlpha.id,
      followUpDate: daysAgo(7),
      reason: "Ring resizing follow-up — customer asked to call back",
      status: "OPEN",
    },
  });

  const piiField2 = customerPii("Sneha Gupta", "9810002002");
  const fieldSale2Date = dayInCurrentMonth(10);
  await prisma.fieldSale.create({
    data: {
      storeId: storeAlpha.id,
      staffId: staffA.id,
      customerName: piiField2.name,
      customerPhone: piiField2.phone,
      customerPhoneHash: piiField2.phoneHash,
      activityDate: fieldSale2Date,
      startTime: visitTime(16, 30, fieldSale2Date),
      endTime: visitTime(17, 0, fieldSale2Date),
      durationMins: 30,
      customerType: "NEW",
      area: "Kukatpally",
      gender: "FEMALE",
      ageGroup: "26-35",
      profession: "IT professional",
      activityType: "DOOR_TO_DOOR",
      locationLabel: "Phase 2, Street 4",
      schemesPitched: ["GHS", "GPP"],
      enrollmentOutcome: "INTERESTED",
      intentTier: "WARM",
      followUpNeeded: true,
      followUpDate: daysFromNow(2),
      staffNotes: "Wants to compare GPP vs GHS before deciding",
      ...fieldSaleDenormFields({
        monthlyCommitment: null,
        dateOfBirth: null,
        anniversary: null,
      }),
    },
  });

  const analyticsSeed = await seedPortfolioAnalyticsData({
    storeAlpha,
    sharmaGachibowli,
    storeBeta,
    luxeKoramangala,
    royalBandra,
    diamondSurat,
    staffA,
    staffB,
    staffC,
    staffSharma,
    staffRoyal,
    staffLuxe,
    staffSurat,
  });

  // Dev login accounts — email-only when DEV_AUTH_BYPASS=true
  await upsertAppUser({
    email: "admin@fineset.local",
    name: "FineSet Admin",
    role: "MASTER_ADMIN",
    storeId: null,
    lastLoginAt: daysAgo(0),
  });

  const adminUser = await prisma.appUser.findUnique({
    where: { email: "admin@fineset.local" },
    select: { id: true },
  });
  if (adminUser) {
    await grantAnalyticsCredits({
      appUserId: adminUser.id,
      credits: 25,
      description: "Dev seed — starter analytics credits",
    });
  }

  await upsertAppUser({
    email: "manager@store-alpha.local",
    name: "Store Alpha Owner",
    role: "BUSINESS_OWNER",
    storeId: storeAlpha.id,
    lastLoginAt: daysAgo(1),
  });
  await upsertAppUser({
    email: "store-manager@store-alpha.local",
    name: "Store Alpha Manager",
    role: "STORE_MANAGER",
    storeId: storeAlpha.id,
    staffId: managerAlpha.id,
  });
  await upsertAppUser({
    email: "staff-a@store-alpha.local",
    name: "Staff Member A",
    role: "STAFF",
    storeId: storeAlpha.id,
    staffId: staffA.id,
  });
  await upsertAppUser({
    email: "owner@royal-time.local",
    name: "Rajesh Malhotra",
    role: "BUSINESS_OWNER",
    lastLoginAt: daysAgo(14),
  });
  await upsertAppUser({
    email: "bags@luxebags.local",
    name: "Ananya Reddy",
    role: "BUSINESS_OWNER",
    lastLoginAt: daysAgo(3),
  });
  await upsertAppUser({
    email: "preeti@handbags-boutique.local",
    name: "Preeti Handbags",
    role: "BUSINESS_OWNER",
    lastLoginAt: daysAgo(2),
  });
  await upsertAppUser({
    email: "heritage@kochi.local",
    name: "Thomas Varghese",
    role: "BUSINESS_OWNER",
    lastLoginAt: daysAgo(45),
  });
  await upsertAppUser({
    email: "mixed@jewels.local",
    name: "Kiran Patel",
    role: "BUSINESS_OWNER",
    lastLoginAt: daysAgo(7),
  });

  const billingAnchorAlpha = dayInPastMonth(4, 8);
  const billingAnchorRoyal = dayInPastMonth(5, 21);
  const royalPaidThrough = getActivationBillingPeriod(
    billingAnchorRoyal,
    dayInPastMonth(2, 21),
  ).periodEnd;
  const alphaPaidThrough = getActivationBillingPeriod(
    billingAnchorAlpha,
    dayInPastMonth(0, 12),
  ).periodEnd;

  await prisma.store.updateMany({
    where: { businessOwnerEmail: "manager@store-alpha.local" },
    data: { createdAt: billingAnchorAlpha },
  });
  await prisma.store.updateMany({
    where: { businessOwnerEmail: "owner@royal-time.local" },
    data: { createdAt: billingAnchorRoyal },
  });
  await prisma.store.updateMany({
    where: { businessOwnerEmail: "bags@luxebags.local" },
    data: { createdAt: dayInPastMonth(3, 3) },
  });

  const billingSeed = {
    storeAlpha: await seedBillingAccountWithInvoices({
      businessKey: "manager@store-alpha.local",
      businessName: "Store Alpha Owner",
      businessEmail: "manager@store-alpha.local",
      paymentStatus: "PAID",
      billingAnchorAt: billingAnchorAlpha,
      paidAt: dayInPastMonth(0, 12),
      paidThroughPeriodEnd: alphaPaidThrough,
      sentByEmail: "admin@fineset.local",
      invoices: [
        { monthsAgo: 4, day: 8, grandTotal: 5_900 },
        { monthsAgo: 3, day: 8, grandTotal: 5_900 },
        { monthsAgo: 2, day: 8, grandTotal: 11_800 },
        { monthsAgo: 1, day: 8, grandTotal: 11_800 },
        { monthsAgo: 0, day: 8, grandTotal: 11_800 },
      ],
    }),
    royalTime: await seedBillingAccountWithInvoices({
      businessKey: "owner@royal-time.local",
      businessName: "Rajesh Malhotra",
      businessEmail: "owner@royal-time.local",
      paymentStatus: "UNPAID",
      billingAnchorAt: billingAnchorRoyal,
      paidAt: null,
      paidThroughPeriodEnd: royalPaidThrough,
      sentByEmail: "admin@fineset.local",
      invoices: [
        { monthsAgo: 4, day: 21, grandTotal: 17_700 },
        { monthsAgo: 3, day: 21, grandTotal: 17_700 },
        { monthsAgo: 2, day: 21, grandTotal: 17_700 },
        { monthsAgo: 1, day: 21, grandTotal: 17_700 },
        { monthsAgo: 0, day: 21, grandTotal: 17_700 },
      ],
    }),
    luxeBags: await seedBillingAccountWithInvoices({
      businessKey: "bags@luxebags.local",
      businessName: "Ananya Reddy",
      businessEmail: "bags@luxebags.local",
      paymentStatus: "PAID",
      billingAnchorAt: dayInPastMonth(3, 3),
      paidAt: dayInPastMonth(0, 5),
      paidThroughPeriodEnd: getActivationBillingPeriod(
        dayInPastMonth(3, 3),
        dayInPastMonth(0, 5),
      ).periodEnd,
      sentByEmail: "admin@fineset.local",
      invoices: [
        { monthsAgo: 3, day: 3, grandTotal: 5_900 },
        { monthsAgo: 2, day: 3, grandTotal: 5_900 },
        { monthsAgo: 1, day: 3, grandTotal: 5_900 },
        { monthsAgo: 0, day: 3, grandTotal: 5_900 },
      ],
    }),
  };

  console.log("Seed complete:", {
    stores: 10,
    portfolioBusinesses: 7,
    staff: 12,
    storeManagerEmployeeId: managerAlpha.employeeId,
    customers: 10,
    visitsForStaffA: 8,
    visitsTotal: 10 + analyticsSeed.visits,
    portfolioAnalyticsVisits: analyticsSeed.visits,
    fieldSalesTotal: 2 + analyticsSeed.fieldSales,
    portfolioAnalyticsFieldSales: analyticsSeed.fieldSales,
    followUps: 4,
    managerOverdueFollowUpVisitId: managerVisit.id,
    callLogs: 2,
    portfolioHint:
      "Analytics: admin@fineset.local → Dashboard → Analytics. Try city/store filters and 'Last 30 days revenue by source'. Portfolio: 7 businesses with mixed payment statuses.",
    loginHint:
      "DEV_AUTH_BYPASS: sign in with email only (e.g. admin@fineset.local). Optional password: FineSet#1dev",
    billingHint:
      "Profile → Billing: manager@store-alpha.local (paid), owner@royal-time.local (multi-period overdue), bags@luxebags.local (paid).",
    billingInvoiceLogs:
      billingSeed.storeAlpha.invoiceCount +
      billingSeed.royalTime.invoiceCount +
      billingSeed.luxeBags.invoiceCount,
    sampleVisitId: visitAnita.id,
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
