import { Request, Response, NextFunction } from "express";
import { sendSuccessResponse } from "../../utils/apiResponse.js";
import { AuthedRequest } from "../auth/auth.middleware.js";
import { WorkspaceScopedRequest } from "./workspace.middleware.js";
import {
  addWorkspaceMember,
  archiveWorkspace,
  createWorkspace,
  deleteWorkspace,
  listWorkspaceMembers,
  listWorkspaces,
  removeWorkspaceMember,
  updateWorkspace,
} from "./workspace.service.js";

export const createWorkspaceController = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const workspace = await createWorkspace((req as AuthedRequest).userId, req.body);

    sendSuccessResponse({
      res,
      statusCode: 201,
      message: "Workspace created successfully.",
      data: workspace,
    });
  } catch (error) {
    next(error);
  }
};

export const listWorkspacesController = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const organizationId = req.query.organizationId as string;
    const workspaces = await listWorkspaces(organizationId);

    sendSuccessResponse({
      res,
      statusCode: 200,
      message: "Workspaces retrieved successfully.",
      data: workspaces,
    });
  } catch (error) {
    next(error);
  }
};

export const getWorkspaceController = (req: Request, res: Response): void => {
  sendSuccessResponse({
    res,
    statusCode: 200,
    message: "Workspace retrieved successfully.",
    data: (req as WorkspaceScopedRequest).workspace,
  });
};

export const updateWorkspaceController = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const scoped = req as WorkspaceScopedRequest;
    const workspace = await updateWorkspace(scoped.userId, scoped.workspace, req.body);

    sendSuccessResponse({
      res,
      statusCode: 200,
      message: "Workspace updated successfully.",
      data: workspace,
    });
  } catch (error) {
    next(error);
  }
};

export const archiveWorkspaceController = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const scoped = req as WorkspaceScopedRequest;
    const workspace = await archiveWorkspace(scoped.userId, scoped.workspace);

    sendSuccessResponse({
      res,
      statusCode: 200,
      message: "Workspace archived successfully.",
      data: workspace,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteWorkspaceController = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const scoped = req as WorkspaceScopedRequest;
    await deleteWorkspace(scoped.userId, scoped.workspace);

    sendSuccessResponse({
      res,
      statusCode: 200,
      message: "Workspace deleted successfully.",
    });
  } catch (error) {
    next(error);
  }
};

export const listWorkspaceMembersController = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const workspace = (req as WorkspaceScopedRequest).workspace;
    const members = await listWorkspaceMembers(workspace._id.toString());

    sendSuccessResponse({
      res,
      statusCode: 200,
      message: "Workspace members retrieved successfully.",
      data: members,
    });
  } catch (error) {
    next(error);
  }
};

export const addWorkspaceMemberController = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const scoped = req as WorkspaceScopedRequest;
    await addWorkspaceMember(scoped.userId, scoped.workspace, req.body);

    sendSuccessResponse({
      res,
      statusCode: 201,
      message: "Member added to workspace successfully.",
    });
  } catch (error) {
    next(error);
  }
};

export const removeWorkspaceMemberController = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const scoped = req as WorkspaceScopedRequest;
    await removeWorkspaceMember(scoped.userId, scoped.workspace, req.params.memberId as string);

    sendSuccessResponse({
      res,
      statusCode: 200,
      message: "Member removed from workspace successfully.",
    });
  } catch (error) {
    next(error);
  }
};
