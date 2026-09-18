import { Request, Response, NextFunction } from "express";
import { AppError } from "../../utils/AppError.js";
import { verifyAccessToken } from "./token.util.js";

export interface AuthedRequest extends Request {
  userId: string;
}

export const requireAuth = (
  req: Request,
  _res: Response,
  next: NextFunction,
): void => {
  const header = req.headers.authorization;

  if (!header?.startsWith("Bearer ")) {
    next(new AppError("Authentication required", 401, "UNAUTHORIZED"));
    return;
  }

  const token = header.slice("Bearer ".length);

  try {
    const payload = verifyAccessToken(token);
    (req as AuthedRequest).userId = payload.userId;
    next();
  } catch {
    next(new AppError("Invalid or expired access token", 401, "TOKEN_EXPIRED"));
  }
};
