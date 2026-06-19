import { z } from "zod";

export const personalScopeQuerySchema = z
  .enum(["true", "false"])
  .optional()
  .transform((value) => value === "true");
