import { Request, Response, NextFunction } from "express";
import { HydratedDocument } from "mongoose";
import { AppError } from "../../utils/AppError.js";
import { AuthedRequest } from "../auth/auth.middleware.js";
import { recordSessionOrgAccess } from "../auth/session.repository.js";
import { resolveOrganizationAccess } from "../organizations/organization.middleware.js";
import { OrganizationRole } from "../organizations/organization.types.js";
import { findWorkspaceById } from "./workspace.repository.js";
import { IWorkspace } from "./workspace.types.js";

export interface WorkspaceScopedRequest extends AuthedRequest {
  organizationRole: OrganizationRole;
  workspace: HydratedDocument<IWorkspace>;
}

const recordAccessIfSessioned = async (
  req: Request,
  organizationId: string,
): Promise<void> => {
  const sessionId = (req as AuthedRequest).sessionId;
  if (sessionId) {
    await recordSessionOrgAccess((req as AuthedRequest).userId, sessionId, organizationId);
  }
};

// Composed after requireAuth on every :workspaceId route: resolves the
// workspace, derives its organizationId, and delegates the membership+role
// check to the same helper requireOrganizationRole uses — a workspace has no
// permissions of its own, it borrows its parent organization's.
export const requireWorkspaceRole =
  (...allowedRoles: OrganizationRole[]) =>
  async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      const workspaceId = req.params.workspaceId as string;

      if (!workspaceId) {
        throw new AppError("Workspace id is required", 400, "VALIDATION_ERROR");
      }

      const workspace = await findWorkspaceById(workspaceId);

      if (!workspace) {
        throw new AppError("Workspace not found", 404, "RESOURCE_NOT_FOUND");
      }

      const organizationId = workspace.organizationId.toString();

      // Defensive: routes nested under /organizations/:organizationId/... (e.g.
      // Project's) carry organizationId in the URL too. M3's own routes never
      // set this param, so this never triggers for them.
      const urlOrganizationId = req.params.organizationId;
      if (urlOrganizationId && urlOrganizationId !== organizationId) {
        throw new AppError("Workspace not found", 404, "RESOURCE_NOT_FOUND");
      }

      const role = await resolveOrganizationAccess(
        organizationId,
        (req as AuthedRequest).userId,
        allowedRoles,
      );

      (req as WorkspaceScopedRequest).organizationRole = role;
      (req as WorkspaceScopedRequest).workspace = workspace;

      await recordAccessIfSessioned(req, organizationId);

      next();
    } catch (error) {
      next(error);
    }
  };

// For POST /workspaces: the workspace doesn't exist yet, so organizationId
// comes from the request body instead of a route param.
export const requireOrganizationAccessForWorkspaceCreate =
  (...allowedRoles: OrganizationRole[]) =>
  async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      const organizationId = (req.body as { organizationId?: string }).organizationId;
      const role = await resolveOrganizationAccess(
        organizationId,
        (req as AuthedRequest).userId,
        allowedRoles,
      );

      (req as WorkspaceScopedRequest).organizationRole = role;

      if (organizationId) {
        await recordAccessIfSessioned(req, organizationId);
      }

      next();
    } catch (error) {
      next(error);
    }
  };

// For GET /workspaces: any org member may list, organizationId comes from
// the query string (there's no :workspaceId to derive it from).
export const requireOrganizationAccessForWorkspaceList =
  () =>
  async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      const organizationId = req.query.organizationId as string | undefined;
      await resolveOrganizationAccess(organizationId, (req as AuthedRequest).userId, []);

      if (organizationId) {
        await recordAccessIfSessioned(req, organizationId);
      }

      next();
    } catch (error) {
      next(error);
    }
  };
