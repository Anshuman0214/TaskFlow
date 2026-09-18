import { Request, Response, NextFunction } from "express";
import { ZodType } from "zod";
import { AppError } from "../utils/AppError.js";

export const validateBody =
  (schema: ZodType) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      const details = result.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      }));

      next(new AppError("Validation failed", 422, "VALIDATION_ERROR", details));
      return;
    }

    req.body = result.data;
    next();
  };
