/*
 * Import engine testing checklist
 *
 * [ ] Empty file → rejected at upload step
 * [ ] File with headers only, no data rows → "0 rows to import" message
 * [ ] All columns unmapped → all required columns show as missing, Continue blocked
 * [ ] Phone number with spaces/dashes → normalised correctly
 * [ ] Date in DD/MM/YYYY → parsed correctly, not confused with MM/DD/YYYY
 * [ ] Staff name not in system → LOOKUP_NOT_FOUND warning, staff_id set to null
 * [ ] Same phone appears twice in file → second row flagged as DUPLICATE_IN_FILE
 * [ ] Same phone already in customers table → detected as repeat customer
 * [ ] Phone matches one customer, email matches a different customer → DEDUPE_AMBIGUOUS
 * [ ] Required column missing from file → REQUIRED_MISSING error on every row
 * [ ] Excel file with numeric date serial → parsed correctly
 * [ ] Call log duration in "mm:ss" format → converted to seconds correctly
 * [ ] Import 500 rows → all 500 appear in database after import
 * [ ] Re-import same file → no duplicates created (upsert works correctly)
 * [ ] Rollback within 24h → rows removed, customers deleted if no other records
 * [ ] Rollback after 24h → rejected
 */

export {};
