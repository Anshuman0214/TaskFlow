import { Request, Response, NextFunction } from "express";
import { sendSuccessResponse } from "../../utils/apiResponse.js";
import { ProjectScopedRequest } from "./project.middleware.js";
import { createLabel, deleteLabelFromProject, listLabels, updateLabel } from "./label.service.js";

export const createLabelController = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const scoped = req as ProjectScopedRequest;
    const label = await createLabel(scoped.userId, scoped.project, req.body);

    sendSuccessResponse({
      res,
      statusCode: 201,
      message: "Label created successfully.",
      data: label,
    });
  } catch (error) {
    next(error);
  }
};

export const listLabelsController = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const scoped = req as ProjectScopedRequest;
    const labels = await listLabels(scoped.project._id.toString());

    sendSuccessResponse({
      res,
      statusCode: 200,
      message: "Labels retrieved successfully.",
      data: labels,
    });
  } catch (error) {
    next(error);
  }
};

export const updateLabelController = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const scoped = req as ProjectScopedRequest;
    const label = await updateLabel(scoped.userId, scoped.project, req.params.labelId as string, req.body);

    sendSuccessResponse({
      res,
      statusCode: 200,
      message: "Label updated successfully.",
      data: label,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteLabelController = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const scoped = req as ProjectScopedRequest;
    await deleteLabelFromProject(scoped.userId, scoped.project, req.params.labelId as string);

    sendSuccessResponse({
      res,
      statusCode: 200,
      message: "Label deleted successfully.",
    });
  } catch (error) {
    next(error);
  }
};
