import { prisma } from "@/lib/db/prisma";
import type { AppUserWithRelations } from "@/lib/auth/app-session-from-profile";
import type { AppRole } from "@prisma/client";

function isStaleAppRoleEnumError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return /not found in enum ['"]AppRole['"]/i.test(error.message);
}

type RawAppUserRow = {
  id: string;
  email: string;
  name: string;
  role: string;
  storeId: string | null;
  staffId: string | null;
  isActive: boolean;
  storeName: string | null;
  employeeId: string | null;
  staffStoreId: string | null;
  staffStoreName: string | null;
};

function mapRawRow(row: RawAppUserRow): AppUserWithRelations {
  return {
    id: row.id,
    authId: null,
    passwordHash: null,
    email: row.email,
    name: row.name,
    role: row.role as AppRole,
    storeId: row.storeId,
    staffId: row.staffId,
    isActive: row.isActive,
    invitedAt: null,
    activatedAt: null,
    lastLoginAt: null,
    createdAt: new Date(0),
    updatedAt: new Date(0),
    store: row.storeName ? { name: row.storeName } : null,
    staff:
      row.employeeId && row.staffStoreId
        ? {
            employeeId: row.employeeId,
            storeId: row.staffStoreId,
            store: row.staffStoreName ? { name: row.staffStoreName } : null,
          }
        : row.employeeId
          ? {
              employeeId: row.employeeId,
              storeId: row.staffStoreId ?? row.storeId ?? "",
              store: row.staffStoreName ? { name: row.staffStoreName } : null,
            }
          : null,
  };
}

async function loadAppUserProfileByEmailRaw(
  email: string,
): Promise<AppUserWithRelations | null> {
  const normalized = email.trim().toLowerCase();
  const rows = await prisma.$queryRaw<RawAppUserRow[]>`
    SELECT
      u.id,
      u.email,
      u.name,
      u.role::text AS role,
      u."storeId",
      u."staffId",
      u."isActive",
      s.name AS "storeName",
      st."employeeId",
      st."storeId" AS "staffStoreId",
      ss.name AS "staffStoreName"
    FROM "AppUser" u
    LEFT JOIN "Store" s ON s.id = u."storeId"
    LEFT JOIN "Staff" st ON st.id = u."staffId"
    LEFT JOIN "Store" ss ON ss.id = st."storeId"
    WHERE LOWER(u.email) = ${normalized}
    LIMIT 1
  `;

  const row = rows[0];
  return row ? mapRawRow(row) : null;
}

/** Load AppUser with relations; raw SQL fallback when Prisma enum client is stale. */
export async function loadAppUserProfileByEmail(
  email: string,
): Promise<AppUserWithRelations | null> {
  const normalized = email.trim().toLowerCase();

  try {
    return await prisma.appUser.findUnique({
      where: { email: normalized },
      include: {
        store: { select: { name: true } },
        staff: {
          select: {
            employeeId: true,
            storeId: true,
            store: { select: { name: true } },
          },
        },
      },
    });
  } catch (error) {
    if (!isStaleAppRoleEnumError(error)) {
      throw error;
    }
    console.warn(
      "[auth] Stale Prisma AppRole enum — run `npx prisma generate` and restart dev server",
    );
    return loadAppUserProfileByEmailRaw(normalized);
  }
}

export async function loadAppUserProfileByAuthId(
  authId: string,
): Promise<AppUserWithRelations | null> {
  try {
    return await prisma.appUser.findUnique({
      where: { authId },
      include: {
        store: { select: { name: true } },
        staff: {
          select: {
            employeeId: true,
            storeId: true,
            store: { select: { name: true } },
          },
        },
      },
    });
  } catch (error) {
    if (!isStaleAppRoleEnumError(error)) {
      throw error;
    }
    console.warn(
      "[auth] Stale Prisma AppRole enum — run `npx prisma generate` and restart dev server",
    );
    const rows = await prisma.$queryRaw<RawAppUserRow[]>`
      SELECT
        u.id,
        u.email,
        u.name,
        u.role::text AS role,
        u."storeId",
        u."staffId",
        u."isActive",
        s.name AS "storeName",
        st."employeeId",
        st."storeId" AS "staffStoreId",
        ss.name AS "staffStoreName"
      FROM "AppUser" u
      LEFT JOIN "Store" s ON s.id = u."storeId"
      LEFT JOIN "Staff" st ON st.id = u."staffId"
      LEFT JOIN "Store" ss ON ss.id = st."storeId"
      WHERE u."authId" = ${authId}
      LIMIT 1
    `;
    const row = rows[0];
    return row ? mapRawRow(row) : null;
  }
}
