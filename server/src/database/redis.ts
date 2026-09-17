import { Redis } from "ioredis";
import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";

export const redisClient = new Redis(env.REDIS_URL, {
  lazyConnect: true,
  maxRetriesPerRequest: 3,
});

redisClient.on("error", (error: Error) => {
  logger.error("Redis connection error", { error });
});

export const connectRedis = async (): Promise<void> => {
  try {
    await redisClient.connect();
    logger.info("Redis connected successfully");
  } catch (error) {
    logger.error("Redis connection failed", { error });
    process.exit(1);
  }
};
