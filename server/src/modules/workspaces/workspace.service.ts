import { HydratedDocument } from "mongoose";
import { AppError } from "../../utils/AppError.js";
import { createAuditLog } from "../audit/auditLog.repository.js";
import { findMembership } from "../organizations/organizationMember.repository.js";
import {
  createWorkspace as createWorkspaceRecord,
  deleteWorkspaceHard,
  findWorkspacesByOrganization,
  archiveWorkspace as archiveWorkspaceRecord,
  softDeleteWorkspace,
  updateWorkspaceFields,
} from "./workspace.repository.js";
import {
  createWorkspaceMembership,
  deleteWorkspaceMembership,
  findWorkspaceMembership,
  findWorkspaceMembershipById,
  listMembersForWorkspace,
} from "./workspaceMember.repository.js";
import { IWorkspace } from "./workspace.types.js";
import { AddWorkspaceMemberInput, CreateWorkspaceInput, UpdateWorkspaceInput } from "./workspace.validation.js";

type WorkspaceDoc = HydratedDocument<IWorkspace>;

const assertNotArchived = (workspace: WorkspaceDoc): void => {
  if (workspace.status === "ARCHIVED") {
    throw new AppError("Workspace is archived and read-only", 403, "FORBIDDEN");
  }
};

export const createWorkspace = async (
  userId: string,
  input: CreateWorkspaceInput,
): Promise<WorkspaceDoc> => {
  const workspace = await createWorkspaceRecord({
    organizationId: input.organizationId,
    name: input.name,
    description: input.description ?? null,
    createdBy: userId,
    updatedBy: userId,
  });

  try {
    await createWorkspaceMembership(workspace._id.toString(), input.organizationId, userId, userId);
  } catch (error) {
    // ponytail: no multi-document transaction here — this Atlas tier
    // doesn't support retryable-write transactions. Compensate manually,
    // same pattern as organization.service.ts's createOrganization.
    await deleteWorkspaceHard(workspace._id.toString());
    throw error;
  }

  await createAuditLog({
    organizationId: input.organizationId,
    actorId: userId,
    entityType: "Workspace",
    entityId: workspace._id.toString(),
    action: "WORKSPACE_CREATED",
    newValue: { name: workspace.name },
  });

  return workspace;
};

export const listWorkspaces = (organizationId: string) => findWorkspacesByOrganization(organizationId);

export const updateWorkspace = async (
  userId: string,
  workspace: WorkspaceDoc,
  input: UpdateWorkspaceInput,
): Promise<WorkspaceDoc> => {
  assertNotArchived(workspace);

  const updated = await updateWorkspaceFields(workspace._id.toString(), {
    ...input,
    updatedBy: userId,
  });

  if (!updated) {
    throw new AppError("Workspace not found", 404, "RESOURCE_NOT_FOUND");
  }

  await createAuditLog({
    organizationId: workspace.organizationId.toString(),
    actorId: userId,
    entityType: "Workspace",
    entityId: workspace._id.toString(),
    action: "WORKSPACE_UPDATED",
    newValue: input,
  });

  return updated;
};

export const archiveWorkspace = async (userId: string, workspace: WorkspaceDoc): Promise<WorkspaceDoc> => {
  const updated = await archiveWorkspaceRecord(workspace._id.toString(), userId);

  if (!updated) {
    throw new AppError("Workspace not found", 404, "RESOURCE_NOT_FOUND");
  }

  await createAuditLog({
    organizationId: workspace.organizationId.toString(),
    actorId: userId,
    entityType: "Workspace",
    entityId: workspace._id.toString(),
    action: "WORKSPACE_ARCHIVED",
  });

  return updated;
};

export const deleteWorkspace = async (userId: string, workspace: WorkspaceDoc): Promise<void> => {
  await softDeleteWorkspace(workspace._id.toString(), userId);

  await createAuditLog({
    organizationId: workspace.organizationId.toString(),
    actorId: userId,
    entityType: "Workspace",
    entityId: workspace._id.toString(),
    action: "WORKSPACE_DELETED",
  });
};

export const listWorkspaceMembers = (workspaceId: string) => listMembersForWorkspace(workspaceId);

export const addWorkspaceMember = async (
  actorId: string,
  workspace: WorkspaceDoc,
  input: AddWorkspaceMemberInput,
): Promise<void> => {
  assertNotArchived(workspace);

  const organizationId = workspace.organizationId.toString();
  const workspaceId = workspace._id.toString();

  const orgMembership = await findMembership(organizationId, input.userId);

  if (!orgMembership) {
    throw new AppError(
      "User is not a member of this organization",
      400,
      "VALIDATION_ERROR",
    );
  }

  const existingMembership = await findWorkspaceMembership(workspaceId, input.userId);

  if (existingMembership) {
    throw new AppError("User is already a member of this workspace", 409, "DUPLICATE_RESOURCE");
  }

  await createWorkspaceMembership(workspaceId, organizationId, input.userId, actorId);

  await createAuditLog({
    organizationId,
    actorId,
    entityType: "WorkspaceMember",
    entityId: workspaceId,
    action: "WORKSPACE_MEMBER_ADDED",
    newValue: { userId: input.userId },
  });
};

export const removeWorkspaceMember = async (
  actorId: string,
  workspace: WorkspaceDoc,
  memberId: string,
): Promise<void> => {
  const workspaceId = workspace._id.toString();
  const member = await findWorkspaceMembershipById(workspaceId, memberId);

  if (!member) {
    throw new AppError("Workspace member not found", 404, "RESOURCE_NOT_FOUND");
  }

  await deleteWorkspaceMembership(memberId);

  await createAuditLog({
    organizationId: workspace.organizationId.toString(),
    actorId,
    entityType: "WorkspaceMember",
    entityId: memberId,
    action: "WORKSPACE_MEMBER_REMOVED",
  });
};
