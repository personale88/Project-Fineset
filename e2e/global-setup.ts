import { randomUUID } from "crypto";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { config as loadDotenv } from "dotenv";
import { PrismaClient } from "@prisma/client";
import { hashCredential } from "../lib/auth/credentials";
import { createPasswordResetToken, createInviteToken } from "../lib/auth/action-tokens";

loadDotenv({ path: resolve(__dirname, "../.env.local") });

const FIXTURES_PATH = resolve(__dirname, ".auth-fixtures.json");
const E2E_RESET_EMAIL = "e2e-reset@fineset.local";
const E2E_RESET_PASSWORD = "E2eFixture#9test";
const DEV_PASSWORD = "FineSet#1dev";

async function ensureDevPortalUsers(prisma: PrismaClient): Promise<void> {
  const storeAlpha = await prisma.store.findFirst({
    where: { name: { equals: "Store Alpha", mode: "insensitive" }, isActive: true },
    select: { id: true },
  });
  if (!storeAlpha) return;

  const passwordHash = await hashCredential(DEV_PASSWORD);
  const specs = [
    {
      email: "admin@fineset.local",
      name: "FineSet Admin",
      role: "MASTER_ADMIN" as const,
    },
    {
      email: "manager@store-alpha.local",
      name: "Store Alpha Owner",
      role: "BUSINESS_OWNER" as const,
    },
    {
      email: "store-manager@store-alpha.local",
      name: "Store Alpha Manager",
      role: "STORE_MANAGER" as const,
      employeeId: "MGR001",
    },
    {
      email: "staff-a@store-alpha.local",
      name: "Staff Member A",
      role: "STAFF" as const,
      employeeId: "EMP001",
    },
  ];

  for (const spec of specs) {
    let staffId: string | undefined;
    if ("employeeId" in spec && spec.employeeId) {
      const staff = await prisma.staff.findFirst({
        where: {
          employeeId: spec.employeeId,
          storeId: storeAlpha.id,
          isActive: true,
        },
        select: { id: true },
      });
      staffId = staff?.id;
      if (spec.role === "STAFF" && !staffId) continue;
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
  }
}

async function ensureDevPlatformAdminUsers(prisma: PrismaClient): Promise<void> {
  const passwordHash = await hashCredential(DEV_PASSWORD);
  const specs = [
    {
      email: "platform-admin-no-billing@store-alpha.local",
      name: "Platform Admin No Billing",
      adminPermissions: { portfolio: true, accounts: true, analytics: true },
    },
    {
      email: "platform-admin-billing@store-alpha.local",
      name: "Platform Admin Billing",
      adminPermissions: { portfolio: true, accounts: true, billing: true },
    },
  ] as const;

  for (const spec of specs) {
    await prisma.appUser.upsert({
      where: { email: spec.email },
      create: {
        authId: randomUUID(),
        email: spec.email,
        name: spec.name,
        role: "PLATFORM_ADMIN",
        adminPermissions: spec.adminPermissions,
        passwordHash,
        isActive: true,
        activatedAt: new Date(),
      },
      update: {
        name: spec.name,
        role: "PLATFORM_ADMIN",
        adminPermissions: spec.adminPermissions,
        passwordHash,
        isActive: true,
        activatedAt: new Date(),
      },
    });
  }
}

export default async function globalSetup(): Promise<void> {
  if (!process.env.DATABASE_URL?.trim()) {
    writeFileSync(FIXTURES_PATH, JSON.stringify({ skip: true, reason: "no DATABASE_URL" }));
    return;
  }

  const prisma = new PrismaClient();

  try {
    const passwordHash = await hashCredential(E2E_RESET_PASSWORD);
    const resetUser = await prisma.appUser.upsert({
      where: { email: E2E_RESET_EMAIL },
      create: {
        authId: randomUUID(),
        email: E2E_RESET_EMAIL,
        name: "E2E Reset User",
        role: "STAFF",
        passwordHash,
        isActive: true,
        activatedAt: new Date(),
      },
      update: {
        passwordHash,
        isActive: true,
      },
    });

    const resetToken = await createPasswordResetToken(resetUser.id);

    let inviteToken: string | null = null;
    let inviteEmail: string | null = null;
    const pendingInvite = await prisma.appUser.findFirst({
      where: {
        email: { startsWith: "e2e-invite-" },
        isActive: false,
        passwordHash: null,
      },
      orderBy: { createdAt: "desc" },
      select: { id: true, email: true },
    });

    if (pendingInvite) {
      inviteToken = await createInviteToken(pendingInvite.id);
      inviteEmail = pendingInvite.email;
    }

    const adminEmail = process.env.MASTER_ADMIN_EMAIL?.trim().toLowerCase();
    const adminPassword = process.env.MASTER_ADMIN_PASSWORD?.trim();
    const adminName = process.env.MASTER_ADMIN_NAME?.trim() ?? "FineSet Admin";

    if (adminEmail && adminPassword) {
      const adminPasswordHash = await hashCredential(adminPassword);
      const adminUser = await prisma.appUser.upsert({
        where: { email: adminEmail },
        create: {
          authId: randomUUID(),
          email: adminEmail,
          name: adminName,
          role: "MASTER_ADMIN",
          passwordHash: adminPasswordHash,
          isActive: true,
          activatedAt: new Date(),
        },
        update: {
          name: adminName,
          role: "MASTER_ADMIN",
          passwordHash: adminPasswordHash,
          isActive: true,
        },
      });

      const ledgerCount = await prisma.analyticsCreditLedger.count({
        where: { account: { appUserId: adminUser.id } },
      });
      if (ledgerCount === 0) {
        await prisma.$transaction(async (tx) => {
          const account = await tx.analyticsCreditAccount.upsert({
            where: { appUserId: adminUser.id },
            create: { appUserId: adminUser.id, balanceCredits: 50 },
            update: { balanceCredits: { increment: 50 } },
          });
          await tx.analyticsCreditLedger.create({
            data: {
              accountId: account.id,
              type: "GRANT",
              amount: 50,
              description: "E2E global setup grant",
            },
          });
        });
      }
    }

    await ensureDevPortalUsers(prisma);
    await ensureDevPlatformAdminUsers(prisma);

    const devPortalUsersReady = Boolean(
      await prisma.appUser.findUnique({
        where: { email: "staff-a@store-alpha.local" },
        select: { id: true },
      }),
    );

    writeFileSync(
      FIXTURES_PATH,
      JSON.stringify({
        skip: false,
        resetToken,
        resetEmail: E2E_RESET_EMAIL,
        resetPassword: E2E_RESET_PASSWORD,
        inviteToken,
        inviteEmail,
        devPortalUsersReady,
      }),
    );
  } finally {
    await prisma.$disconnect();
  }
}
