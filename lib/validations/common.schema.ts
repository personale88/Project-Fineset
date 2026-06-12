import { z } from "zod";

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const periodQuerySchema = z
  .enum(["yesterday", "today", "week", "month", "last3months", "last6months"])
  .default("today");

export const sortOrderSchema = z.enum(["asc", "desc"]).default("desc");

export const phoneSchema = z
  .string()
  .regex(/^\d{10}$/, "Phone must be a 10-digit number");

export type PaginationQuery = z.infer<typeof paginationQuerySchema>;
export type PeriodQuery = z.infer<typeof periodQuerySchema>;
