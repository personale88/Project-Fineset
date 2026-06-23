import { prisma } from "@/lib/db/prisma";

export type AutomationDeliveryAction =
  | "INVOICE"
  | "PAYMENT_REMINDER"
  | "PAYMENT_CONFIRMATION"
  | "RENEWAL_REMINDER"
  | "EXPIRY_WARNING"
  | "MONTHLY_REPORT"
  | "WHATSAPP_REMINDER";

export function buildAutomationDedupeKey(parts: string[]): string {
  return parts.filter(Boolean).join(":");
}

export async function wasAutomationDelivered(dedupeKey: string): Promise<boolean> {
  const row = await prisma.automationDeliveryLog.findUnique({
    where: { dedupeKey },
    select: { id: true },
  });
  return row !== null;
}

export async function countAutomationDeliveries(input: {
  businessKey: string;
  actionType: AutomationDeliveryAction;
  cycleKey: string;
}): Promise<number> {
  return prisma.automationDeliveryLog.count({
    where: {
      businessKey: input.businessKey,
      actionType: input.actionType,
      dedupeKey: { startsWith: `${input.businessKey}:${input.actionType}:${input.cycleKey}:` },
    },
  });
}

export async function recordAutomationDelivery(input: {
  businessKey?: string | null;
  actionType: AutomationDeliveryAction;
  dedupeKey: string;
  channel?: string | null;
  status: "SUCCESS" | "SKIPPED" | "FAILED" | "QUEUED";
  message?: string | null;
  dryRun?: boolean;
}): Promise<void> {
  if (input.dryRun) return;

  await prisma.automationDeliveryLog.upsert({
    where: { dedupeKey: input.dedupeKey },
    create: {
      businessKey: input.businessKey ?? null,
      actionType: input.actionType,
      dedupeKey: input.dedupeKey,
      channel: input.channel ?? null,
      status: input.status,
      message: input.message ?? null,
    },
    update: {
      status: input.status,
      message: input.message ?? null,
    },
  });
}
