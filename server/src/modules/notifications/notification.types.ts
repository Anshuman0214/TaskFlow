import { Types } from "mongoose";

export const NOTIFICATION_TYPES = [
  "TASK_ASSIGNED",
  "TASK_UPDATED",
  "TASK_COMPLETED",
  "COMMENT_ADDED",
  "INVITATION_SENT",
  "INVITATION_ACCEPTED",
  "DUE_DATE_REMINDER",
  "PROJECT_ARCHIVED",
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export interface INotification {
  userId: Types.ObjectId;
  organizationId: Types.ObjectId;
  title: string;
  message: string;
  type: NotificationType;
  isRead: boolean;
  readAt: Date | null;
  metadata: Record<string, unknown>;
  isDeleted: boolean;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
