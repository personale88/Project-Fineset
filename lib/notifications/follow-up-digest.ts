import type { StaffDigestResponse } from "@/lib/api/staff-portal";

const DIGEST_STORAGE_KEY = "fineset-staff-digest-date";

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Browser notification for staff daily digest (once per day). */
export async function requestStaffDigestNotification(
  digest: StaffDigestResponse,
): Promise<void> {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (digest.total === 0) return;

  const shownFor = window.localStorage.getItem(DIGEST_STORAGE_KEY);
  if (shownFor === todayKey()) return;

  if (Notification.permission === "default") {
    await Notification.requestPermission();
  }

  if (Notification.permission !== "granted") return;

  const parts: string[] = [];
  if (digest.overdue > 0) parts.push(`${digest.overdue} overdue`);
  if (digest.dueToday > 0) parts.push(`${digest.dueToday} due today`);

  const body =
    digest.topNames.length > 0
      ? `${parts.join(", ")} — e.g. ${digest.topNames.join(", ")}`
      : parts.join(", ");

  new Notification("MyStore — your work queue", { body });
  window.localStorage.setItem(DIGEST_STORAGE_KEY, todayKey());
}

export interface FollowUpDigestItem {
  customerName: string;
  followUpDate: string;
}

/** Reserved for email/cron provider integration. */
export async function sendFollowUpDigest(_items: FollowUpDigestItem[]): Promise<void> {
  // Wire to Resend or push provider when RESEND_API_KEY is configured.
}
