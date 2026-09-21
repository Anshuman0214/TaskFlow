import { Request, Response, NextFunction } from "express";
import { sendSuccessResponse } from "../../utils/apiResponse.js";
import { AppError } from "../../utils/AppError.js";
import { AuthedRequest } from "../auth/auth.middleware.js";
import { TaskScopedRequest } from "./task.middleware.js";
import { ListTasksQuery } from "./task.validation.js";
import {
  createTask,
  deleteTask,
  getTask,
  listSubtasks,
  listTasks,
  updateTask,
} from "./task.service.js";

export const createTaskController = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const task = await createTask((req as AuthedRequest).userId, req.params.projectId as string, req.body);

    sendSuccessResponse({
      res,
      statusCode: 201,
      message: "Task created successfully.",
      data: task,
    });
  } catch (error) {
    next(error);
  }
};

export const listTasksController = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const query = req.query as unknown as ListTasksQuery;
    const { items, total } = await listTasks(req.params.projectId as string, query);

    sendSuccessResponse({
      res,
      statusCode: 200,
      message: "Tasks retrieved successfully.",
      data: items,
      meta: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) },
    });
  } catch (error) {
    next(error);
  }
};

export const getTaskController = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const task = await getTask((req as TaskScopedRequest).task);

    sendSuccessResponse({
      res,
      statusCode: 200,
      message: "Task retrieved successfully.",
      data: task,
    });
  } catch (error) {
    next(error);
  }
};

export const updateTaskController = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const scoped = req as TaskScopedRequest;
    const task = await updateTask(scoped.userId, scoped.task, req.body);

    sendSuccessResponse({
      res,
      statusCode: 200,
      message: "Task updated successfully.",
      data: task,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteTaskController = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const scoped = req as TaskScopedRequest;
    await deleteTask(scoped.userId, scoped.task);

    sendSuccessResponse({
      res,
      statusCode: 200,
      message: "Task deleted successfully.",
    });
  } catch (error) {
    next(error);
  }
};

export const listSubtasksController = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const scoped = req as TaskScopedRequest;

    if (scoped.task.isDeleted) {
      throw new AppError("Task not found", 404, "RESOURCE_NOT_FOUND");
    }

    const subtasks = await listSubtasks(scoped.task);

    sendSuccessResponse({
      res,
      statusCode: 200,
      message: "Subtasks retrieved successfully.",
      data: subtasks,
    });
  } catch (error) {
    next(error);
  }
};

export const createSubtaskController = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const scoped = req as TaskScopedRequest;

    if (scoped.task.isDeleted) {
      throw new AppError("Task not found", 404, "RESOURCE_NOT_FOUND");
    }

    const subtask = await createTask(
      scoped.userId,
      scoped.task.projectId.toString(),
      req.body,
      scoped.task._id.toString(),
    );

    sendSuccessResponse({
      res,
      statusCode: 201,
      message: "Subtask created successfully.",
      data: subtask,
    });
  } catch (error) {
    next(error);
  }
};
