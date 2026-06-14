import type {
  ColumnConfig,
  ColumnMappingResult,
  ColumnMatchOutput,
  ConfidenceLevel,
  FeatureSchemaConfig,
} from "@/lib/import-engine/types";
import { fuzzyScore } from "@/lib/import-engine/utils/fuzzyMatch";
import { SYNONYM_MAP, canonicalKeyForSynonym } from "@/lib/import-engine/utils/synonymMap";
import { sampleValuesForHeader } from "@/lib/import-engine/core/fileParser";

interface ScoredCandidate {
  header: string;
  column: ColumnConfig;
  score: number;
  headerIndex: number;
}

function normalise(value: string): string {
  return value.toLowerCase().trim();
}

function confidenceLevelForScore(score: number): ConfidenceLevel {
  if (score >= 90) return "HIGH";
  if (score >= 70) return "MEDIUM";
  if (score >= 50) return "LOW";
  return "UNMAPPED";
}

function scoreHeaderAgainstColumn(header: string, column: ColumnConfig): number {
  const headerNorm = normalise(header);
  const labelNorm = normalise(column.frontendLabel);
  const supabaseNorm = normalise(column.supabaseColumn);

  if (headerNorm === labelNorm) return 100;
  if (headerNorm === supabaseNorm) return 95;

  const columnSynonyms = (column.synonyms ?? []).map(normalise);
  if (columnSynonyms.includes(headerNorm)) return 90;

  const canonical = canonicalKeyForSynonym(headerNorm);
  if (canonical) {
    const globalSynonyms = SYNONYM_MAP[canonical] ?? [];
    const columnTokens = [labelNorm, supabaseNorm, ...columnSynonyms];
    if (
      globalSynonyms.some((alias) => columnTokens.some((token) => token.includes(alias))) ||
      columnSynonyms.some((syn) => globalSynonyms.includes(syn))
    ) {
      return 85;
    }
  }

  const labelFuzzy = fuzzyScore(header, column.frontendLabel);
  if (labelFuzzy >= 75) return labelFuzzy;

  let bestSynonymFuzzy = 0;
  for (const synonym of columnSynonyms) {
    bestSynonymFuzzy = Math.max(bestSynonymFuzzy, fuzzyScore(header, synonym));
  }
  for (const synonym of column.synonyms ?? []) {
    bestSynonymFuzzy = Math.max(bestSynonymFuzzy, fuzzyScore(header, synonym));
  }
  if (bestSynonymFuzzy >= 70) return bestSynonymFuzzy - 5;

  return Math.max(labelFuzzy, bestSynonymFuzzy);
}

export function matchColumns(
  uploadedHeaders: string[],
  schema: FeatureSchemaConfig,
  rows: Record<string, string>[] = [],
): ColumnMatchOutput {
  const candidates: ScoredCandidate[] = [];

  uploadedHeaders.forEach((header, headerIndex) => {
    for (const column of schema.columns) {
      const score = scoreHeaderAgainstColumn(header, column);
      if (score >= 50) {
        candidates.push({ header, column, score, headerIndex });
      }
    }
  });

  candidates.sort((a, b) => b.score - a.score || a.headerIndex - b.headerIndex);

  const assignedHeaders = new Set<string>();
  const assignedColumns = new Set<string>();
  const headerToColumn = new Map<string, { column: ColumnConfig; score: number }>();

  for (const candidate of candidates) {
    if (assignedHeaders.has(candidate.header)) continue;
    if (assignedColumns.has(candidate.column.supabaseColumn)) continue;
    assignedHeaders.add(candidate.header);
    assignedColumns.add(candidate.column.supabaseColumn);
    headerToColumn.set(candidate.header, {
      column: candidate.column,
      score: candidate.score,
    });
  }

  const mappings: ColumnMappingResult[] = uploadedHeaders.map((header) => {
    const match = headerToColumn.get(header);
    const confidence = match?.score ?? 0;
    return {
      uploadedHeader: header,
      matchedColumn: match?.column ?? null,
      confidence,
      confidenceLevel: confidenceLevelForScore(confidence),
      isManualOverride: false,
      sampleValues: sampleValuesForHeader(header, rows),
    };
  });

  const unmappedSchemaColumns = schema.columns.filter(
    (column) => !assignedColumns.has(column.supabaseColumn),
  );

  return { mappings, unmappedSchemaColumns };
}

export function applyManualMapping(
  mappings: ColumnMappingResult[],
  uploadedHeader: string,
  targetColumn: ColumnConfig | null,
): ColumnMappingResult[] {
  return mappings.map((mapping) => {
    if (mapping.uploadedHeader === uploadedHeader) {
      return {
        ...mapping,
        matchedColumn: targetColumn,
        confidence: targetColumn ? 100 : 0,
        confidenceLevel: targetColumn ? "HIGH" : "UNMAPPED",
        isManualOverride: true,
      };
    }
    if (targetColumn && mapping.matchedColumn?.supabaseColumn === targetColumn.supabaseColumn) {
      return {
        ...mapping,
        matchedColumn: null,
        confidence: 0,
        confidenceLevel: "UNMAPPED",
        isManualOverride: false,
      };
    }
    return mapping;
  });
}

export function resetMappingsToAuto(
  uploadedHeaders: string[],
  schema: FeatureSchemaConfig,
  rows: Record<string, string>[],
): ColumnMappingResult[] {
  return matchColumns(uploadedHeaders, schema, rows).mappings;
}

export function missingRequiredColumns(
  mappings: ColumnMappingResult[],
  schema: FeatureSchemaConfig,
): string[] {
  const mappedColumns = new Set(
    mappings
      .filter((mapping) => mapping.matchedColumn)
      .map((mapping) => mapping.matchedColumn!.supabaseColumn),
  );

  return schema.columns
    .filter((column) => column.required && !mappedColumns.has(column.supabaseColumn))
    .map((column) => column.frontendLabel);
}
