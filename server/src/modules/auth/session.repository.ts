import { Types } from "mongoose";
import { redisClient } from "../../database/redis.js";
import { Session } from "./session.model.js";
import { REFRESH_TOKEN_TTL_SECONDS } from "./auth.config.js";

const redisKey = (userId: string, sessionId: string): string =>
  `session:${userId}:${sessionId}`;

const orgAccessKey = (userId: string, sessionId: string): string =>
  `session:orgs:${userId}:${sessionId}`;

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
  // SCAN walks the keyspace in small batches instead of blocking Redis with
  // KEYS, which would otherwise scan the whole keyspace in one shot.
  const keys: string[] = [];
  const stream = redisClient.scanStream({ match: redisKey(userId, "*"), count: 100 });

  for await (const chunk of stream as AsyncIterable<string[]>) {
    keys.push(...chunk);
  }

  if (keys.length > 0) {
    await redisClient.del(...keys);
  }

  await Session.updateMany(
    { userId: new Types.ObjectId(userId), isRevoked: false },
    { isRevoked: true, revokedAt: new Date() },
  );
};

// Records that this login session has been used to access an organization,
// so a later org deletion can tell whether the session still has other orgs
// left (see revokeSessionsForOrganization). Sliding TTL matches the session's.
export const recordSessionOrgAccess = async (
  userId: string,
  sessionId: string,
  organizationId: string,
): Promise<void> => {
  const key = orgAccessKey(userId, sessionId);
  await redisClient.sadd(key, organizationId);
  await redisClient.expire(key, REFRESH_TOKEN_TTL_SECONDS);
};

// Revokes a member's session only when we have direct evidence (the tracked
// org-access set) that the deleted org was the ONLY org this session ever
// touched. A session with no tracked set (never recorded, e.g. it predates
// this feature or never hit an org route) is left alone — fail open rather
// than logging a user out of unrelated orgs on a guess.
export const revokeSessionsForOrganization = async (
  organizationId: string,
  memberUserIds: string[],
): Promise<void> => {
  for (const userId of memberUserIds) {
    const sessions = await Session.find({
      userId: new Types.ObjectId(userId),
      isRevoked: false,
    }).select("_id");

    for (const session of sessions) {
      const sessionId = session._id.toString();
      const key = orgAccessKey(userId, sessionId);

      const tracked = await redisClient.exists(key);
      if (!tracked) continue;

      await redisClient.srem(key, organizationId);
      const remaining = await redisClient.scard(key);

      if (remaining === 0) {
        await revokeSession(userId, sessionId);
      }
    }
  }
};
