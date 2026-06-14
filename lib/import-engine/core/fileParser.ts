import Papa from "papaparse";
import * as XLSX from "xlsx";
import { IMPORT_CONFIG } from "@/lib/import-engine/config";
import type { ParsedFile, ParsedSheet } from "@/lib/import-engine/types";
import { ImportEngineError } from "@/lib/import-engine/types";

const ACCEPTED_EXTENSIONS = [".csv", ".xlsx", ".xls"];

function normaliseHeader(header: string): string {
  return header.replace(/^\uFEFF/, "").replace(/\s+/g, " ").trim();
}

function isRowEmpty(row: Record<string, string>): boolean {
  return Object.values(row).every((value) => value.trim() === "");
}

function buildRowsFromMatrix(
  headers: string[],
  matrix: string[][],
): { rows: Record<string, string>[]; emptyRowCount: number } {
  const rows: Record<string, string>[] = [];
  let emptyRowCount = 0;

  for (const line of matrix) {
    const record: Record<string, string> = {};
    headers.forEach((header, index) => {
      record[header] = (line[index] ?? "").trim();
    });
    if (isRowEmpty(record)) {
      emptyRowCount += 1;
      continue;
    }
    rows.push(record);
  }

  return { rows, emptyRowCount };
}

function flattenMergedCells(sheet: XLSX.WorkSheet): string[][] {
  const ref = sheet["!ref"];
  if (!ref) return [];

  const range = XLSX.utils.decode_range(ref);
  const matrix: string[][] = [];

  for (let row = range.s.r; row <= range.e.r; row += 1) {
    const line: string[] = [];
    for (let col = range.s.c; col <= range.e.c; col += 1) {
      const address = XLSX.utils.encode_cell({ r: row, c: col });
      const cell = sheet[address];
      line.push(cell ? String(cell.w ?? cell.v ?? "").trim() : "");
    }
    matrix.push(line);
  }

  const merges = sheet["!merges"] ?? [];
  for (const merge of merges) {
    const anchor = XLSX.utils.encode_cell({ r: merge.s.r, c: merge.s.c });
    const anchorCell = sheet[anchor];
    const value = anchorCell ? String(anchorCell.w ?? anchorCell.v ?? "").trim() : "";
    for (let row = merge.s.r; row <= merge.e.r; row += 1) {
      for (let col = merge.s.c; col <= merge.e.c; col += 1) {
        matrix[row][col] = value;
      }
    }
  }

  return matrix;
}

async function parseCsvFile(file: File): Promise<ParsedFile> {
  const text = await file.text();
  const parsed = Papa.parse<string[]>(text, {
    header: false,
    skipEmptyLines: false,
  });

  if (parsed.errors.length > 0) {
    throw new ImportEngineError(parsed.errors[0]?.message ?? "CSV parse failed", "PARSE_FAILED");
  }

  const matrix = (parsed.data as string[][]).map((row) =>
    row.map((cell) => String(cell ?? "").trim()),
  );
  if (matrix.length === 0) {
    throw new ImportEngineError("File has no rows", "PARSE_FAILED");
  }

  const rawHeaders = matrix[0].map(normaliseHeader);
  const headers = rawHeaders.filter(Boolean);
  const { rows, emptyRowCount } = buildRowsFromMatrix(headers, matrix.slice(1));

  const warnings: string[] = [];
  if (emptyRowCount > 0) {
    warnings.push(`${emptyRowCount} empty row(s) were skipped.`);
  }

  return {
    headers,
    rows,
    totalRows: rows.length,
    fileName: file.name,
    fileSize: file.size,
    encoding: "utf-8",
    warnings,
  };
}

function unionHeaders(existing: string[], incoming: string[]): string[] {
  const seen = new Set(existing);
  const merged = [...existing];
  for (const header of incoming) {
    if (!seen.has(header)) {
      seen.add(header);
      merged.push(header);
    }
  }
  return merged;
}

function alignRowToHeaders(
  row: Record<string, string>,
  headers: string[],
): Record<string, string> {
  const aligned: Record<string, string> = {};
  for (const header of headers) {
    aligned[header] = row[header] ?? "";
  }
  return aligned;
}

function parseSheetToRows(sheet: XLSX.WorkSheet): {
  headers: string[];
  rows: Record<string, string>[];
  emptyRowCount: number;
} | null {
  const matrix = flattenMergedCells(sheet);
  if (matrix.length === 0) return null;

  const headers = matrix[0].map(normaliseHeader).filter(Boolean);
  if (headers.length === 0) return null;

  const { rows, emptyRowCount } = buildRowsFromMatrix(headers, matrix.slice(1));
  if (rows.length === 0 && emptyRowCount === 0) return null;

  return { headers, rows, emptyRowCount };
}

