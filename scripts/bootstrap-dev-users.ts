/**
 * Phase 2: Dev test users linked to seeded Store Alpha staff (after npm run db:seed).
 *
 * Usage: npm run auth:bootstrap-dev
 */
import { PrismaClient } from "@prisma/client";
import { createAdminClient } from "../lib/supabase/admin";
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
    name: "Vamsi",
    role: "STAFF",
    employeeId: "EMP001",
  },
];

async function ensureAuthUser(
  supabase: ReturnType<typeof createAdminClient>,
  email: string,
  password: string,
  name: string,
  role: string,
): Promise<string> {
  const { data: created, error: createError } =
    await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name, role },
    });

  if (!createError && created.user) {
    return created.user.id;
  }

  if (createError?.message.includes("already been registered")) {
    const { data: listData, error: listError } =
      await supabase.auth.admin.listUsers();
    if (listError) throw listError;
    const found = listData.users.find(
      (u) => u.email?.toLowerCase() === email.toLowerCase(),
    );
    if (!found) throw createError;
    await supabase.auth.admin.updateUserById(found.id, { password });
    return found.id;
  }

  throw createError ?? new Error("Failed to create auth user");
}

async function main(): Promise<void> {
  const check = validatePassword(DEV_PASSWORD);
  if (!check.success) {
    throw new Error(check.error);
  }

  const storeAlpha = await prisma.store.findFirst({
    where: { name: { equals: "Store Alpha", mode: "insensitive" } },
  });
  if (!storeAlpha) {
    throw new Error('Run npm run db:seed first (Store Alpha not found)');
  }

  const supabase = createAdminClient();

  for (const spec of DEV_USERS) {
    const authId = await ensureAuthUser(
      supabase,
      spec.email,
      DEV_PASSWORD,
      spec.name,
      spec.role,
    );

    let staffId: string | undefined;

    if (spec.role === "STAFF" && spec.employeeId) {
      const staff = await prisma.staff.findUnique({
        where: { employeeId: spec.employeeId },
      });
      if (!staff) {
        throw new Error(`Staff ${spec.employeeId} not found — run db:seed`);
      }
      staffId = staff.id;
    }

    if (spec.role === "STORE_MANAGER" && spec.employeeId) {
      let staff = await prisma.staff.findUnique({
        where: { employeeId: spec.employeeId },
      });
      if (!staff) {
        staff = await prisma.staff.create({
          data: {
            name: spec.name,
            employeeId: spec.employeeId,
            role: "STORE_MANAGER",
            storeId: storeAlpha.id,
            isActive: true,
          },
        });
      }
      staffId = staff.id;
    }

    await prisma.appUser.upsert({
      where: { email: spec.email.toLowerCase() },
      create: {
        authId,
        email: spec.email.toLowerCase(),
        name: spec.name,
        role: spec.role,
        storeId:
          spec.role === "MASTER_ADMIN" ? undefined : storeAlpha.id,
        staffId,
        isActive: true,
        activatedAt: new Date(),
      },
      update: {
        authId,
        name: spec.name,
        role: spec.role,
        storeId:
          spec.role === "MASTER_ADMIN" ? null : storeAlpha.id,
        staffId: staffId ?? null,
        isActive: true,
        activatedAt: new Date(),
      },
    });

    console.log(`✓ ${spec.role} ${spec.email}`);
  }

  console.log("\nDev login password for all above:", DEV_PASSWORD);
}

main()
  .catch((err: unknown) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
