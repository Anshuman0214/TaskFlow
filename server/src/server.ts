import app from "./app.js";
import { env } from "./config/env.js";
import { connectMongoDB } from "./database/mongodb.js";
import { connectRedis, redisClient } from "./database/redis.js";
import {
  startNotificationWorker,
  stopNotificationWorker,
} from "./modules/notifications/notification.queue.js";
import { logger } from "./utils/logger.js";

const startServer = async (): Promise<void> => {
  await connectMongoDB();
  await connectRedis();

  // In-process BullMQ consumer — same node, own Redis connection. No-op under
  // NODE_ENV=test, where notification jobs run inline instead.
  startNotificationWorker();

  const server = app.listen(env.PORT, () => {
    logger.info(`TaskFlow API running on port ${env.PORT}`);
  });

  const shutdown = (): void => {
    logger.info("Shutting down server...");

    server.close(() => {
      void stopNotificationWorker()
        .catch((error: unknown) => logger.error("Worker shutdown failed", { error }))
        .finally(() => {
          redisClient.disconnect();
          logger.info("HTTP server closed");
          process.exit(0);
        });
    });
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
};

startServer();