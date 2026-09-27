import { z } from "zod";
import { NOTIFICATION_TYPES } from "./notification.types.js";

export const listNotificationsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  // Query strings carry "true"/"false", not booleans.
  isRead: z
    .enum(["true", "false"])
    .transform((value) => value === "true")
    .optional(),
  type: z.enum(NOTIFICATION_TYPES).optional(),
});

export const markNotificationSchema = z.object({
  isRead: z.boolean(),
});

export type ListNotificationsQuery = z.infer<typeof listNotificationsQuerySchema>;
export type MarkNotificationInput = z.infer<typeof markNotificationSchema>;
