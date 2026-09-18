import { logger } from "../../utils/logger.js";

// ponytail: no SMTP/email provider is configured yet, so this just logs the
// link instead of sending it. Swap the body for a real provider (e.g.
// nodemailer/SES/Resend) once credentials exist — call sites don't change.
export const sendVerificationEmail = (email: string, rawToken: string): void => {
  logger.info("Verification email (stub)", {
    email,
    link: `/api/v1/auth/verify-email?token=${rawToken}`,
  });
};

export const sendPasswordResetEmail = (email: string, rawToken: string): void => {
  logger.info("Password reset email (stub)", {
    email,
    link: `/api/v1/auth/reset-password?token=${rawToken}`,
  });
};
