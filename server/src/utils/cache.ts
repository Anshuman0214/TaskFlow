import { redisClient } from "../database/redis.js";
import { logger } from "./logger.js";

// Dashboard aggregations are expensive and tolerate being a minute stale, per
// Docs/ApiSpecifications.md ("Dashboard endpoints use Redis caching when
// enabled"). Deliberately not a cache library: SETEX plus JSON is the whole job.
//
// Every path fails open — a Redis outage must degrade the dashboard to "slow",
// never to "broken".
export const cached = async <T>(key: string, ttlSeconds: number, compute: () => Promise<T>): Promise<T> => {
  try {
    const hit = await redisClient.get(key);

    if (hit !== null) {
      return JSON.parse(hit) as T;
    }
  } catch (error) {
    logger.warn("Cache read failed; recomputing", { key, error });
  }

  const value = await compute();

  try {
    await redisClient.setex(key, ttlSeconds, JSON.stringify(value));
  } catch (error) {
    logger.warn("Cache write failed", { key, error });
  }

  return value;
};

// Called after a write that would make a cached dashboard wrong. Uses SCAN
// (never KEYS — same rule session.repository.ts follows) since the prefix can
// cover one key per user per organization.
export const invalidateCachePrefix = async (prefix: string): Promise<void> => {
  try {
    const stream = redisClient.scanStream({ match: `${prefix}*`, count: 100 });

    for await (const keys of stream as AsyncIterable<string[]>) {
      if (keys.length > 0) {
        await redisClient.del(...keys);
      }
    }
  } catch (error) {
    logger.warn("Cache invalidation failed", { prefix, error });
  }
};
