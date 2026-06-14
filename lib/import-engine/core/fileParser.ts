import Papa from "papaparse";
import * as XLSX from "xlsx";
import { IMPORT_CONFIG } from "@/lib/import-engine/config";
import type { ParsedFile } from "@/lib/import-engine/types";
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

async function parseExcelFile(file: File): Promise<ParsedFile> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array", cellDates: false });
  const sheetNames = workbook.SheetNames;
  const warnings: string[] = [];

  if (sheetNames.length > 1) {
    warnings.push(
      `Multiple sheets found (${sheetNames.join(", ")}). Using first sheet: "${sheetNames[0]}".`,
    );
  }

  const sheet = workbook.Sheets[sheetNames[0]];
  if (!sheet) {
    throw new ImportEngineError("Excel file has no readable sheet", "PARSE_FAILED");
  }

  const matrix = flattenMergedCells(sheet);
  if (matrix.length === 0) {
    throw new ImportEngineError("Excel sheet is empty", "PARSE_FAILED");
  }

  const headers = matrix[0].map(normaliseHeader).filter(Boolean);
  const { rows, emptyRowCount } = buildRowsFromMatrix(headers, matrix.slice(1));

  if (emptyRowCount > 0) {
    warnings.push(`${emptyRowCount} empty row(s) were skipped.`);
  }

  return {
    headers,
    rows,
    totalRows: rows.length,
    fileName: file.name,
    fileSize: file.size,
    encoding: "binary",
    warnings,
  };
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

  if (parsed.totalRows > IMPORT_CONFIG.maxRowCount) {
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
