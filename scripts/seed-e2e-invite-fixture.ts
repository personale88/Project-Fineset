/**
 * Creates a pending invite user for Playwright invite E2E (optional).
 * Usage: dotenv -e .env.local -- tsx scripts/seed-e2e-invite-fixture.ts
 */
import { randomUUID } from "crypto";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const store = await prisma.store.findFirst({
    where: { name: { equals: "Store Alpha", mode: "insensitive" } },
  });
  if (!store) {
    throw new Error("Run npm run db:seed first");
  }

  const employeeId = `E2EINV${Date.now().toString(36).slice(-6)}`;
  const email = `e2e-invite-${Date.now().toString(36)}@test.local`;

  const staff = await prisma.staff.create({
    data: {
      name: "E2E Invite Staff",
      employeeId,
      storeId: store.id,
      role: "STAFF",
      isActive: true,
    },
  });

  await prisma.appUser.create({
    data: {
      authId: randomUUID(),
      email,
      name: staff.name,
      role: "STAFF",
      storeId: store.id,
      staffId: staff.id,
      isActive: false,
      invitedAt: new Date(),
    },
  });

  console.log(`Pending invite user: ${email} (inactive, no password)`);
}

main()
  .catch((err: unknown) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
