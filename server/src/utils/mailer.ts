import nodemailer from "nodemailer";
import { env } from "../config/env.js";
import { logger } from "./logger.js";

// No SMTP credentials configured yet, so this falls back to nodemailer's
// jsonTransport — it "sends" nothing over the network but keeps the same
// transporter.sendMail() call shape. Set SMTP_* env vars to send for real;
// call sites below don't change.
const transporter = env.SMTP_HOST
  ? nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT ?? 587,
      secure: env.SMTP_PORT === 465,
      auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
    })
  : nodemailer.createTransport({ jsonTransport: true });

const send = (subject: string, email: string, text: string, link: string): void => {
  transporter
    .sendMail({ from: env.MAIL_FROM, to: email, subject, text })
    .then(() => logger.info(subject, { email, link }))
    .catch((error: unknown) => logger.error("Failed to send email", { email, subject, error }));
};

export const sendVerificationEmail = (email: string, rawToken: string): void => {
  const link = `/api/v1/auth/verify-email?token=${rawToken}`;
  send("Verify your email", email, `Verify your email: ${link}`, link);
};

export const sendPasswordResetEmail = (email: string, rawToken: string): void => {
  const link = `/api/v1/auth/reset-password?token=${rawToken}`;
  send("Reset your password", email, `Reset your password: ${link}`, link);
};

export const sendOrganizationInviteEmail = (
  email: string,
  organizationName: string,
  rawToken: string,
): void => {
  const link = `/api/v1/organizations/invitations/accept?token=${rawToken}`;
  send(
    `You've been invited to join ${organizationName}`,
    email,
    `You've been invited to join ${organizationName}: ${link}`,
    link,
  );
};
