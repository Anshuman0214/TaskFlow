import { Router } from "express";
import rateLimit from "express-rate-limit";
import { env } from "../../config/env.js";
import { validateBody } from "../../middleware/validate.middleware.js";
import { requireAuth } from "./auth.middleware.js";
import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  verifyEmailSchema,
} from "./auth.validation.js";
import {
  forgotPasswordController,
  loginController,
  logoutAllController,
  logoutController,
  meController,
  refreshController,
  registerController,
  resetPasswordController,
  verifyEmailController,
} from "./auth.controller.js";

const router = Router();

// Rate limits exist to slow down abuse, not to throttle the test suite —
// skip enforcement under vitest.
const skip = () => env.NODE_ENV === "test";

const registerLimiter = rateLimit({ windowMs: 60 * 60 * 1000, limit: 5, skip });
const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, skip });
const forgotPasswordLimiter = rateLimit({ windowMs: 60 * 60 * 1000, limit: 5, skip });
const verifyEmailLimiter = rateLimit({ windowMs: 60 * 60 * 1000, limit: 10, skip });
const refreshLimiter = rateLimit({ windowMs: 60 * 60 * 1000, limit: 60, skip });

router.post("/register", registerLimiter, validateBody(registerSchema), registerController);
router.post(
  "/verify-email",
  verifyEmailLimiter,
  validateBody(verifyEmailSchema),
  verifyEmailController,
);
router.post("/login", loginLimiter, validateBody(loginSchema), loginController);
router.post("/refresh", refreshLimiter, refreshController);
router.post("/logout", logoutController);
router.post("/logout-all", requireAuth, logoutAllController);
router.post(
  "/forgot-password",
  forgotPasswordLimiter,
  validateBody(forgotPasswordSchema),
  forgotPasswordController,
);
router.post(
  "/reset-password",
  validateBody(resetPasswordSchema),
  resetPasswordController,
);
router.get("/me", requireAuth, meController);

export default router;
