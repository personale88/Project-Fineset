/**
 * Removes demo / transactional data only. Does NOT touch:
 * - Supabase Auth
 * - AppUser
 * - AuthAuditLog
 *
 * Usage: npm run db:clear-business
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const DEMO_STORE_NAMES = ["Store Alpha", "Store Beta"];
const DEMO_STAFF_EMPLOYEE_IDS = ["EMP002", "EMP003"];

async function main(): Promise<void> {
  const linkedStaffIds = new Set(
    (
      await prisma.appUser.findMany({
        where: { staffId: { not: null } },
        select: { staffId: true },
      })
    )
      .map((u) => u.staffId)
      .filter((id): id is string => id != null),
  );

  const linkedStoreIds = new Set(
    (
      await prisma.appUser.findMany({
        where: { storeId: { not: null } },
        select: { storeId: true },
      })
    )
      .map((u) => u.storeId)
      .filter((id): id is string => id != null),
  );

  const followUps = await prisma.followUp.deleteMany();
  const phoneReveals = await prisma.phoneRevealLog.deleteMany();
  const callLogs = await prisma.staffCallLog.deleteMany();
  const fieldSales = await prisma.fieldSale.deleteMany();
  const visits = await prisma.visit.deleteMany();
  const customers = await prisma.customer.deleteMany();

  if (visits.count > 0) {
    try {
      await prisma.$executeRawUnsafe("SELECT refresh_visit_aggregate()");
    } catch (error) {
      console.warn("Could not refresh visit_daily_aggregate:", error);
    }
  }

  const demoStaff = await prisma.staff.findMany({
    where: { employeeId: { in: DEMO_STAFF_EMPLOYEE_IDS } },
    select: { id: true, employeeId: true },
  });
  let staffRemoved = 0;
  for (const member of demoStaff) {
    if (linkedStaffIds.has(member.id)) continue;
    await prisma.staff.delete({ where: { id: member.id } });
    staffRemoved += 1;
  }

  const demoStores = await prisma.store.findMany({
    where: { name: { in: DEMO_STORE_NAMES } },
    select: { id: true, name: true },
  });
  let storesRemoved = 0;
  for (const store of demoStores) {
    if (linkedStoreIds.has(store.id)) {
      console.log(`Kept store "${store.name}" (linked to AppUser login)`);
      continue;
    }
    await prisma.store.delete({ where: { id: store.id } });
    storesRemoved += 1;
  }

  const remaining = {
    stores: await prisma.store.count(),
    staff: await prisma.staff.count(),
    customers: await prisma.customer.count(),
    visits: await prisma.visit.count(),
    appUsers: await prisma.appUser.count(),
  };

  console.log("Business data cleared (auth untouched):", {
    deleted: {
      followUps: followUps.count,
      phoneRevealLogs: phoneReveals.count,
      staffCallLogs: callLogs.count,
      fieldSales: fieldSales.count,
      visits: visits.count,
      customers: customers.count,
      demoStaff: staffRemoved,
      demoStores: storesRemoved,
    },
    remaining,
    nextSteps: [
      "Log in with existing staff/store passwords",
      "Staff: log new visits at /staff/dashboard/log-visit",
      "Verify store + admin dashboards and Supabase tables",
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
