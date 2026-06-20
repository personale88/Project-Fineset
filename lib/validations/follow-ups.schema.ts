import { z } from "zod";
import { personalScopeQuerySchema } from "@/lib/validations/personal-scope.schema";
import { startOfCalendarDay } from "@/lib/utils/calendar-date";

function startOfDay(date: Date): Date {
  return startOfCalendarDay(date);
}

function endOfDay(date: Date): Date {
  const next = startOfCalendarDay(date);
  next.setDate(next.getDate() + 1);
  next.setMilliseconds(next.getMilliseconds() - 1);
  return next;
}

export const followUpQuerySchema = z.object({
  status: z.enum(["OPEN", "CLOSED", "CONVERTED", "NO_RESPONSE"]).optional(),
  personalScope: personalScopeQuerySchema,
  mismatched: personalScopeQuerySchema,
  overdue: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => v === "true"),
  dueToday: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => v === "true"),
  filter: z.enum(["overdue", "due_today", "open"]).optional(),
  viewStaffId: z.string().min(1).optional(),
});

export const followUpActionSchema = z.enum(["open", "close", "schedule"]);

export const updateFollowUpSchema = z
  .object({
    action: followUpActionSchema,
    followUpDate: z.coerce.date().optional(),
    notes: z.string().max(2000).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.action !== "schedule") return;

    if (!data.followUpDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Follow-up date is required when scheduling",
        path: ["followUpDate"],
      });
      return;
    }

    const todayStart = startOfCalendarDay(new Date());
    const scheduledStart = startOfCalendarDay(data.followUpDate);
    if (scheduledStart < todayStart) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Follow-up date cannot be in the past",
        path: ["followUpDate"],
      });
    }
  });

export type FollowUpQuery = z.infer<typeof followUpQuerySchema>;
export type FollowUpAction = z.infer<typeof followUpActionSchema>;
export type UpdateFollowUpInput = z.infer<typeof updateFollowUpSchema>;
