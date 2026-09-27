import { AppError } from "../../utils/AppError.js";
import { createAuditLog } from "../audit/auditLog.repository.js";
import {
  findNotificationForUser,
  listNotificationsForUser,
  markAllNotificationsRead,
  markNotificationRead,
  softDeleteNotification,
} from "./notification.repository.js";
import { ListNotificationsQuery } from "./notification.validation.js";

// Notifications are the one collection scoped to a *user* rather than an
// organization, so there is no requireOrganizationRole here — the userId from
// requireAuth is the whole authorization check. Every query filters on it.
export const listNotifications = (userId: string, query: ListNotificationsQuery) =>
  listNotificationsForUser(userId, query);

export const setNotificationRead = async (userId: string, notificationId: string, isRead: boolean) => {
  const notification = await findNotificationForUser(userId, notificationId);

  if (!notification) {
    throw new AppError("Notification not found", 404, "RESOURCE_NOT_FOUND");
  }

  const updated = await markNotificationRead(notificationId, isRead);

  if (!updated) {
    throw new AppError("Notification not found", 404, "RESOURCE_NOT_FOUND");
  }

  if (isRead) {
    await createAuditLog({
      organizationId: notification.organizationId.toString(),
      actorId: userId,
      entityType: "Notification",
      entityId: notificationId,
      action: "NOTIFICATION_READ",
    });
  }

  return updated;
};

export const markAllRead = (userId: string) => markAllNotificationsRead(userId);

export const deleteNotification = async (userId: string, notificationId: string): Promise<void> => {
  const notification = await findNotificationForUser(userId, notificationId);

  if (!notification) {
    throw new AppError("Notification not found", 404, "RESOURCE_NOT_FOUND");
  }

  await softDeleteNotification(notificationId);
};
