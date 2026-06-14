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
});

export const importRollbackBodySchema = z.object({
  batchId: z.string().uuid(),
});
