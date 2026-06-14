import Papa from "papaparse";
import type { FeatureSchemaConfig } from "@/lib/import-engine/types";

export function downloadImportTemplate(schema: FeatureSchemaConfig): void {
  const headers = schema.columns.map((column) => column.frontendLabel);
  const exampleRows = buildExampleRows(schema);
  const csv = Papa.unparse({ fields: headers, data: exampleRows });
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${schema.featureKey}-import-template.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function buildExampleRows(schema: FeatureSchemaConfig): string[][] {
  const rowOne = schema.columns.map((column) => exampleValue(column, 1));
  const rowTwo = schema.columns.map((column) => exampleValue(column, 2));
  return [rowOne, rowTwo];
}

function exampleValue(
  column: FeatureSchemaConfig["columns"][number],
  row: number,
): string {
  switch (column.type) {
    case "phone":
      return row === 1 ? "9876543210" : "9123456780";
    case "email":
      return row === 1 ? "customer1@example.com" : "customer2@example.com";
    case "date":
      return row === 1 ? "13/06/2026" : "01/06/2026";
    case "number":
      return row === 1 ? "25000" : "5:30";
    default:
      if (column.frontendLabel.toLowerCase().includes("name")) {
        return row === 1 ? "Priya Sharma" : "Amit Patel";
      }
      if (column.frontendLabel.toLowerCase().includes("staff") ||
          column.frontendLabel.toLowerCase().includes("agent")) {
        return "Mohan";
      }
      if (column.frontendLabel.toLowerCase().includes("outcome")) {
        return row === 1 ? "interested" : "no_answer";
      }
      return row === 1 ? "Sample value" : "Another value";
  }
}

export function downloadErrorReport(
  rows: Array<{
    rowNumber: number;
    rawData: string;
    code: string;
    message: string;
  }>,
  fileName: string,
): void {
  const csv = Papa.unparse({
    fields: ["Row Number", "Uploaded Data", "Error Code", "Error Message"],
    data: rows.map((row) => [row.rowNumber, row.rawData, row.code, row.message]),
  });
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}
