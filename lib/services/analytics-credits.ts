import { AnalyticsAskError } from "@/lib/analytics/ask-errors";
import {
  ANALYTICS_CREDIT_PACKS,
  creditsForTokenUsage,
  getAnalyticsCreditPack,
} from "@/lib/analytics/credit-units";
import { getPlatformSettings } from "@/lib/services/platform-settings";
import { prisma } from "@/lib/db/prisma";
import type { AnalyticsCreditLedgerType } from "@prisma/client";

export interface AnalyticsCreditLedgerEntry {
  id: string;
  type: AnalyticsCreditLedgerType;
  amount: number;
  packId: string | null;
  tokensUsed: number | null;
  description: string | null;
  createdAt: string;
}

export interface AnalyticsCreditsSnapshot {
  balanceCredits: number;
  tokensPerCredit: number;
  lowBalanceThreshold: number;
  packs: typeof ANALYTICS_CREDIT_PACKS;
  recentLedger: AnalyticsCreditLedgerEntry[];
}

async function getAnalyticsCreditPolicy() {
  const settings = await getPlatformSettings();
  return {
    enabled: settings.analytics.enabled,
    tokensPerCredit: settings.analytics.tokensPerCredit,
    lowBalanceThreshold: settings.analytics.lowBalanceThreshold,
  };
}

export async function getOrCreateAnalyticsCreditAccount(appUserId: string) {
  return prisma.analyticsCreditAccount.upsert({
    where: { appUserId },
    create: { appUserId, balanceCredits: 0 },
    update: {},
  });
}

export async function getAnalyticsCreditsSnapshot(
  appUserId: string,
): Promise<AnalyticsCreditsSnapshot> {
  const account = await getOrCreateAnalyticsCreditAccount(appUserId);
  const policy = await getAnalyticsCreditPolicy();
  const ledger = await prisma.analyticsCreditLedger.findMany({
    where: { accountId: account.id },
    orderBy: { createdAt: "desc" },
    take: 12,
  });

  return {
    balanceCredits: account.balanceCredits,
    tokensPerCredit: policy.tokensPerCredit,
    lowBalanceThreshold: policy.lowBalanceThreshold,
    packs: ANALYTICS_CREDIT_PACKS,
    recentLedger: ledger.map((entry) => ({
      id: entry.id,
      type: entry.type,
      amount: entry.amount,
      packId: entry.packId,
      tokensUsed: entry.tokensUsed,
      description: entry.description,
      createdAt: entry.createdAt.toISOString(),
    })),
  };
}

export async function assertAnalyticsCreditsAvailable(appUserId: string): Promise<void> {
  const account = await getOrCreateAnalyticsCreditAccount(appUserId);
  if (account.balanceCredits < 1) {
    throw new AnalyticsAskError(
      "INSUFFICIENT_CREDITS",
      "You have no AI credits left. Recharge to continue analyzing your store data.",
      402,
    );
  }
}

export async function deductAnalyticsCredits(input: {
  appUserId: string;
  tokensUsed: number | null;
  description: string;
}): Promise<number> {
  const policy = await getAnalyticsCreditPolicy();
  const credits = creditsForTokenUsage(input.tokensUsed, policy.tokensPerCredit);

  return prisma.$transaction(async (tx) => {
    const account = await tx.analyticsCreditAccount.findUnique({
      where: { appUserId: input.appUserId },
    });

    if (!account || account.balanceCredits < credits) {
      throw new AnalyticsAskError(
        "INSUFFICIENT_CREDITS",
        "Not enough AI credits for this analysis. Recharge to continue.",
        402,
      );
    }

    const updated = await tx.analyticsCreditAccount.update({
      where: { id: account.id },
      data: { balanceCredits: { decrement: credits } },
    });

    await tx.analyticsCreditLedger.create({
      data: {
        accountId: account.id,
        type: "USAGE",
        amount: -credits,
        tokensUsed: input.tokensUsed ?? undefined,
        description: input.description,
      },
    });

    return updated.balanceCredits;
  });
}

export async function rechargeAnalyticsCredits(input: {
  appUserId: string;
  packId: string;
  externalPaymentId: string;
}): Promise<AnalyticsCreditsSnapshot> {
  const pack = getAnalyticsCreditPack(input.packId);
  if (!pack) {
    throw new AnalyticsAskError("INVALID_REQUEST", "Unknown recharge pack.", 400);
  }

  const existingLedger = await prisma.analyticsCreditLedger.findUnique({
    where: { externalPaymentId: input.externalPaymentId },
    select: { accountId: true },
  });

  if (existingLedger) {
    const account = await prisma.analyticsCreditAccount.findUnique({
      where: { id: existingLedger.accountId },
      select: { appUserId: true },
    });
    if (account?.appUserId === input.appUserId) {
      return getAnalyticsCreditsSnapshot(input.appUserId);
    }
    throw new AnalyticsAskError(
      "INVALID_REQUEST",
      "This payment has already been applied to another account.",
      409,
    );
  }

  await prisma.$transaction(async (tx) => {
    const account = await tx.analyticsCreditAccount.upsert({
      where: { appUserId: input.appUserId },
      create: { appUserId: input.appUserId, balanceCredits: pack.credits },
      update: { balanceCredits: { increment: pack.credits } },
    });

    await tx.analyticsCreditLedger.create({
      data: {
        accountId: account.id,
        type: "RECHARGE",
        amount: pack.credits,
        packId: pack.id,
        externalPaymentId: input.externalPaymentId,
        description: `${pack.label} pack — ${pack.credits} credits`,
      },
    });
  });

  return getAnalyticsCreditsSnapshot(input.appUserId);
}

export async function grantAnalyticsCredits(input: {
  appUserId: string;
  credits: number;
  description: string;
}): Promise<void> {
  if (input.credits <= 0) return;

  await prisma.$transaction(async (tx) => {
    const account = await tx.analyticsCreditAccount.upsert({
      where: { appUserId: input.appUserId },
      create: { appUserId: input.appUserId, balanceCredits: input.credits },
      update: { balanceCredits: { increment: input.credits } },
    });

    await tx.analyticsCreditLedger.create({
      data: {
        accountId: account.id,
        type: "GRANT",
        amount: input.credits,
        description: input.description,
      },
    });
  });
}
