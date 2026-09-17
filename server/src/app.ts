import express from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import swaggerUi from "swagger-ui-express";
import router from "./routes/index.js";
import { requestTimeMiddleware } from "./middleware/requestTime.middleware.js";
import { notFoundMiddleware } from "./middleware/notFound.middleware.js";
import { errorMiddleware } from "./middleware/error.middleware.js";
import { env } from "./config/env.js";
import { openApiDocument } from "./docs/openapi.js";

const app = express();

// Required for correct client IPs / rate limiting behind a reverse proxy (Nginx in production).
app.set("trust proxy", 1);

app.use(helmet());

app.use(
  cors({
    origin: env.CORS_ORIGIN.split(",").map((origin) => origin.trim()),
    credentials: true,
  }),
);

app.use(cookieParser());

app.use(express.json({ limit: "10kb" }));

const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
});

app.use("/api", apiRateLimiter);

app.use(requestTimeMiddleware);

app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(openApiDocument));

app.use("/", router);

app.use(notFoundMiddleware);

app.use(errorMiddleware);

export default app;