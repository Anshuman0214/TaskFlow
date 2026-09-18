import crypto from "crypto";
import jwt from "jsonwebtoken";
import { env } from "../../config/env.js";
import { AccessTokenPayload, RefreshTokenPayload } from "./auth.types.js";
import { ACCESS_TOKEN_TTL, REFRESH_TOKEN_TTL_SECONDS } from "./auth.config.js";

export const signAccessToken = (payload: AccessTokenPayload): string =>
  jwt.sign(payload, env.JWT_ACCESS_SECRET, { expiresIn: ACCESS_TOKEN_TTL });

export const signRefreshToken = (payload: RefreshTokenPayload): string =>
  jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    expiresIn: REFRESH_TOKEN_TTL_SECONDS,
  });

export const verifyAccessToken = (token: string): AccessTokenPayload =>
  jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessTokenPayload;

export const verifyRefreshToken = (token: string): RefreshTokenPayload =>
  jwt.verify(token, env.JWT_REFRESH_SECRET) as RefreshTokenPayload;

// Random, single-use tokens for email verification / password reset links.
// Only the SHA-256 hash is persisted, matching the "tokens are hashed" security rule.
export const generateRawToken = (): string => crypto.randomBytes(32).toString("hex");

export const hashToken = (rawToken: string): string =>
  crypto.createHash("sha256").update(rawToken).digest("hex");
