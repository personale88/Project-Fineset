/**
 * Dev test users linked to seeded Store Alpha (after npm run db:seed).
 *
 * Usage: npm run auth:bootstrap-dev
 */
import { randomUUID } from "crypto";
import { PrismaClient } from "@prisma/client";
import { hashCredential } from "../lib/auth/credentials";
import { validatePassword } from "../lib/auth/password-policy";

const prisma = new PrismaClient();

const DEV_PASSWORD = "FineSet#1dev";

interface DevUserSpec {
  email: string;
  name: string;
  role: "MASTER_ADMIN" | "BUSINESS_OWNER" | "STORE_MANAGER" | "STAFF";
  employeeId?: string;
}

const DEV_USERS: DevUserSpec[] = [
  {
    email: "admin@fineset.local",
    name: "FineSet Admin",
    role: "MASTER_ADMIN",
  },
  {
    email: "manager@store-alpha.local",
    name: "Store Alpha Owner",
    role: "BUSINESS_OWNER",
  },
  {
    email: "store-manager@store-alpha.local",
    name: "Store Alpha Manager",
    role: "STORE_MANAGER",
    employeeId: "MGR001",
  },
  {
    email: "staff-a@store-alpha.local",
    name: "Staff Member A",
    role: "STAFF",
    employeeId: "EMP001",
  },
];

async function main(): Promise<void> {
  const check = validatePassword(DEV_PASSWORD);
  if (!check.success) {
    throw new Error(check.error);
  }

  const storeAlpha = await prisma.store.findFirst({
    where: { name: { equals: "Store Alpha", mode: "insensitive" } },
  });
  if (!storeAlpha) {
    throw new Error("Run npm run db:seed first (Store Alpha not found)");
  }

  const passwordHash = await hashCredential(DEV_PASSWORD);

  for (const spec of DEV_USERS) {
    let staffId: string | undefined;

    if (spec.employeeId) {
      const staff = await prisma.staff.findFirst({
        where: {
          employeeId: spec.employeeId,
          storeId: storeAlpha.id,
          isActive: true,
        },
      });
      if (!staff) {
        throw new Error(
          `Staff ${spec.employeeId} not found in Store Alpha for ${spec.email}. Run npm run db:seed first.`,
        );
      }
      staffId = staff.id;
    }

    if (spec.role === "STAFF" && !staffId) {
      throw new Error(
        `Cannot bootstrap ${spec.email}: STAFF users require a linked staff record.`,
      );
    }

    await prisma.appUser.upsert({
      where: { email: spec.email },
      create: {
        authId: randomUUID(),
        email: spec.email,
        name: spec.name,
        role: spec.role,
        storeId: spec.role === "MASTER_ADMIN" ? undefined : storeAlpha.id,
        staffId,
        passwordHash,
        isActive: true,
        activatedAt: new Date(),
      },
      update: {
        name: spec.name,
        role: spec.role,
        storeId: spec.role === "MASTER_ADMIN" ? null : storeAlpha.id,
        ...(staffId ? { staffId } : {}),
        passwordHash,
        isActive: true,
        activatedAt: new Date(),
      },
    });

    console.log(`Dev user ready: ${spec.email} (${spec.role}) password ${DEV_PASSWORD}`);
  }
}

main()
  .catch((err: unknown) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
