import { z } from "zod";
import { TASK_PRIORITIES, TASK_STATUSES } from "./task.types.js";

const dateSchema = z.coerce.date();

export const createTaskSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  description: z.string().trim().max(5000).optional(),
  priority: z.enum(TASK_PRIORITIES).default("MEDIUM"),
  assigneeId: z.string().min(1).nullable().optional(),
  dueDate: dateSchema.nullable().optional(),
  startDate: dateSchema.nullable().optional(),
  parentTaskId: z.string().min(1).nullable().optional(),
  labelIds: z.array(z.string().min(1)).default([]),
});

export const updateTaskSchema = z
  .object({
    title: z.string().trim().min(1).max(200),
    description: z.string().trim().max(5000).nullable(),
    priority: z.enum(TASK_PRIORITIES),
    status: z.enum(TASK_STATUSES),
    assigneeId: z.string().min(1).nullable(),
    dueDate: dateSchema.nullable(),
    startDate: dateSchema.nullable(),
    labelIds: z.array(z.string().min(1)),
    // Restore only — deletion happens through DELETE, not PATCH.
    isDeleted: z.literal(false),
  })
  .partial()
  .refine((data) => Object.keys(data).length > 0, "At least one field must be provided");

export const listTasksQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  status: z.enum(TASK_STATUSES).optional(),
  priority: z.enum(TASK_PRIORITIES).optional(),
  assigneeId: z.string().min(1).optional(),
  labelId: z.string().min(1).optional(),
  dueDate: dateSchema.optional(),
  sortBy: z.enum(["createdAt", "updatedAt", "dueDate", "priority", "title"]).default("createdAt"),
  order: z.enum(["asc", "desc"]).default("desc"),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
export type ListTasksQuery = z.infer<typeof listTasksQuerySchema>;