export function mergeExcelSheets(
  sheetData: ParsedSheet[],
  selectedSheetNames: string[],
  fileName: string,
  fileSize: number,
  emptySheetNames: string[] = [],
): ParsedFile {
  const selectedNames = new Set(selectedSheetNames);
  const selectedSheets = sheetData.filter((sheet) => selectedNames.has(sheet.name));

  if (selectedSheets.length === 0) {
    throw new ImportEngineError("Select at least one sheet to import", "PARSE_FAILED");
  }

  let headers: string[] = [];
  let rows: Record<string, string>[] = [];
  let emptyRowCount = 0;
  const importedSheets: string[] = [];
  const mismatchedHeaderSheets: string[] = [];

  for (const sheet of selectedSheets) {
    if (headers.length === 0) {
      headers = sheet.headers;
    } else {
      const incomingSet = new Set(sheet.headers);
      const canonicalSet = new Set(headers);
      const sameHeaders =
        headers.length === sheet.headers.length &&
        headers.every((header) => incomingSet.has(header)) &&
        sheet.headers.every((header) => canonicalSet.has(header));

      if (!sameHeaders) {
        mismatchedHeaderSheets.push(sheet.name);
        const nextHeaders = unionHeaders(headers, sheet.headers);
        if (nextHeaders.length !== headers.length) {
          rows = rows.map((row) => alignRowToHeaders(row, nextHeaders));
          headers = nextHeaders;
        }
      }
    }

    for (const row of sheet.rows) {
      rows.push(alignRowToHeaders(row, headers));
    }
    emptyRowCount += sheet.emptyRowCount;
    importedSheets.push(sheet.name);
  }

  const warnings: string[] = [];

  if (importedSheets.length > 1) {
    warnings.push(
      `Imported ${rows.length.toLocaleString()} row(s) from ${importedSheets.length} sheets: ${importedSheets.join(", ")}.`,
    );
  }

  if (emptySheetNames.length > 0) {
    warnings.push(`Skipped empty sheet(s): ${emptySheetNames.join(", ")}.`);
  }

  if (mismatchedHeaderSheets.length > 0) {
    warnings.push(
      `Sheet(s) with different columns were merged: ${mismatchedHeaderSheets.join(", ")}.`,
    );
  }

  if (emptyRowCount > 0) {
    warnings.push(`${emptyRowCount} empty row(s) were skipped.`);
  }

  if (rows.length > IMPORT_CONFIG.maxRowCount) {
    throw new ImportEngineError(
      `Selected sheets exceed ${IMPORT_CONFIG.maxRowCount.toLocaleString()} row limit (${rows.length.toLocaleString()} rows).`,
      "ROW_LIMIT_EXCEEDED",
    );
  }

  return {
    headers,
    rows,
    totalRows: rows.length,
    fileName,
    fileSize,
    encoding: "binary",
    warnings,
  };
}

async function parseExcelFile(file: File): Promise<ParsedFile> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array", cellDates: false });
  const sheetNames = workbook.SheetNames;

  if (sheetNames.length === 0) {
    throw new ImportEngineError("Excel file has no readable sheet", "PARSE_FAILED");
  }

  const sheetData: ParsedSheet[] = [];
  const emptySheetNames: string[] = [];

  for (const sheetName of sheetNames) {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) {
      emptySheetNames.push(sheetName);
      continue;
    }

    const parsed = parseSheetToRows(sheet);
    if (!parsed) {
      emptySheetNames.push(sheetName);
      continue;
    }

    sheetData.push({
      name: sheetName,
      headers: parsed.headers,
      rows: parsed.rows,
      emptyRowCount: parsed.emptyRowCount,
    });
  }

  if (sheetData.length === 0) {
    throw new ImportEngineError("Excel file has no readable data", "PARSE_FAILED");
  }

  if (sheetData.length > 1) {
    const merged = mergeExcelSheets(
      sheetData,
      sheetData.map((sheet) => sheet.name),
      file.name,
      file.size,
      emptySheetNames,
    );
    return {
      ...merged,
      sheetData,
      emptySheetNames,
    };
  }

  const merged = mergeExcelSheets(
    sheetData,
    [sheetData[0].name],
    file.name,
    file.size,
    emptySheetNames,
  );

  if (merged.totalRows > IMPORT_CONFIG.maxRowCount) {
    throw new ImportEngineError(
      `File exceeds ${IMPORT_CONFIG.maxRowCount.toLocaleString()} row limit.`,
      "ROW_LIMIT_EXCEEDED",
    );
  }

  return merged;
}

export async function parseFile(file: File): Promise<ParsedFile> {
  const lowerName = file.name.toLowerCase();
  const extension = ACCEPTED_EXTENSIONS.find((ext) => lowerName.endsWith(ext));
  if (!extension) {
    throw new ImportEngineError(
      "Unsupported file format. Upload a .csv, .xlsx, or .xls file.",
      "UNSUPPORTED_FORMAT",
    );
  }

  if (file.size > IMPORT_CONFIG.maxFileSizeBytes) {
    throw new ImportEngineError(
      `File exceeds ${IMPORT_CONFIG.maxFileSizeMb}MB limit.`,
      "FILE_TOO_LARGE",
    );
  }

  const parsed =
    extension === ".csv" ? await parseCsvFile(file) : await parseExcelFile(file);

  if (!parsed.sheetData && parsed.totalRows > IMPORT_CONFIG.maxRowCount) {
    throw new ImportEngineError(
      `File exceeds ${IMPORT_CONFIG.maxRowCount.toLocaleString()} row limit.`,
      "ROW_LIMIT_EXCEEDED",
    );
  }

  return parsed;
}

export function sampleValuesForHeader(
  header: string,
  rows: Record<string, string>[],
  limit = 3,
): string[] {
  const samples: string[] = [];
  for (const row of rows) {
    const value = row[header]?.trim();
    if (!value) continue;
    samples.push(value);
    if (samples.length >= limit) break;
  }
  return samples;
}
