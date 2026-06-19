import { prisma } from "@/lib/db/prisma";
import { StoreServiceError } from "@/lib/services/store-service-error";

/** Normalize store manager email for Store / AppUser. */
export function normalizeStoreManagerEmail(
  email: string | null | undefined,
): string | null {
  if (email === null || email === undefined) return null;
  const trimmed = email.trim().toLowerCase();
  return trimmed.length > 0 ? trimmed : null;
}

/** True when an update payload includes a manager email change worth syncing. */
export function managerEmailNeedsSync(
  currentManagerEmail: string,
  nextEmail: string | null | undefined,
  emailInPayload: boolean,
): boolean {
  if (!emailInPayload) return false;
  const normalized = normalizeStoreManagerEmail(nextEmail);
  if (!normalized) return false;
  return normalized !== currentManagerEmail.trim().toLowerCase();
}

/** When admin edits store email, sync AppUser login email in Postgres. */
export async function syncStoreManagerEmail(
  storeId: string,
  nextEmailRaw: string | null | undefined,
): Promise<void> {
  if (nextEmailRaw === undefined) return;

  const nextEmail = normalizeStoreManagerEmail(nextEmailRaw);
  if (!nextEmail) return;

  const manager = await prisma.appUser.findFirst({
    where: { storeId, role: "BUSINESS_OWNER" },
    orderBy: { createdAt: "asc" },
  });

  if (!manager) return;

  const currentEmail = manager.email.trim().toLowerCase();
  if (nextEmail === currentEmail) return;

  const conflict = await prisma.appUser.findUnique({
    where: { email: nextEmail },
    select: { id: true },
  });
  if (conflict && conflict.id !== manager.id) {
    throw new StoreServiceError("This email is already registered", 409);
  }

  await prisma.appUser.update({
    where: { id: manager.id },
    data: { email: nextEmail },
  });
}
