import { z } from "zod";

export const createCommentSchema = z.object({
  content: z.string().trim().min(1, "Content is required").max(5000),
  mentionedUserIds: z.array(z.string().min(1)).default([]),
});

export const updateCommentSchema = z.object({
  content: z.string().trim().min(1, "Content is required").max(5000),
});

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export type CreateCommentInput = z.infer<typeof createCommentSchema>;
export type UpdateCommentInput = z.infer<typeof updateCommentSchema>;
export type PaginationQuery = z.infer<typeof paginationQuerySchema>;
