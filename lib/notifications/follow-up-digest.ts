/**
 * Placeholder for follow-up reminder notifications (email/push).
 * Wire to a cron job or Supabase edge function when a provider is configured.
 */
export interface FollowUpDigestItem {
  followUpId: string;
  storeId: string;
  staffEmail: string;
  dueDate: string;
}

export async function sendFollowUpDigest(_items: FollowUpDigestItem[]): Promise<void> {
  // No-op until RESEND_API_KEY or push provider is configured.
}
