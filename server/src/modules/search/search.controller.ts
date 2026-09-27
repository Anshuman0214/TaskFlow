import { Request, Response, NextFunction } from "express";
import { sendSuccessResponse } from "../../utils/apiResponse.js";
import { globalSearch, projectSearch, taskSearch } from "./search.service.js";
import { GlobalSearchQuery, ProjectSearchQuery, TaskSearchQuery } from "./search.validation.js";

export const globalSearchController = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const query = req.query as unknown as GlobalSearchQuery;
    const results = await globalSearch(query.organizationId, query);

    sendSuccessResponse({
      res,
      statusCode: 200,
      message: "Search completed successfully.",
      data: results,
      meta: { page: query.page, limit: query.limit, q: query.q, ...(query.type ? { type: query.type } : {}) },
    });
  } catch (error) {
    next(error);
  }
};

export const taskSearchController = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const query = req.query as unknown as TaskSearchQuery;
    const { items, total } = await taskSearch(query.organizationId, query);

    sendSuccessResponse({
      res,
      statusCode: 200,
      message: "Task search completed successfully.",
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

export const projectSearchController = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const query = req.query as unknown as ProjectSearchQuery;
    const { items, total } = await projectSearch(query.organizationId, query);

    sendSuccessResponse({
      res,
      statusCode: 200,
      message: "Project search completed successfully.",
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
