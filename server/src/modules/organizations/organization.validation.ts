import { z } from "zod";
import { ASSIGNABLE_ORGANIZATION_ROLES } from "./organization.types.js";

const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Slug must be URL-safe (lowercase letters, numbers, hyphens)");

export const createOrganizationSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(100),
  slug: slugSchema.optional(),
  description: z.string().trim().max(500).optional(),
});

export const updateOrganizationSchema = z
  .object({
    name: z.string().trim().min(2).max(100),
    description: z.string().trim().max(500).nullable(),
    logo: z.string().trim().url().nullable(),
  })
  .partial()
  .refine((data) => Object.keys(data).length > 0, "At least one field must be provided");

export const inviteMemberSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email("Please provide a valid email address")),
  role: z.enum(ASSIGNABLE_ORGANIZATION_ROLES),
});

export const updateMemberRoleSchema = z.object({
  role: z.enum(ASSIGNABLE_ORGANIZATION_ROLES),
});

export const acceptInvitationSchema = z.object({
  token: z.string().min(1, "Token is required"),
});

export type CreateOrganizationInput = z.infer<typeof createOrganizationSchema>;
export type UpdateOrganizationInput = z.infer<typeof updateOrganizationSchema>;
export type InviteMemberInput = z.infer<typeof inviteMemberSchema>;
export type UpdateMemberRoleInput = z.infer<typeof updateMemberRoleSchema>;
export type AcceptInvitationInput = z.infer<typeof acceptInvitationSchema>;
