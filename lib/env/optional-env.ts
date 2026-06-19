/** Treat empty .env values as unset — dotenv loads "" instead of undefined. */
import { z } from "zod";

export function optionalEnv<T extends z.ZodTypeAny>(schema: T) {
  return z.preprocess(
    (val) => (typeof val === "string" && val.trim() === "" ? undefined : val),
    schema,
  );
}
