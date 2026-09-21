import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum (["development", "test", "production"]),
  
  PORT: z.coerce.number().int().positive(),

  MONGODB_URI: z.string().min(1),

  REDIS_URL: z.string().min(1),

  CORS_ORIGIN: z.string().min(1),

  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),

  // Optional: no SMTP provider is configured yet, so the mailer falls back
  // to nodemailer's jsonTransport (logs, sends nothing) when these are unset.
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().positive().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  MAIL_FROM: z.string().default("TaskFlow <no-reply@taskflow.local>"),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error("Invalid environment variables:");
  console.error(parsedEnv.error.flatten().fieldErrors);

  process.exit(1);
}

export const env = parsedEnv.data;