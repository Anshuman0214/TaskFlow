import { beforeAll, afterAll } from "vitest";
import mongoose from "mongoose";
import { env } from "../src/config/env.js";
import { redisClient } from "../src/database/redis.js";

beforeAll(async () => {
  await mongoose.connect(env.MONGODB_URI);
  await redisClient.connect();
});

afterAll(async () => {
  await mongoose.disconnect();
  redisClient.disconnect();
});
