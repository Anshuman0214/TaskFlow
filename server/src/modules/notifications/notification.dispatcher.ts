import { findUserById } from "../users/user.repository.js";
import { sendNotificationEmail } from "../../utils/mailer.js";
import { logger } from "../../utils/logger.js";
import { createNotification } from "./notification.repository.js";
import { NotificationType } from "./notification.types.js";

export interface NotificationJob {
  userId: string;
  organizationId: string;
  title: string;
  message: string;
  type: NotificationType;
  metadata?: Record<string, unknown>;
  // Not every notification deserves an email — in-app only is the default.
  email?: boolean;
}

// The single unit of work behind the queue: write the in-app notification,
// then optionally email it. The BullMQ worker calls this, and so does
// enqueueNotification directly under NODE_ENV=test (see notification.queue.ts).
export const dispatchNotification = async (job: NotificationJob): Promise<void> => {
  const notification = await createNotification({
    userId: job.userId,
    organizationId: job.organizationId,
    title: job.title,
    message: job.message,
    type: job.type,
    ...(job.metadata ? { metadata: job.metadata } : {}),
  });

  if (!job.email) {
    return;
  }

  const user = await findUserById(job.userId);

  if (!user) {
    logger.warn("Notification recipient no longer exists", { userId: job.userId });
    return;
  }

  sendNotificationEmail(user.email, job.title, job.message);

  logger.info("Notification dispatched", {
    notificationId: notification._id.toString(),
    type: job.type,
  });
};
