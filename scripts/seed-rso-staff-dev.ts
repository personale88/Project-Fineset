/**
 * Add RSO staff names for visit-log import testing (idempotent).
 *
 * Usage: npm run db:seed:rso-staff
 * Prereq: Store Alpha must exist (npm run db:seed)
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const STORE_NAME = "Store Alpha";

const RSO_STAFF = [
  { name: "Vamsi", employeeId: "EMP001" },
  { name: "Mohan", employeeId: "EMP002" },
  { name: "Bhargavi", employeeId: "EMP004" },
  { name: "Parimala", employeeId: "EMP005" },
  { name: "Sailaja", employeeId: "EMP006" },
  { name: "Bhavani", employeeId: "EMP007" },
] as const;

async function ensureStaff(
  storeId: string,
  spec: (typeof RSO_STAFF)[number],
) {
  const byEmployeeId = await prisma.staff.findUnique({
    where: { employeeId: spec.employeeId },
  });

  if (byEmployeeId) {
    if (byEmployeeId.storeId !== storeId) {
      throw new Error(
        `${spec.employeeId} belongs to another store — resolve manually`,
      );
    }
    if (byEmployeeId.name !== spec.name) {
      return prisma.staff.update({
        where: { id: byEmployeeId.id },
        data: { name: spec.name, isActive: true },
      });
    }
    return byEmployeeId;
  }

  const byName = await prisma.staff.findFirst({
    where: {
      storeId,
      name: { equals: spec.name, mode: "insensitive" },
    },
  });

  if (byName) {
    return prisma.staff.update({
      where: { id: byName.id },
      data: { employeeId: spec.employeeId, isActive: true },
    });
  }

  return prisma.staff.create({
    data: {
      name: spec.name,
      employeeId: spec.employeeId,
      storeId,
      role: "STAFF",
      isActive: true,
    },
  });
}

async function main() {
  const store = await prisma.store.findFirst({
    where: { name: { equals: STORE_NAME, mode: "insensitive" } },
  });

  if (!store) {
    throw new Error(`Run npm run db:seed first (${STORE_NAME} not found)`);
  }

  console.log(`Seeding RSO staff for ${STORE_NAME}...\n`);

  for (const spec of RSO_STAFF) {
    const staff = await ensureStaff(store.id, spec);
    console.log(`✓ ${staff.name} (${staff.employeeId})`);
  }

  console.log("\nDone. RSO names are ready for visit-log import.");
}

main()
  .catch((err: unknown) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
