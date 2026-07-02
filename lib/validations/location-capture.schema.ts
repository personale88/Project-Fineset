import { z } from "zod";

export const locationCapturePayloadSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracyMeters: z.number().positive().max(5000),
  capturedAt: z.coerce.date(),
  status: z.enum(["DETECTED", "PERMISSION_DENIED", "UNAVAILABLE", "POOR_ACCURACY"]),
});

export const locationExceptionIdSchema = z.string().cuid().optional();

export type LocationCapturePayload = z.infer<typeof locationCapturePayloadSchema>;
