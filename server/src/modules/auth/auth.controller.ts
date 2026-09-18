import { Request, Response, NextFunction } from "express";
import { sendSuccessResponse } from "../../utils/apiResponse.js";
import { AppError } from "../../utils/AppError.js";
import { AuthedRequest } from "./auth.middleware.js";
import { REFRESH_COOKIE_NAME, REFRESH_COOKIE_PATH, REFRESH_TOKEN_TTL_SECONDS } from "./auth.config.js";
import { env } from "../../config/env.js";
import {
  forgotPassword,
  getCurrentUser,
  loginUser,
  logoutAllSessions,
  logoutUser,
  refreshSession,
  registerUser,
  resetPassword,
  verifyEmail,
} from "./auth.service.js";

const setRefreshTokenCookie = (res: Response, refreshToken: string): void => {
  res.cookie(REFRESH_COOKIE_NAME, refreshToken, {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "strict",
    path: REFRESH_COOKIE_PATH,
    maxAge: REFRESH_TOKEN_TTL_SECONDS * 1000,
  });
};

const clearRefreshTokenCookie = (res: Response): void => {
  res.clearCookie(REFRESH_COOKIE_NAME, { path: REFRESH_COOKIE_PATH });
};

const getDeviceInfo = (req: Request) => ({
  userAgent: req.headers["user-agent"] ?? null,
  ipAddress: req.ip ?? null,
});

export const registerController = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    await registerUser(req.body);

    sendSuccessResponse({
      res,
      statusCode: 201,
      message: "Registration successful. Please verify your email.",
    });
  } catch (error) {
    next(error);
  }
};

export const verifyEmailController = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    await verifyEmail(req.body);

    sendSuccessResponse({
      res,
      statusCode: 200,
      message: "Email verified successfully.",
    });
  } catch (error) {
    next(error);
  }
};

export const loginController = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const result = await loginUser(req.body, getDeviceInfo(req));
    setRefreshTokenCookie(res, result.refreshToken);

    sendSuccessResponse({
      res,
      statusCode: 200,
      message: "Login successful.",
      data: { accessToken: result.accessToken, user: result.user },
    });
  } catch (error) {
    next(error);
  }
};

export const refreshController = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME];

    if (!refreshToken) {
      throw new AppError("Missing refresh token", 401, "UNAUTHORIZED");
    }

    const result = await refreshSession(refreshToken);
    setRefreshTokenCookie(res, result.refreshToken);

    sendSuccessResponse({
      res,
      statusCode: 200,
      message: "Access token refreshed.",
      data: { accessToken: result.accessToken },
    });
  } catch (error) {
    next(error);
  }
};

export const logoutController = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME];

    if (refreshToken) {
      await logoutUser(refreshToken);
    }

    clearRefreshTokenCookie(res);

    sendSuccessResponse({
      res,
      statusCode: 200,
      message: "Logged out successfully.",
    });
  } catch (error) {
    next(error);
  }
};

export const logoutAllController = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    await logoutAllSessions((req as AuthedRequest).userId);
    clearRefreshTokenCookie(res);

    sendSuccessResponse({
      res,
      statusCode: 200,
      message: "All sessions have been terminated.",
    });
  } catch (error) {
    next(error);
  }
};

export const forgotPasswordController = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    await forgotPassword(req.body);

    sendSuccessResponse({
      res,
      statusCode: 200,
      message: "If an account exists, a password reset email has been sent.",
    });
  } catch (error) {
    next(error);
  }
};

export const resetPasswordController = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    await resetPassword(req.body);

    sendSuccessResponse({
      res,
      statusCode: 200,
      message: "Password reset successfully.",
    });
  } catch (error) {
    next(error);
  }
};

export const meController = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const user = await getCurrentUser((req as AuthedRequest).userId);

    sendSuccessResponse({
      res,
      statusCode: 200,
      message: "Current user retrieved successfully.",
      data: { user },
    });
  } catch (error) {
    next(error);
  }
};
