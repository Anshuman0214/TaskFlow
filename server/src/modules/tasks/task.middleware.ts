import { Request, Response, NextFunction } from "express";
import { HydratedDocument } from "mongoose";
import { AppError } from "../../utils/AppError.js";
import { AuthedRequest } from "../auth/auth.middleware.js";
import { recordSessionOrgAccess } from "../auth/session.repository.js";
import { resolveOrganizationAccess } from "../organizations/organization.middleware.js";
import { OrganizationRole } from "../organizations/organization.types.js";
import { findTaskById } from "./task.repository.js";
import { ITask } from "./task.types.js";

export interface TaskScopedRequest extends AuthedRequest {
  organizationRole: OrganizationRole;
  task: HydratedDocument<ITask>;
}

// Composed after requireAuth on every :taskId route (and :taskId/subtasks).
// Deliberately does NOT filter isDeleted when resolving — restore
// (PATCH { isDeleted: false }) needs to reach an already-deleted task
// through this same middleware. The "deleted = 404" illusion is enforced
// one layer up instead (controllers/updateTask), not here. See task.service.ts.
export const requireTaskRole =
  (...allowedRoles: OrganizationRole[]) =>
  async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      const taskId = req.params.taskId as string;

      if (!taskId) {
        throw new AppError("Task id is required", 400, "VALIDATION_ERROR");
      }

      const task = await findTaskById(taskId);

      if (!task) {
        throw new AppError("Task not found", 404, "RESOURCE_NOT_FOUND");
      }

      const urlProjectId = req.params.projectId;
      if (urlProjectId && urlProjectId !== task.projectId.toString()) {
        throw new AppError("Task not found", 404, "RESOURCE_NOT_FOUND");
      }

      const organizationId = task.organizationId.toString();
      const role = await resolveOrganizationAccess(
        organizationId,
        (req as AuthedRequest).userId,
        allowedRoles,
      );

      (req as TaskScopedRequest).organizationRole = role;
      (req as TaskScopedRequest).task = task;

      const sessionId = (req as AuthedRequest).sessionId;
      if (sessionId) {
        await recordSessionOrgAccess((req as AuthedRequest).userId, sessionId, organizationId);
      }

      next();
    } catch (error) {
      next(error);
    }
  };
