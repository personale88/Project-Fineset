import { z } from "zod";
import {
  paginationQuerySchema,
  periodQuerySchema,
  phoneSchema,
} from "./common.schema";

export const getCustomersQuerySchema = paginationQuerySchema.extend({
  search: z.string().optional(),
  storeId: z.string().optional(),
  scope: z.enum(["mine", "store"]).optional().default("store"),
});

export const lookupCustomerQuerySchema = z.object({
  phone: phoneSchema,
});

export const getAnalyticsQuerySchema = z.object({
  period: periodQuerySchema,
  storeId: z.string().optional(),
});

export type GetCustomersQuery = z.infer<typeof getCustomersQuerySchema>;
export type LookupCustomerQuery = z.infer<typeof lookupCustomerQuerySchema>;
export type GetAnalyticsQuery = z.infer<typeof getAnalyticsQuerySchema>;
