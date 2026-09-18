import { AppError } from "../../utils/AppError.js";
import { logger } from "../../utils/logger.js";
import {
  createUser,
  findUserByEmail,
  findUserByEmailVerificationTokenHash,
  findUserByIdWithSecrets,
  findUserByPasswordResetTokenHash,
} from "../users/user.repository.js";
import { IUser } from "../users/user.types.js";
import {
  AuthUserResponse,
  LoginResult,
  RefreshResult,
} from "./auth.types.js";
import {
  ForgotPasswordInput,
  LoginInput,
  RegisterInput,
  ResetPasswordInput,
  VerifyEmailInput,
} from "./auth.validation.js";
import {
  EMAIL_VERIFICATION_TTL_MS,
  PASSWORD_RESET_TTL_MS,
} from "./auth.config.js";
import { sendPasswordResetEmail, sendVerificationEmail } from "./mailer.js";
import {
  createSession,
  isSessionRefreshTokenValid,
  revokeAllSessionsForUser,
  revokeSession,
  rotateSession,
} from "./session.repository.js";
import {
  generateRawToken,
  hashToken,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from "./token.util.js";

interface DeviceInfo {
  userAgent: string | null;
  ipAddress: string | null;
}

const toAuthUserResponse = (user: IUser & { _id: unknown }): AuthUserResponse => ({
  id: (user._id as { toString(): string }).toString(),
  name: user.name,
  email: user.email,
  isActive: user.isActive,
  isEmailVerified: user.isEmailVerified,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

const issueSessionTokens = async (
  userId: string,
  device: DeviceInfo,
): Promise<{ accessToken: string; refreshToken: string }> => {
  // Session id must exist before the refresh token can embed it, and the
  // stored hash must exist before the session can be validated — create the
  // session row first with a placeholder, then rotate in the real hash.
  const sessionId = await createSession({
    userId,
    refreshTokenHash: "pending",
    userAgent: device.userAgent,
    ipAddress: device.ipAddress,
  });

  const refreshToken = signRefreshToken({ userId, sessionId });
  await rotateSession(userId, sessionId, hashToken(refreshToken));

  const accessToken = signAccessToken({ userId });

  return { accessToken, refreshToken };
};

export const registerUser = async (input: RegisterInput): Promise<void> => {
  const { name, email, password } = input;

  const existingUser = await findUserByEmail(email);

  if (existingUser) {
    throw new AppError("Email is already registered", 409, "DUPLICATE_RESOURCE");
  }

  const rawToken = generateRawToken();

  const user = await createUser({ name, email, password });
  user.emailVerificationTokenHash = hashToken(rawToken);
  user.emailVerificationExpiresAt = new Date(Date.now() + EMAIL_VERIFICATION_TTL_MS);
  await user.save();

  sendVerificationEmail(user.email, rawToken);

  logger.info("Authentication event", { event: "USER_REGISTERED", userId: user._id.toString() });
};

export const verifyEmail = async (input: VerifyEmailInput): Promise<void> => {
  const tokenHash = hashToken(input.token);
  const user = await findUserByEmailVerificationTokenHash(tokenHash);

  if (
    !user ||
    !user.emailVerificationExpiresAt ||
    user.emailVerificationExpiresAt.getTime() < Date.now()
  ) {
    throw new AppError("Invalid or expired verification token", 400, "INVALID_TOKEN");
  }

  user.isEmailVerified = true;
  user.emailVerificationTokenHash = null;
  user.emailVerificationExpiresAt = null;
  await user.save();

  logger.info("Authentication event", { event: "EMAIL_VERIFIED", userId: user._id.toString() });
};

export const loginUser = async (
  input: LoginInput,
  device: DeviceInfo,
): Promise<LoginResult> => {
  const user = await findUserByEmail(input.email);

  if (!user || !(await user.comparePassword(input.password))) {
    logger.info("Authentication event", { event: "LOGIN_FAILED", email: input.email });
    throw new AppError("Invalid email or password", 401, "UNAUTHORIZED");
  }

  if (!user.isActive) {
    throw new AppError("Account disabled", 403, "ACCOUNT_DISABLED");
  }

  if (!user.isEmailVerified) {
    throw new AppError("Email not verified", 403, "EMAIL_NOT_VERIFIED");
  }

  const userId = user._id.toString();
  const { accessToken, refreshToken } = await issueSessionTokens(userId, device);

  logger.info("Authentication event", { event: "LOGIN_SUCCESS", userId });

  return { accessToken, refreshToken, user: toAuthUserResponse(user) };
};

export const refreshSession = async (refreshToken: string): Promise<RefreshResult> => {
  let payload;

  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw new AppError("Invalid or expired refresh token", 401, "INVALID_TOKEN");
  }

  const { userId, sessionId } = payload;
  const valid = await isSessionRefreshTokenValid(userId, sessionId, hashToken(refreshToken));

  if (!valid) {
    throw new AppError("Session expired or revoked", 401, "INVALID_TOKEN");
  }

  const newRefreshToken = signRefreshToken({ userId, sessionId });
  await rotateSession(userId, sessionId, hashToken(newRefreshToken));

  const accessToken = signAccessToken({ userId });

  logger.info("Authentication event", { event: "SESSION_REFRESHED", userId });

  return { accessToken, refreshToken: newRefreshToken };
};

export const logoutUser = async (refreshToken: string): Promise<void> => {
  let payload;

  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    return;
  }

  await revokeSession(payload.userId, payload.sessionId);
  logger.info("Authentication event", { event: "LOGOUT", userId: payload.userId });
};

export const logoutAllSessions = async (userId: string): Promise<void> => {
  await revokeAllSessionsForUser(userId);
  logger.info("Authentication event", { event: "LOGOUT_ALL", userId });
};

export const forgotPassword = async (input: ForgotPasswordInput): Promise<void> => {
  const user = await findUserByEmail(input.email);

  // Always behave the same way whether or not the account exists, to avoid
  // leaking which emails are registered.
  if (!user) {
    return;
  }

  const rawToken = generateRawToken();
  user.passwordResetTokenHash = hashToken(rawToken);
  user.passwordResetExpiresAt = new Date(Date.now() + PASSWORD_RESET_TTL_MS);
  await user.save();

  sendPasswordResetEmail(user.email, rawToken);

  logger.info("Authentication event", {
    event: "PASSWORD_RESET_REQUESTED",
    userId: user._id.toString(),
  });
};

export const resetPassword = async (input: ResetPasswordInput): Promise<void> => {
  const tokenHash = hashToken(input.token);
  const user = await findUserByPasswordResetTokenHash(tokenHash);

  if (
    !user ||
    !user.passwordResetExpiresAt ||
    user.passwordResetExpiresAt.getTime() < Date.now()
  ) {
    throw new AppError("Invalid or expired reset token", 400, "INVALID_TOKEN");
  }

  user.password = input.newPassword;
  user.passwordResetTokenHash = null;
  user.passwordResetExpiresAt = null;
  await user.save();

  const userId = user._id.toString();
  await revokeAllSessionsForUser(userId);

  logger.info("Authentication event", { event: "PASSWORD_RESET_COMPLETED", userId });
};

export const getCurrentUser = async (userId: string): Promise<AuthUserResponse> => {
  const user = await findUserByIdWithSecrets(userId);

  if (!user) {
    throw new AppError("User not found", 404, "RESOURCE_NOT_FOUND");
  }

  return toAuthUserResponse(user);
};
