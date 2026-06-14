import type { TransformedRow } from "@/lib/import-engine/types";

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

/** Stable 10-digit placeholder for rows without a phone (unique per spreadsheet row). */
export function syntheticImportPhone(rowIndex: number): string {
  const suffix = String(rowIndex).padStart(9, "0");
  return `9${suffix.slice(-9)}`;
}

export function resolveImportCustomerPhone(row: TransformedRow): string {
  const phone = asString(row.customerData.phone);
  if (phone) return phone;
  return syntheticImportPhone(row.originalIndex);
}

export function resolveImportCustomerName(row: TransformedRow): string {
  return asString(row.customerData.name) ?? "Customer";
}

export function resolveImportStaffId(
  row: TransformedRow,
  fallbackStaffId: string | null,
): string | null {
  return asString(row.transformedData.staffId) ?? fallbackStaffId;
}
