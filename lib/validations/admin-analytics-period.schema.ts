import { z } from "zod";

/** Preset periods for admin portfolio AI analytics (extends store dashboard periods). */
export const adminAnalyticsPeriodSchema = z.enum([
  "yesterday",
  "today",
  "week",
  "month",
  "last30days",
  "last3months",
  "last6months",
]);

export type AdminAnalyticsPeriod = z.infer<typeof adminAnalyticsPeriodSchema>;
