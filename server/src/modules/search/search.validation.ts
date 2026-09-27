import { z } from "zod";
import { TASK_PRIORITIES, TASK_STATUSES } from "../tasks/task.types.js";
import { PROJECT_STATUSES } from "../projects/project.types.js";

export const SEARCH_TYPES = ["task", "project", "workspace", "user"] as const;
export type SearchType = (typeof SEARCH_TYPES)[number];

const paging = {
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
};

// organizationId is required on every search route: there is no cross-org
// search, so there is no sensible default tenant to fall back to.
const organizationId = z.string().min(1, "organizationId is required");

export const globalSearchQuerySchema = z.object({
  organizationId,
  q: z.string().trim().min(1, "q is required").max(200),
  type: z.enum(SEARCH_TYPES).optional(),
  ...paging,
});

export const taskSearchQuerySchema = z.object({
  organizationId,
  q: z.string().trim().min(1).max(200).optional(),
  status: z.enum(TASK_STATUSES).optional(),
  priority: z.enum(TASK_PRIORITIES).optional(),
  assigneeId: z.string().min(1).optional(),
  labelId: z.string().min(1).optional(),
  projectId: z.string().min(1).optional(),
  dueBefore: z.coerce.date().optional(),
  dueAfter: z.coerce.date().optional(),
  ...paging,
});

export const projectSearchQuerySchema = z.object({
  organizationId,
  q: z.string().trim().min(1).max(200).optional(),
  status: z.enum(PROJECT_STATUSES).optional(),
  workspaceId: z.string().min(1).optional(),
  ...paging,
});

export type GlobalSearchQuery = z.infer<typeof globalSearchQuerySchema>;
export type TaskSearchQuery = z.infer<typeof taskSearchQuerySchema>;
export type ProjectSearchQuery = z.infer<typeof projectSearchQuerySchema>;
