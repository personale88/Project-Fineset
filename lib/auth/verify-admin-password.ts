import { verifyCredential } from "@/lib/auth/credentials";
import { loadAppUserProfileByEmail } from "@/lib/auth/load-app-user-profile";

/**
 * Verifies the master admin password without mutating the current session cookies.
 */
export async function verifyAdminPassword(
  email: string,
  password: string,
): Promise<boolean> {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail || !password) {
    return false;
  }

  const profile = await loadAppUserProfileByEmail(normalizedEmail);
  if (!profile?.passwordHash || profile.role !== "MASTER_ADMIN") {
    return false;
  }

  return verifyCredential(password, profile.passwordHash);
}
