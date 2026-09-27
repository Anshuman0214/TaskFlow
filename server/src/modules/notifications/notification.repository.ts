import { Notification } from "./notification.model.js";
import { NotificationType } from "./notification.types.js";

export interface CreateNotificationInput {
  userId: string;
  organizationId: string;
  title: string;
  message: string;
  type: NotificationType;
  metadata?: Record<string, unknown>;
}

export interface ListNotificationsOptions {
  page: number;
  limit: number;
  isRead?: boolean | undefined;
  type?: NotificationType | undefined;
}

export const createNotification = (input: CreateNotificationInput) => Notification.create(input);

export const findNotificationForUser = (userId: string, notificationId: string) =>
  Notification.findOne({ _id: notificationId, userId, isDeleted: false });

export const listNotificationsForUser = async (
  userId: string,
  options: ListNotificationsOptions,
) => {
  const filter: Record<string, unknown> = { userId, isDeleted: false };
  if (options.isRead !== undefined) filter.isRead = options.isRead;
  if (options.type) filter.type = options.type;

  const skip = (options.page - 1) * options.limit;

  const [items, total, unreadCount] = await Promise.all([
    Notification.find(filter).sort({ createdAt: -1 }).skip(skip).limit(options.limit),
    Notification.countDocuments(filter),
    Notification.countDocuments({ userId, isDeleted: false, isRead: false }),
  ]);

  return { items, total, unreadCount };
};

export const markNotificationRead = (notificationId: string, isRead: boolean) =>
  Notification.findByIdAndUpdate(
    notificationId,
    { isRead, readAt: isRead ? new Date() : null },
    { returnDocument: "after" },
  );

export const markAllNotificationsRead = async (userId: string): Promise<number> => {
  const result = await Notification.updateMany(
    { userId, isDeleted: false, isRead: false },
    { isRead: true, readAt: new Date() },
  );

  return result.modifiedCount;
};

export const softDeleteNotification = (notificationId: string) =>
  Notification.findByIdAndUpdate(
    notificationId,
    { isDeleted: true, deletedAt: new Date() },
    { returnDocument: "after" },
  );
