import { Request, Response, NextFunction } from "express";
import { HydratedDocument } from "mongoose";
import { AppError } from "../../utils/AppError.js";
import { AuthedRequest } from "../auth/auth.middleware.js";
import { recordSessionOrgAccess } from "../auth/session.repository.js";
import { resolveOrganizationAccess } from "../organizations/organization.middleware.js";
import { OrganizationRole } from "../organizations/organization.types.js";
import { findProjectById } from "./project.repository.js";
import { IProject } from "./project.types.js";

export interface ProjectScopedRequest extends AuthedRequest {
  organizationRole: OrganizationRole;
  project: HydratedDocument<IProject>;
}

// Composed after requireAuth on every :projectId route (and on Label routes,
// which carry :projectId directly): resolves the project, derives its
// organizationId (denormalized on the project doc — no extra workspace
// fetch needed), and delegates to the same helper requireOrganizationRole
// and requireWorkspaceRole use. A project borrows its organization's role,
// same as a workspace does.
export const requireProjectRole =
  (...allowedRoles: OrganizationRole[]) =>
  async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      const projectId = req.params.projectId as string;

      if (!projectId) {
        throw new AppError("Project id is required", 400, "VALIDATION_ERROR");
      }

      const project = await findProjectById(projectId);

      if (!project) {
        throw new AppError("Project not found", 404, "RESOURCE_NOT_FOUND");
      }

      // Defensive: Project's own routes nest under
      // /organizations/:organizationId/workspaces/:workspaceId/projects — if
      // either id in the URL doesn't match the project's actual parents,
      // treat it as not found rather than silently ignoring the mismatch.
      const urlWorkspaceId = req.params.workspaceId;
      const urlOrganizationId = req.params.organizationId;

      if (
        (urlWorkspaceId && urlWorkspaceId !== project.workspaceId.toString()) ||
        (urlOrganizationId && urlOrganizationId !== project.organizationId.toString())
      ) {
        throw new AppError("Project not found", 404, "RESOURCE_NOT_FOUND");
      }

      const organizationId = project.organizationId.toString();
      const role = await resolveOrganizationAccess(
        organizationId,
        (req as AuthedRequest).userId,
        allowedRoles,
      );

      (req as ProjectScopedRequest).organizationRole = role;
      (req as ProjectScopedRequest).project = project;

      const sessionId = (req as AuthedRequest).sessionId;
      if (sessionId) {
        await recordSessionOrgAccess((req as AuthedRequest).userId, sessionId, organizationId);
      }

      next();
    } catch (error) {
      next(error);
    }
  };
