import { Types } from "mongoose";
import { redisClient } from "../../database/redis.js";
import { Session } from "./session.model.js";
import { REFRESH_TOKEN_TTL_SECONDS } from "./auth.config.js";

const redisKey = (userId: string, sessionId: string): string =>
  `session:${userId}:${sessionId}`;

interface CreateSessionInput {
  userId: string;
  refreshTokenHash: string;
  userAgent: string | null;
  ipAddress: string | null;
}

export const createSession = async (
  input: CreateSessionInput,
): Promise<string> => {
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_SECONDS * 1000);

  const session = await Session.create({
    userId: new Types.ObjectId(input.userId),
    refreshTokenHash: input.refreshTokenHash,
    userAgent: input.userAgent,
    ipAddress: input.ipAddress,
    expiresAt,
  });

  const sessionId = session._id.toString();

  await redisClient.set(
    redisKey(input.userId, sessionId),
    input.refreshTokenHash,
    "EX",
    REFRESH_TOKEN_TTL_SECONDS,
  );

  return sessionId;
};

// Redis is the fast/authoritative check: a missing key means the session was
// revoked, rotated away, or naturally expired — all equivalent to "invalid".
export const isSessionRefreshTokenValid = async (
  userId: string,
  sessionId: string,
  refreshTokenHash: string,
): Promise<boolean> => {
  const storedHash = await redisClient.get(redisKey(userId, sessionId));

  return storedHash !== null && storedHash === refreshTokenHash;
};

export const rotateSession = async (
  userId: string,
  sessionId: string,
  newRefreshTokenHash: string,
): Promise<void> => {
  await redisClient.set(
    redisKey(userId, sessionId),
    newRefreshTokenHash,
    "EX",
    REFRESH_TOKEN_TTL_SECONDS,
  );

  await Session.findByIdAndUpdate(sessionId, {
    refreshTokenHash: newRefreshTokenHash,
    lastActiveAt: new Date(),
    expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_SECONDS * 1000),
  });
};

export const revokeSession = async (
  userId: string,
  sessionId: string,
): Promise<void> => {
  await redisClient.del(redisKey(userId, sessionId));

  await Session.findByIdAndUpdate(sessionId, {
    isRevoked: true,
    revokedAt: new Date(),
  });
};

export const revokeAllSessionsForUser = async (userId: string): Promise<void> => {
  // ponytail: KEYS is O(n) over the keyspace; fine at this scale, switch to
  // SCAN (or a per-user Redis SET tracking session ids) if the keyspace grows large.
  const keys = await redisClient.keys(redisKey(userId, "*"));

  if (keys.length > 0) {
    await redisClient.del(...keys);
  }

  await Session.updateMany(
    { userId: new Types.ObjectId(userId), isRevoked: false },
    { isRevoked: true, revokedAt: new Date() },
  );
};
