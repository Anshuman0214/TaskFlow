import { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/AppError.js";
import { logger } from "../utils/logger.js";

export const errorMiddleware = (
  error: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  logger.error(error.message, { stack: error.stack });

  if (error instanceof AppError) {
    res.status(error.statusCode).json({
      success: false,
      message: error.message,
      ...(error.code ? { error: { code: error.code, details: error.details } } : {}),
    });

    return;
  }

  res.status(500).json({
    success: false,
    message: "Internal server error",
  });
};