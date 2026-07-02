import { refreshVisitAggregate } from "@/lib/analytics/refresh-visit-aggregate";
import { prisma } from "@/lib/db/prisma";
import { createVisit } from "@/lib/services/visits";
import { createVisitSchema } from "@/lib/validations/visit.schema";

export interface VisitImportError {
  row: number;
  message: string;
}

export interface VisitImportResult {
  createdCount: number;
  failedCount: number;
  errors: VisitImportError[];
}

interface ParsedCsv {
  headers: string[];
  rows: string[][];
}

function parseCsv(content: string): ParsedCsv {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < content.length; i++) {
    const ch = content[i];
    const next = content[i + 1];

    if (ch === '"') {
      if (inQuotes && next === '"') {
        cell += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (!inQuotes && ch === ",") {
      row.push(cell);
      cell = "";
      continue;
    }

    if (!inQuotes && (ch === "\n" || ch === "\r")) {
      if (ch === "\r" && next === "\n") i++;
      row.push(cell);
      cell = "";
      rows.push(row);
      row = [];
      continue;
    }

    cell += ch;
  }

  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }

  const normalized = rows
    .map((r) => r.map((c) => c.trim()))
    .filter((r) => r.some((c) => c.length > 0));

  if (normalized.length === 0) return { headers: [], rows: [] };

  const [headers, ...body] = normalized;
  return { headers, rows: body };
}

function keyOf(header: string): string {
  return header.toLowerCase().replace(/[\s_-]+/g, "");
}

function pickValue(row: Record<string, string>, ...aliases: string[]): string {
  for (const alias of aliases) {
    const value = row[alias];
    if (typeof value === "string" && value.trim().length > 0) return value.trim();
  }
  return "";
}

function parseEnumValue(value?: string): string | undefined {
  if (!value?.trim()) return undefined;
  return value.trim().toUpperCase().replace(/[\s-]+/g, "_");
}

function parseArray(value?: string): string[] {
  if (!value?.trim()) return [];
  return value
    .split(/[|;,]/)
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => item.toUpperCase().replace(/[\s-]+/g, "_"));
}

function parseBool(value?: string): boolean {
  if (!value?.trim()) return false;
  const normalized = value.trim().toLowerCase();
  return ["true", "1", "yes", "y"].includes(normalized);
}

