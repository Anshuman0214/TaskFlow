import { z } from "zod";

const colorSchema = z
  .string()
  .trim()
  .regex(/^#[0-9A-Fa-f]{6}$/, "Color must be a hex value like #3B82F6");

export const createLabelSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(50),
  color: colorSchema,
  description: z.string().trim().max(200).optional(),
});

export const updateLabelSchema = z
  .object({
    name: z.string().trim().min(1).max(50),
    color: colorSchema,
    description: z.string().trim().max(200).nullable(),
  })
  .partial()
  .refine((data) => Object.keys(data).length > 0, "At least one field must be provided");

export type CreateLabelInput = z.infer<typeof createLabelSchema>;
export type UpdateLabelInput = z.infer<typeof updateLabelSchema>;
