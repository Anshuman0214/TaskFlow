import { z } from "zod";
import { PROJECT_STATUSES } from "./project.types.js";

const dateSchema = z.coerce.date();
const keySchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z0-9]{2,10}$/, "Key must be 2-10 uppercase letters/numbers");

export const createProjectSchema = z
  .object({
    name: z.string().trim().min(2, "Name must be at least 2 characters").max(100),
    key: keySchema,
    description: z.string().trim().max(500).optional(),
    startDate: dateSchema.optional(),
    endDate: dateSchema.optional(),
  })
  .refine(
    (data) => !data.startDate || !data.endDate || data.startDate <= data.endDate,
    { message: "startDate must be before or equal to endDate", path: ["endDate"] },
  );

export const updateProjectSchema = z
  .object({
    name: z.string().trim().min(2).max(100),
    description: z.string().trim().max(500).nullable(),
    status: z.enum(PROJECT_STATUSES),
    startDate: dateSchema.nullable(),
    endDate: dateSchema.nullable(),
  })
  .partial()
  .refine((data) => Object.keys(data).length > 0, "At least one field must be provided")
  .refine(
    (data) => !data.startDate || !data.endDate || data.startDate <= data.endDate,
    { message: "startDate must be before or equal to endDate", path: ["endDate"] },
  );

export const listProjectsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  status: z.enum(PROJECT_STATUSES).optional(),
  sortBy: z.enum(["createdAt", "updatedAt", "name", "startDate", "endDate"]).default("createdAt"),
  order: z.enum(["asc", "desc"]).default("desc"),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
export type ListProjectsQuery = z.infer<typeof listProjectsQuerySchema>;
