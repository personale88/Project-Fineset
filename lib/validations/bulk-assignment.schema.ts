import { z } from "zod";

export const bulkAssignFollowUpsSchema = z.object({
  targetStaffId: z.string().cuid(),
  followUpIds: z.array(z.string().cuid()).min(1).max(50),
});

export type BulkAssignFollowUpsInput = z.infer<typeof bulkAssignFollowUpsSchema>;
