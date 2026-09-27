import { Request, Response, NextFunction } from "express";
import { sendSuccessResponse } from "../../utils/apiResponse.js";
import { AuthedRequest } from "../auth/auth.middleware.js";
import { ListNotificationsQuery } from "./notification.validation.js";
import {
  deleteNotification,
  listNotifications,
  markAllRead,
  setNotificationRead,
} from "./notification.service.js";

export const listNotificationsController = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const query = req.query as unknown as ListNotificationsQuery;
    const { items, total, unreadCount } = await listNotifications(
      (req as AuthedRequest).userId,
      query,
    );

    sendSuccessResponse({
      res,
      statusCode: 200,
      message: "Notifications retrieved successfully.",
      data: items,
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
        unreadCount,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const markAllReadController = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const updated = await markAllRead((req as AuthedRequest).userId);

    sendSuccessResponse({
      res,
      statusCode: 200,
      message: "All notifications marked as read.",
      data: { updated },
    });
  } catch (error) {
    next(error);
  }
};

export const markNotificationController = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const notification = await setNotificationRead(
      (req as AuthedRequest).userId,
      req.params.notificationId as string,
      req.body.isRead,
    );

    sendSuccessResponse({
      res,
      statusCode: 200,
      message: "Notification updated successfully.",
      data: notification,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteNotificationController = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    await deleteNotification((req as AuthedRequest).userId, req.params.notificationId as string);

    sendSuccessResponse({ res, statusCode: 200, message: "Notification deleted successfully." });
  } catch (error) {
    next(error);
  }
};
