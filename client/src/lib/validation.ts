import { z } from "zod";

// Mirrors server/src/modules/auth/auth.validation.ts's strongPassword — client-side
// validation is a UX nicety, the backend remains the source of truth.
export const strongPasswordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(128, "Password must not exceed 128 characters")
  .regex(/[a-z]/, "Password must contain a lowercase letter")
  .regex(/[A-Z]/, "Password must contain an uppercase letter")
  .regex(/[0-9]/, "Password must contain a number")
  .regex(/[^a-zA-Z0-9]/, "Password must contain a special character");

export const emailSchema = z.string().trim().toLowerCase().pipe(z.email("Please provide a valid email address"));
