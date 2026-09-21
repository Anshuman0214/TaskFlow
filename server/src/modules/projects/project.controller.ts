import { Request, Response, NextFunction } from "express";
import { sendSuccessResponse } from "../../utils/apiResponse.js";
import { AuthedRequest } from "../auth/auth.middleware.js";
import { ProjectScopedRequest } from "./project.middleware.js";
import { ListProjectsQuery } from "./project.validation.js";
import { createProject, deleteProject, listProjects, updateProject } from "./project.service.js";

export const createProjectController = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const project = await createProject(
      (req as AuthedRequest).userId,
      req.params.workspaceId as string,
      req.body,
    );

    sendSuccessResponse({
      res,
      statusCode: 201,
      message: "Project created successfully.",
      data: project,
    });
  } catch (error) {
    next(error);
  }
};

export const listProjectsController = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const query = req.query as unknown as ListProjectsQuery;
    const { items, total } = await listProjects(req.params.workspaceId as string, query);

    sendSuccessResponse({
      res,
      statusCode: 200,
      message: "Projects retrieved successfully.",
      data: items,
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getProjectController = (req: Request, res: Response): void => {
  sendSuccessResponse({
    res,
    statusCode: 200,
    message: "Project retrieved successfully.",
    data: (req as ProjectScopedRequest).project,
  });
};

export const updateProjectController = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const scoped = req as ProjectScopedRequest;
    const project = await updateProject(scoped.userId, scoped.project, req.body);

    sendSuccessResponse({
      res,
      statusCode: 200,
      message: "Project updated successfully.",
      data: project,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteProjectController = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const scoped = req as ProjectScopedRequest;
    await deleteProject(scoped.userId, scoped.project);

    sendSuccessResponse({
      res,
      statusCode: 200,
      message: "Project deleted successfully.",
    });
  } catch (error) {
    next(error);
  }
};
