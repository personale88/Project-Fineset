/**
 * Dev test users linked to seeded stores (after npm run db:seed).
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
  storeName?: string;
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
    storeName: "Store Alpha",
  },
  {
    email: "store-manager@store-alpha.local",
    name: "Store Alpha Manager",
    role: "STORE_MANAGER",
    employeeId: "MGR001",
    storeName: "Store Alpha",
  },
  {
    email: "staff-a@store-alpha.local",
    name: "Staff Member A",
    role: "STAFF",
    employeeId: "EMP001",
    storeName: "Store Alpha",
  },
  {
    email: "owner@royal-time.local",
    name: "Rajesh Malhotra",
    role: "BUSINESS_OWNER",
    storeName: "Royal Watches Bandra",
  },
  {
    email: "bags@luxebags.local",
    name: "Ananya Reddy",
    role: "BUSINESS_OWNER",
    storeName: "Luxe Bags Koramangala",
  },
  {
    email: "preeti@handbags-boutique.local",
    name: "Preeti Handbags",
    role: "BUSINESS_OWNER",
    storeName: "Store Beta",
  },
  {
    email: "heritage@kochi.local",
    name: "Thomas Varghese",
    role: "BUSINESS_OWNER",
    storeName: "Heritage Jewels MG Road",
  },
  {
    email: "mixed@jewels.local",
    name: "Kiran Patel",
    role: "BUSINESS_OWNER",
    storeName: "Diamond District Surat",
  },
];

async function resolveStoreId(storeName: string): Promise<string> {
  const store = await prisma.store.findFirst({
    where: { name: { equals: storeName, mode: "insensitive" } },
    select: { id: true },
  });
  if (!store) {
    throw new Error(
      `Store "${storeName}" not found for dev bootstrap. Run npm run db:seed first.`,
    );
  }
  return store.id;
}

async function main(): Promise<void> {
  const check = validatePassword(DEV_PASSWORD);
  if (!check.success) {
    throw new Error(check.error);
  }

  const passwordHash = await hashCredential(DEV_PASSWORD);

  for (const spec of DEV_USERS) {
    let staffId: string | undefined;
    let storeId: string | null = null;

    if (spec.role !== "MASTER_ADMIN") {
      if (!spec.storeName) {
        throw new Error(`Dev user ${spec.email} requires storeName`);
      }
      storeId = await resolveStoreId(spec.storeName);
    }

    if (spec.employeeId) {
      const staff = await prisma.staff.findFirst({
        where: {
          employeeId: spec.employeeId,
          storeId: storeId ?? undefined,
          isActive: true,
        },
      });
      if (!staff) {
        throw new Error(
          `Staff ${spec.employeeId} not found in ${spec.storeName} for ${spec.email}. Run npm run db:seed first.`,
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
        storeId: storeId ?? undefined,
        staffId,
        passwordHash,
        isActive: true,
        activatedAt: new Date(),
      },
      update: {
        name: spec.name,
        role: spec.role,
        storeId,
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
