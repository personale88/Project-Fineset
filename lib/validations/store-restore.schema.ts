import { z } from "zod";

export const restoreStoreSchema = z.object({
  password: z.string().min(1, "Admin password is required"),
});

export type RestoreStoreInput = z.infer<typeof restoreStoreSchema>;
