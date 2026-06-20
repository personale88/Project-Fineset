import { z } from "zod";

export const importDedupeBodySchema = z.object({
  featureKey: z.enum(["visit_log", "call_log"]),
  storeId: z.string().min(1),
  rows: z.array(
    z.object({
      rowIndex: z.number().int().nonnegative(),
      phone: z.string().nullable().optional(),
      email: z.string().nullable().optional(),
    }),
  ),
});

export const importExecuteBodySchema = z.object({
  featureKey: z.enum(["visit_log", "call_log"]),
  batchId: z.string().uuid(),
  fileName: z.string().optional(),
  storeId: z.string().min(1),
  rows: z.array(z.unknown()),
  columnMappings: z.array(z.unknown()),
  finalize: z.boolean().optional().default(true),
  totalRows: z.number().int().positive().optional(),
  cumulativeStats: z
    .object({
      totalProcessed: z.number().int().nonnegative(),
      successCount: z.number().int().nonnegative(),
      errorCount: z.number().int().nonnegative(),
      newCustomersCreated: z.number().int().nonnegative(),
      repeatCustomersUpdated: z.number().int().nonnegative(),
    })
    .optional(),
});

export const importRollbackBodySchema = z.object({
  batchId: z.string().uuid(),
});
