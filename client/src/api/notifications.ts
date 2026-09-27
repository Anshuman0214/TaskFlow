import { apiClient } from "./client";
import type { ApiResponse, PaginatedResponse, PaginationMeta } from "./types";

export type NotificationType =
  | "TASK_ASSIGNED"
  | "TASK_UPDATED"
  | "TASK_COMPLETED"
  | "COMMENT_ADDED"
  | "INVITATION_SENT"
  | "INVITATION_ACCEPTED"
  | "DUE_DATE_REMINDER"
  | "PROJECT_ARCHIVED";

export const NOTIFICATION_TYPES: NotificationType[] = [
  "TASK_ASSIGNED",
  "TASK_UPDATED",
  "TASK_COMPLETED",
  "COMMENT_ADDED",
  "INVITATION_SENT",
  "INVITATION_ACCEPTED",
  "DUE_DATE_REMINDER",
  "PROJECT_ARCHIVED",
];

export interface Notification {
  _id: string;
  userId: string;
  organizationId: string;
  title: string;
  message: string;
  type: NotificationType;
  isRead: boolean;
  readAt: string | null;
  // The backend puts taskId/projectId/workspaceId here when relevant, so the
  // UI can deep-link straight to whatever the notification is about.
  metadata: Record<string, string | undefined>;
  createdAt: string;
}

export interface NotificationsMeta extends PaginationMeta {
  unreadCount: number;
}

export interface ListNotificationsQuery {
  page?: number;
  limit?: number;
  isRead?: boolean;
  type?: NotificationType;
}

export const listNotifications = async (
  query: ListNotificationsQuery = {},
): Promise<{ items: Notification[]; meta: NotificationsMeta }> => {
  const res = await apiClient.get<PaginatedResponse<Notification> & { meta: NotificationsMeta }>(
    "/notifications",
    { params: query },
  );
  return { items: res.data.data, meta: res.data.meta };
};

export const markNotificationRead = async (
  notificationId: string,
  isRead: boolean,
): Promise<Notification> => {
  const res = await apiClient.patch<ApiResponse<Notification>>(`/notifications/${notificationId}`, {
    isRead,
  });
  return res.data.data;
};

export const markAllNotificationsRead = async (): Promise<number> => {
  const res = await apiClient.patch<ApiResponse<{ updated: number }>>("/notifications/read-all");
  return res.data.data.updated;
};

export const deleteNotification = async (notificationId: string): Promise<void> => {
  await apiClient.delete(`/notifications/${notificationId}`);
};

// Shared by the bell and the notifications page so either one's mutation
// refreshes both. Lives here rather than in a component file: exporting a
// non-component from one breaks react-refresh.
export const NOTIFICATIONS_KEY = ["notifications"];
