import { Request, Response, NextFunction } from "express";
import { ZodError, ZodType } from "zod";
import { AppError } from "../utils/AppError.js";

const toValidationError = (error: ZodError): AppError => {
  const details = error.issues.map((issue) => ({
    field: issue.path.join("."),
    message: issue.message,
  }));

  return new AppError("Validation failed", 422, "VALIDATION_ERROR", details);
};

export const validateBody =
  (schema: ZodType) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      next(toValidationError(result.error));
      return;
    }

    req.body = result.data;
    next();
  };

// req.query is a getter-only accessor in Express 5 (no setter), so the
// validated/coerced result is shadowed onto the request instance instead of
// assigned directly — same effect, every later `req.query` read sees it.
export const validateQuery =
  (schema: ZodType) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.query);

    if (!result.success) {
      next(toValidationError(result.error));
      return;
    }

    Object.defineProperty(req, "query", { value: result.data, writable: true, configurable: true });
    next();
  };
