import { Request, Response, NextFunction } from "express";
import { sendSuccessResponse } from "../../utils/apiResponse.js";
import { AuthedRequest } from "../auth/auth.middleware.js";
import { WorkspaceScopedRequest } from "../workspaces/workspace.middleware.js";
import { ProjectScopedRequest } from "../projects/project.middleware.js";
import {
  getProductivity,
  getProject,
  getSummary,
  getWorkspaceDashboard,
} from "./dashboard.service.js";

// organizationId is validated by requireOrganizationAccessFromQuery before any
// of these run, so reading it straight off the query here is safe.
const organizationIdOf = (req: Request): string => req.query.organizationId as string;

export const summaryController = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const summary = await getSummary(organizationIdOf(req), (req as AuthedRequest).userId);

    sendSuccessResponse({
      res,
      statusCode: 200,
      message: "Dashboard summary retrieved successfully.",
      data: summary,
    });
  } catch (error) {
    next(error);
  }
};

export const workspaceDashboardController = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const workspace = (req as WorkspaceScopedRequest).workspace;
    const dashboard = await getWorkspaceDashboard(workspace._id.toString());

    sendSuccessResponse({
      res,
      statusCode: 200,
      message: "Workspace dashboard retrieved successfully.",
      data: dashboard,
    });
  } catch (error) {
    next(error);
  }
};

export const projectDashboardController = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const project = (req as ProjectScopedRequest).project;
    const dashboard = await getProject(project._id.toString());

    sendSuccessResponse({
      res,
      statusCode: 200,
      message: "Project dashboard retrieved successfully.",
      data: dashboard,
    });
  } catch (error) {
    next(error);
  }
};

export const productivityController = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const productivity = await getProductivity(
      organizationIdOf(req),
      (req as AuthedRequest).userId,
    );

    sendSuccessResponse({
      res,
      statusCode: 200,
      message: "Productivity dashboard retrieved successfully.",
      data: productivity,
    });
  } catch (error) {
    next(error);
  }
};