function parseDate(value?: string): Date | undefined {
  if (!value?.trim()) return undefined;
  const date = new Date(value.trim());
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function parseNumber(value?: string): number | undefined {
  if (!value?.trim()) return undefined;
  const num = Number(value.trim());
  return Number.isFinite(num) ? num : undefined;
}

function parsePhone(value?: string): string {
  return (value ?? "").replace(/\D/g, "").slice(-10);
}

export async function importVisitsFromCsv(params: {
  csv: string;
  storeId: string;
}): Promise<VisitImportResult> {
  const { headers, rows } = parseCsv(params.csv);
  if (headers.length === 0) {
    return {
      createdCount: 0,
      failedCount: 0,
      errors: [{ row: 1, message: "CSV is empty or missing headers" }],
    };
  }

  const staffMembers = await prisma.staff.findMany({
    where: { storeId: params.storeId },
    select: { id: true, employeeId: true, name: true },
  });

  const rowObjects = rows.map((values) => {
    const obj: Record<string, string> = {};
    headers.forEach((header, index) => {
      obj[keyOf(header)] = (values[index] ?? "").trim();
    });
    return obj;
  });

  let createdCount = 0;
  const errors: VisitImportError[] = [];

  for (let idx = 0; idx < rowObjects.length; idx++) {
    const csvRow = rowObjects[idx];
    const rowNumber = idx + 2; // +2 because CSV row 1 is header

    try {
      const staffIdCell = pickValue(csvRow, "staffid");
      const employeeIdCell = pickValue(csvRow, "staffemployeeid", "employeeid");
      const staffNameCell = pickValue(csvRow, "staffname");

      let staffId: string | undefined;
      if (staffIdCell) {
        staffId = staffMembers.find((member) => member.id === staffIdCell)?.id;
      } else if (employeeIdCell) {
        staffId = staffMembers.find(
          (member) => member.employeeId.toLowerCase() === employeeIdCell.toLowerCase(),
        )?.id;
      } else if (staffNameCell) {
        staffId = staffMembers.find(
          (member) => member.name.toLowerCase() === staffNameCell.toLowerCase(),
        )?.id;
      } else if (staffMembers.length === 1) {
        staffId = staffMembers[0].id;
      }

      if (!staffId) {
        throw new Error(
          "Unable to map staff. Provide staffEmployeeId (or staffId/staffName) column.",
        );
      }

      const payload = {
        customerName: pickValue(csvRow, "customername"),
        customerPhone: parsePhone(pickValue(csvRow, "customerphone", "phone")),
        customerType: parseEnumValue(pickValue(csvRow, "customertype")),
        visitType: parseEnumValue(pickValue(csvRow, "visittype", "type")),
        inTime: parseDate(pickValue(csvRow, "intime")),
        outTime: parseDate(pickValue(csvRow, "outtime")),
        sourceChannel: parseEnumValue(pickValue(csvRow, "sourcechannel")),
        area: pickValue(csvRow, "area") || undefined,
        address: pickValue(csvRow, "address") || undefined,
        profession: pickValue(csvRow, "profession") || undefined,
        gender: parseEnumValue(pickValue(csvRow, "gender")),
        ageGroup: pickValue(csvRow, "agegroup") || undefined,
        dateOfBirth: parseDate(pickValue(csvRow, "dateofbirth", "dob")),
        anniversary: parseDate(pickValue(csvRow, "anniversary")),
        productsExplored: parseArray(pickValue(csvRow, "productsexplored")),
        purchaseStatus: parseEnumValue(pickValue(csvRow, "purchasestatus", "status")),
        productsPurchased: parseArray(pickValue(csvRow, "productspurchased")),
        transactionAmount: parseNumber(pickValue(csvRow, "transactionamount", "revenue")),
        intentTier: parseEnumValue(pickValue(csvRow, "intenttier")),
        reasonNoPurchase: parseEnumValue(pickValue(csvRow, "reasonnopurchase")),
        competitorMention: pickValue(csvRow, "competitormention") || undefined,
        purchaseOccasion: parseEnumValue(pickValue(csvRow, "purchaseoccasion")),
        metalKtPref: parseEnumValue(pickValue(csvRow, "metalktpref")),
        budgetStated: parseEnumValue(pickValue(csvRow, "budgetstated")),
        schemesPitched: parseArray(pickValue(csvRow, "schemespitched")),
        enrollmentOutcome: parseEnumValue(pickValue(csvRow, "enrollmentoutcome")),
        monthlyCommitment: parseNumber(pickValue(csvRow, "monthlycommitment")),
        reasonNoEnrollment: parseEnumValue(pickValue(csvRow, "reasonnoenrollment")),
        schemeCompetitorMention:
          pickValue(csvRow, "schemecompetitormention") || undefined,
        followUpNeeded: parseBool(pickValue(csvRow, "followupneeded", "followup")),
        followUpDate: parseDate(pickValue(csvRow, "followupdate")),
        staffNotes: pickValue(csvRow, "staffnotes", "notes") || undefined,
      };

      const parsed = createVisitSchema.safeParse(payload);
      if (!parsed.success) {
        const first = parsed.error.issues[0];
        throw new Error(first?.message ?? "Row validation failed");
      }

      const visit = await createVisit({
        ...parsed.data,
        storeId: params.storeId,
        staffId,
        skipAggregateRefresh: true,
      });

      const visitDate = parseDate(pickValue(csvRow, "visitdate", "date"));
      if (visitDate) {
        await prisma.visit.update({
          where: { id: visit.id },
          data: { visitDate },
        });
      }

      createdCount += 1;
    } catch (error) {
      errors.push({
        row: rowNumber,
        message: error instanceof Error ? error.message : "Failed to import row",
      });
    }
  }

  if (createdCount > 0) {
    await refreshVisitAggregate().catch(() => undefined);
  }

  return {
    createdCount,
    failedCount: errors.length,
    errors: errors.slice(0, 50),
  };
}

