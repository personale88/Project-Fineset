import type { Prisma } from "@prisma/client";

/**
 * Visit rows created only to anchor manual/outbound call logs (not floor visits).
 * These stay in the DB for call history but are hidden from visit lists.
 */
export function callOnlyVisitShellExclusion(): Prisma.VisitWhereInput {
  return {
    NOT: {
      OR: [
        { sourceChannel: "USER_CALLS" },
        {
          AND: [
            { sourceChannel: "PHONE" },
            { inTime: null },
            { outTime: null },
            { productsExplored: { isEmpty: true } },
            { productsPurchased: { isEmpty: true } },
            { callLogs: { some: {} } },
          ],
        },
      ],
    },
  };
}
