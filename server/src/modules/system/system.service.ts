import mongoose from "mongoose";
import { redisClient } from "../../database/redis.js";
import { env } from "../../config/env.js";
import { ApiInfo, HealthStatus, ServiceStatus } from "./system.types.js";

export const getHealthStatus = (): HealthStatus => {
  const database: ServiceStatus =
    mongoose.connection.readyState === 1 ? "connected" : "disconnected";
  const redis: ServiceStatus =
    redisClient.status === "ready" ? "connected" : "disconnected";

  const status: HealthStatus["status"] =
    database === "connected" && redis === "connected" ? "ok" : "degraded";

  return {
    status,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    services: { database, redis },
  };
};

export const getApiInfo = (): ApiInfo => ({
  name: "TaskFlow API",
  version: "v1",
  environment: env.NODE_ENV,
});
