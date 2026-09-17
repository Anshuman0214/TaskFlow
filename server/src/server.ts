import app from "./app.js";
import { env } from "./config/env.js";
import { connectMongoDB } from "./database/mongodb.js";
import { connectRedis, redisClient } from "./database/redis.js";
import { logger } from "./utils/logger.js";

const startServer = async (): Promise<void> => {
  await connectMongoDB();
  await connectRedis();

  const server = app.listen(env.PORT, () => {
    logger.info(`TaskFlow API running on port ${env.PORT}`);
  });

  const shutdown = (): void => {
    logger.info("Shutting down server...");

    server.close(() => {
      redisClient.disconnect();
      logger.info("HTTP server closed");
      process.exit(0);
    });
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
};

startServer();