import { z } from "zod";

export const createWorkspaceSchema = z.object({
  organizationId: z.string().min(1, "Organization id is required"),
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(100),
  description: z.string().trim().max(500).optional(),
});

export const updateWorkspaceSchema = z
  .object({
    name: z.string().trim().min(2).max(100),
    description: z.string().trim().max(500).nullable(),
  })
  .partial()
  .refine((data) => Object.keys(data).length > 0, "At least one field must be provided");

export const addWorkspaceMemberSchema = z.object({
  userId: z.string().min(1, "User id is required"),
});

export type CreateWorkspaceInput = z.infer<typeof createWorkspaceSchema>;
export type UpdateWorkspaceInput = z.infer<typeof updateWorkspaceSchema>;
export type AddWorkspaceMemberInput = z.infer<typeof addWorkspaceMemberSchema>;
