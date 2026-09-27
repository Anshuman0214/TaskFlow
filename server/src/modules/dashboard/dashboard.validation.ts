import { z } from "zod";

// Runs before requireOrganizationAccessFromQuery so a missing organizationId
// fails as a 422 validation error rather than a 400 from deep inside the
// access helper.
export const organizationScopeQuerySchema = z.object({
  organizationId: z.string().min(1, "organizationId is required"),
});

export type OrganizationScopeQuery = z.infer<typeof organizationScopeQuerySchema>;
