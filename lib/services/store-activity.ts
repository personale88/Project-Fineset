import { prisma } from "@/lib/db/prisma";

export interface StoreActivityItem {
  id: string;
  event: string;
  summary: string;
  actorLabel: string | null;
  createdAt: string;
}

const AUDIT_EVENT_LABELS: Record<string, string> = {
  STAFF_CORRECTION_REQUEST: "Correction request submitted",
  STAFF_CREATED: "Staff member added",
  VISIT_IMPORT: "Visits imported",
  USER_CREATED_WITH_PASSWORD: "User account created",
  INVITE_SENT: "User invite sent",
  STAFF_RECORD_AMENDED: "Staff record updated",
  CUSTOMER_MERGED: "Customer records merged",
};

function auditSummary(event: string, metadata: unknown): string {
  const label = AUDIT_EVENT_LABELS[event] ?? event.replace(/_/g, " ").toLowerCase();
  if (metadata && typeof metadata === "object" && "staffId" in metadata) {
    return label;
  }
  return label;
}

function correctionSummary(staffName: string, status: string): string {
  return status === "RESOLVED"
    ? `${staffName} correction request resolved`
    : `${staffName} submitted a correction request`;
}

export async function listStoreActivity(
  storeId: string,
  limit = 50,
): Promise<StoreActivityItem[]> {
  const perSource = Math.max(limit, 25);

  const [corrections, auditRows] = await Promise.all([
    prisma.correctionRequest.findMany({
      where: { storeId },
      orderBy: { createdAt: "desc" },
      take: perSource,
      include: { staff: { select: { name: true } } },
    }),
    prisma.authAuditLog.findMany({
      where: {
        AND: [
          {
            metadata: {
              path: ["storeId"],
              equals: storeId,
            },
          },
          {
            event: { not: "STAFF_CORRECTION_REQUEST" },
          },
        ],
      },
      orderBy: { createdAt: "desc" },
      take: perSource,
    }),
  ]);

  const items: StoreActivityItem[] = [];

  for (const row of corrections) {
    items.push({
      id: `correction-${row.id}`,
      event: row.status === "RESOLVED" ? "CORRECTION_RESOLVED" : "CORRECTION_OPEN",
      summary: correctionSummary(row.staff.name, row.status),
      actorLabel: row.staff.name,
      createdAt: (row.resolvedAt ?? row.createdAt).toISOString(),
    });
  }

  for (const row of auditRows) {
    items.push({
      id: `audit-${row.id}`,
      event: row.event,
      summary: auditSummary(row.event, row.metadata),
      actorLabel: row.email,
      createdAt: row.createdAt.toISOString(),
    });
  }

  return items
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, limit);
}
