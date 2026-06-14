import { hashPhone } from "@/lib/crypto/pii";
import type {
  CustomerDedupeClient,
  DedupeResult,
  FeatureSchemaConfig,
} from "@/lib/import-engine/types";
import { generateCustomerId } from "@/lib/import-engine/core/customerIdGenerator";
import { normalisePhone, phoneDigitsForHash } from "@/lib/import-engine/utils/phoneNormaliser";

export interface RowDedupeInput {
  rowIndex: number;
  phone?: string | null;
  email?: string | null;
}

function normaliseEmail(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim().toLowerCase();
  return trimmed.length > 0 ? trimmed : null;
}

export async function deduplicateRows(
  rows: RowDedupeInput[],
  schema: FeatureSchemaConfig,
  storeId: string,
  client: CustomerDedupeClient,
): Promise<DedupeResult[]> {
  const phoneHashes = new Set<string>();
  const emails = new Set<string>();

  for (const row of rows) {
    if (row.phone) {
      const digits = phoneDigitsForHash(row.phone);
      if (digits) phoneHashes.add(hashPhone(digits));
    }
    const email = normaliseEmail(row.email);
    if (email) emails.add(email);
  }

  const phoneRecords = await client.findByPhoneHashes([...phoneHashes], storeId);
  const phoneMap = new Map(phoneRecords.map((record) => [record.phoneHash, record.id]));

  const emailMap = new Map<string, string>();
  if (client.findByEmails && emails.size > 0) {
    const emailRecords = await client.findByEmails([...emails], storeId);
    for (const record of emailRecords) {
      if (record.email) emailMap.set(record.email.toLowerCase(), record.id);
    }
  }

  const seenPhonesInFile = new Map<string, number>();
  const results: DedupeResult[] = [];

  for (const row of rows) {
    const phoneHash = row.phone ? hashPhone(phoneDigitsForHash(row.phone)) : null;
    const email = normaliseEmail(row.email);

    if (phoneHash && seenPhonesInFile.has(phoneHash)) {
      results.push({
        rowIndex: row.rowIndex,
        customerType: "repeat",
        existingCustomerId: phoneMap.get(phoneHash),
        generatedCustomerId: generateCustomerId(),
      });
      continue;
    }
    if (phoneHash) seenPhonesInFile.set(phoneHash, row.rowIndex);

    const phoneMatch = phoneHash ? phoneMap.get(phoneHash) : undefined;
    const emailMatch = email ? emailMap.get(email) : undefined;

    if (phoneMatch && emailMatch && phoneMatch !== emailMatch) {
      results.push({ rowIndex: row.rowIndex, customerType: "ambiguous" });
      continue;
    }

    if (phoneMatch || emailMatch) {
      results.push({
        rowIndex: row.rowIndex,
        customerType: "repeat",
        existingCustomerId: phoneMatch ?? emailMatch,
      });
      continue;
    }

    results.push({
      rowIndex: row.rowIndex,
      customerType: "new",
      generatedCustomerId: generateCustomerId(),
    });
  }

  return results;
}

export function duplicateInFileRowIndexes(
  rows: RowDedupeInput[],
): Map<number, number> {
  const firstSeen = new Map<string, number>();
  const duplicates = new Map<number, number>();

  rows.forEach((row, index) => {
    if (!row.phone) return;
    const phoneHash = hashPhone(phoneDigitsForHash(row.phone));
    const firstIndex = firstSeen.get(phoneHash);
    if (firstIndex === undefined) {
      firstSeen.set(phoneHash, index);
      return;
    }
    duplicates.set(index, firstIndex);
  });

  return duplicates;
}

export function extractDedupeFieldsFromRow(
  row: Record<string, unknown>,
  schema: FeatureSchemaConfig,
): { phone: string | null; email: string | null } {
  let phone: string | null = null;
  let email: string | null = null;

  for (const key of schema.dedupeKeys) {
    const value = row[key];
    if (typeof value !== "string") continue;
    if (key === "phone" || key.includes("phone")) {
      phone = normalisePhone(value) ?? value;
    }
    if (key === "email" || key.includes("email")) {
      email = value.trim().toLowerCase();
    }
  }

  if (!phone && typeof row.phone === "string") {
    phone = normalisePhone(row.phone) ?? row.phone;
  }
  if (!email && typeof row.email === "string") {
    email = row.email.trim().toLowerCase();
  }

  return { phone, email };
}
