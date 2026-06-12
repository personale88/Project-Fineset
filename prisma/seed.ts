import { PrismaClient } from "@prisma/client";
import { fieldSaleDenormFields, visitDenormFields } from "../lib/services/call-record-denorm";
import { prepareCustomerPii } from "../lib/services/pii";

const prisma = new PrismaClient();

async function seedStore(data: {
  name: string;
  category: "JEWELRY" | "HANDBAGS" | "WATCHES" | "OTHER";
  city: string;
  state: string;
  pincode?: string;
  businessOwnerName?: string;
  businessOwnerEmail?: string;
}) {
  return prisma.store.create({ data });
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

async function main(): Promise<void> {
  await prisma.authAuditLog.deleteMany();
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
  });

  const storeBeta = await seedStore({
    name: "Store Beta",
    category: "HANDBAGS",
    city: "Bengaluru",
    state: "Karnataka",
    pincode: "560001",
  });

  const staffA = await seedStaff({
    name: "Staff Member A",
    employeeId: "EMP001",
    storeId: storeAlpha.id,
  });

  const staffB = await seedStaff({
    name: "Staff Member B",
    employeeId: "EMP002",
    storeId: storeAlpha.id,
  });

  const staffC = await seedStaff({
    name: "Staff Member C",
    employeeId: "EMP003",
    storeId: storeBeta.id,
  });

  const managerAlpha = await prisma.staff.create({
    data: {
      name: "Store Alpha Manager",
      employeeId: "MGR001",
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

  console.log("Seed complete:", {
    stores: 2,
    staff: 4,
    storeManagerEmployeeId: managerAlpha.employeeId,
    customers: 10,
    visitsForStaffA: 8,
    visitsTotal: 10,
    fieldSalesForStaffA: 2,
    followUps: 3,
    callLogs: 2,
    loginHint: "Run npm run auth:bootstrap-dev && npm run db:seed:mock for 300+ edge-case mock records",
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
