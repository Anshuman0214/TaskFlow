import { Request, Response, NextFunction } from "express";
import { sendSuccessResponse } from "../../utils/apiResponse.js";
import { AppError } from "../../utils/AppError.js";
import { TaskScopedRequest } from "../tasks/task.middleware.js";
import { PaginationQuery } from "./collaboration.validation.js";
import {
  createComment,
  deleteComment,
  listActivities,
  listComments,
  updateComment,
} from "./comment.service.js";
import { deleteAttachment, listAttachments, uploadAttachment } from "./attachment.service.js";

const paginationMeta = (query: PaginationQuery, total: number) => ({
  page: query.page,
  limit: query.limit,
  total,
  totalPages: Math.ceil(total / query.limit),
});

export const createCommentController = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const scoped = req as TaskScopedRequest;
    const comment = await createComment(scoped.userId, scoped.task, req.body);

    sendSuccessResponse({
      res,
      statusCode: 201,
      message: "Comment created successfully.",
      data: comment,
    });
  } catch (error) {
    next(error);
  }
};

export const listCommentsController = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const scoped = req as TaskScopedRequest;
    const query = req.query as unknown as PaginationQuery;
    const { items, total } = await listComments(scoped.task, query);

    sendSuccessResponse({
      res,
      statusCode: 200,
      message: "Comments retrieved successfully.",
      data: items,
      meta: paginationMeta(query, total),
    });
  } catch (error) {
    next(error);
  }
};

export const updateCommentController = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const scoped = req as TaskScopedRequest;
    const comment = await updateComment(
      scoped.userId,
      scoped.organizationRole,
      scoped.task,
      req.params.commentId as string,
      req.body,
    );

    sendSuccessResponse({
      res,
      statusCode: 200,
      message: "Comment updated successfully.",
      data: comment,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteCommentController = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const scoped = req as TaskScopedRequest;
    await deleteComment(
      scoped.userId,
      scoped.organizationRole,
      scoped.task,
      req.params.commentId as string,
    );

    sendSuccessResponse({ res, statusCode: 200, message: "Comment deleted successfully." });
  } catch (error) {
    next(error);
  }
};

export const listActivitiesController = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const scoped = req as TaskScopedRequest;
    const query = req.query as unknown as PaginationQuery;
    const { items, total } = await listActivities(scoped.task, query);

    sendSuccessResponse({
      res,
      statusCode: 200,
      message: "Task activities retrieved successfully.",
      data: items,
      meta: paginationMeta(query, total),
    });
  } catch (error) {
    next(error);
  }
};

export const uploadAttachmentController = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const scoped = req as TaskScopedRequest;
    const file = (req as Request & { file?: Express.Multer.File }).file;

    if (!file) {
      throw new AppError("A file is required", 422, "VALIDATION_ERROR");
    }

    const attachment = await uploadAttachment(scoped.userId, scoped.task, file);

    sendSuccessResponse({
      res,
      statusCode: 201,
      message: "Attachment uploaded successfully.",
      data: attachment,
    });
  } catch (error) {
    next(error);
  }
};

export const listAttachmentsController = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const attachments = await listAttachments((req as TaskScopedRequest).task);

    sendSuccessResponse({
      res,
      statusCode: 200,
      message: "Attachments retrieved successfully.",
      data: attachments,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteAttachmentController = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const scoped = req as TaskScopedRequest;
    await deleteAttachment(scoped.userId, scoped.task, req.params.attachmentId as string);

    sendSuccessResponse({ res, statusCode: 200, message: "Attachment deleted successfully." });
  } catch (error) {
    next(error);
  }
};
