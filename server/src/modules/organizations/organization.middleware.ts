import { Request, Response, NextFunction } from "express";
import { AppError } from "../../utils/AppError.js";
import { AuthedRequest } from "../auth/auth.middleware.js";
import { recordSessionOrgAccess } from "../auth/session.repository.js";
import { findOrganizationById } from "./organization.repository.js";
import { findMembership } from "./organizationMember.repository.js";
import { OrganizationRole } from "./organization.types.js";

export interface OrgScopedRequest extends AuthedRequest {
  organizationRole: OrganizationRole;
}

// Shared by requireOrganizationRole (params-based) and the workspace module's
// body/query-based checks (see workspace.middleware.ts) — confirms the org
// exists, the caller is a member of it, and (if roles are given) their role
// is allowed. Throws AppError; callers translate that into next(error).
export const resolveOrganizationAccess = async (
  organizationId: string | undefined,
  userId: string,
  allowedRoles: OrganizationRole[],
): Promise<OrganizationRole> => {
  if (!organizationId) {
    throw new AppError("Organization id is required", 400, "VALIDATION_ERROR");
  }

  const organization = await findOrganizationById(organizationId);

  if (!organization) {
    throw new AppError("Organization not found", 404, "RESOURCE_NOT_FOUND");
  }

  const membership = await findMembership(organizationId, userId);

  if (!membership) {
    throw new AppError("You are not a member of this organization", 403, "FORBIDDEN");
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(membership.role)) {
    throw new AppError("Insufficient role for this action", 403, "FORBIDDEN");
  }

  return membership.role;
};

// Composed after requireAuth on every M2+ route: every organization-scoped
// query downstream trusts req.params.organizationId only because this ran first.
export const requireOrganizationRole =
  (...allowedRoles: OrganizationRole[]) =>
  async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      const organizationId = req.params.organizationId as string;
      const role = await resolveOrganizationAccess(
        organizationId,
        (req as AuthedRequest).userId,
        allowedRoles,
      );

      (req as OrgScopedRequest).organizationRole = role;

      const sessionId = (req as AuthedRequest).sessionId;
      if (sessionId && organizationId) {
        await recordSessionOrgAccess((req as AuthedRequest).userId, sessionId, organizationId);
      }

      next();
    } catch (error) {
      next(error);
    }
  };
