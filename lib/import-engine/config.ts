const MB = 1024 * 1024;

export const IMPORT_CONFIG = {
  phoneCountryCode: process.env.PHONE_COUNTRY_CODE ?? "+91",
  maxFileSizeMb: Number(process.env.IMPORT_MAX_FILE_SIZE_MB ?? 10),
  maxFileSizeBytes: Number(process.env.IMPORT_MAX_FILE_SIZE_MB ?? 10) * MB,
  maxRowCount: Number(process.env.IMPORT_MAX_ROW_COUNT ?? 50_000),
  rollbackWindowHours: Number(process.env.IMPORT_ROLLBACK_WINDOW_HOURS ?? 24),
  batchChunkSize: Number(process.env.IMPORT_BATCH_CHUNK_SIZE ?? 100),
  /** Rows per HTTP request when executing an import (keeps payloads under body limits). */
  requestBatchSize: Number(process.env.IMPORT_REQUEST_BATCH_SIZE ?? 75),
  largeFileRowThreshold: 1000,
  largeFileChunkSize: 250,
} as const;

export function chunkSizeForRowCount(rowCount: number): number {
  return rowCount > IMPORT_CONFIG.largeFileRowThreshold
    ? IMPORT_CONFIG.largeFileChunkSize
    : IMPORT_CONFIG.batchChunkSize;
}
