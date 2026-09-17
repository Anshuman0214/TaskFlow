import { Request, Response } from "express";
import { sendSuccessResponse } from "../../utils/apiResponse.js";
import { getApiInfo, getHealthStatus } from "./system.service.js";

export const healthController = (_req: Request, res: Response): void => {
  const health = getHealthStatus();

  sendSuccessResponse({
    res,
    statusCode: health.status === "ok" ? 200 : 503,
    message: "Health check",
    data: health,
  });
};

export const infoController = (_req: Request, res: Response): void => {
  sendSuccessResponse({
    res,
    statusCode: 200,
    message: "API information",
    data: getApiInfo(),
  });
};
