import { HydratedDocument } from "mongoose";
import { AppError } from "../../utils/AppError.js";
import { createAuditLog } from "../audit/auditLog.repository.js";
import { findWorkspaceById } from "../workspaces/workspace.repository.js";
import {
  createProject as createProjectRecord,
  findProjectByKey,
  findProjectByName,
  listProjectsByWorkspace,
  softDeleteProject,
  updateProjectFields,
} from "./project.repository.js";
import { CreateProjectInput, ListProjectsQuery, UpdateProjectInput } from "./project.validation.js";
import { IProject } from "./project.types.js";

type ProjectDoc = HydratedDocument<IProject>;

const assertNotArchived = (project: ProjectDoc): void => {
  if (project.status === "ARCHIVED") {
    throw new AppError("Project is archived and read-only", 403, "FORBIDDEN");
  }
};

export const createProject = async (
  userId: string,
  workspaceId: string,
  input: CreateProjectInput,
): Promise<ProjectDoc> => {
  const workspace = await findWorkspaceById(workspaceId);

  if (!workspace) {
    throw new AppError("Workspace not found", 404, "RESOURCE_NOT_FOUND");
  }

  if (workspace.status === "ARCHIVED") {
    throw new AppError("Workspace is archived; cannot create a project in it", 403, "FORBIDDEN");
  }

  const organizationId = workspace.organizationId.toString();

  const [duplicateName, duplicateKey] = await Promise.all([
    findProjectByName(workspaceId, input.name),
    findProjectByKey(workspaceId, input.key),
  ]);

  if (duplicateName) {
    throw new AppError("A project with this name already exists in the workspace", 409, "DUPLICATE_RESOURCE");
  }

  if (duplicateKey) {
    throw new AppError("A project with this key already exists in the workspace", 409, "DUPLICATE_RESOURCE");
  }

  const project = await createProjectRecord({
    organizationId,
    workspaceId,
    name: input.name,
    key: input.key,
    description: input.description ?? null,
    startDate: input.startDate ?? null,
    endDate: input.endDate ?? null,
    createdBy: userId,
    updatedBy: userId,
  });

  await createAuditLog({
    organizationId,
    actorId: userId,
    entityType: "Project",
    entityId: project._id.toString(),
    action: "PROJECT_CREATED",
    newValue: { name: project.name, key: project.key },
  });

  return project;
};

export const listProjects = (workspaceId: string, query: ListProjectsQuery) =>
  listProjectsByWorkspace(workspaceId, query);

export const updateProject = async (
  userId: string,
  project: ProjectDoc,
  input: UpdateProjectInput,
): Promise<ProjectDoc> => {
  assertNotArchived(project);

  if (project.status === "COMPLETED" && input.status === "PLANNING") {
    throw new AppError("A completed project cannot return to Planning", 422, "VALIDATION_ERROR");
  }

  const effectiveStart = input.startDate !== undefined ? input.startDate : project.startDate;
  const effectiveEnd = input.endDate !== undefined ? input.endDate : project.endDate;

  if (effectiveStart && effectiveEnd && effectiveStart > effectiveEnd) {
    throw new AppError("startDate must be before or equal to endDate", 422, "VALIDATION_ERROR");
  }

  const isArchiving = input.status === "ARCHIVED";

  const updated = await updateProjectFields(project._id.toString(), {
    ...input,
    ...(isArchiving ? { archivedAt: new Date() } : {}),
    updatedBy: userId,
  });

  if (!updated) {
    throw new AppError("Project not found", 404, "RESOURCE_NOT_FOUND");
  }

  await createAuditLog({
    organizationId: project.organizationId.toString(),
    actorId: userId,
    entityType: "Project",
    entityId: project._id.toString(),
    action: isArchiving ? "PROJECT_ARCHIVED" : "PROJECT_UPDATED",
    newValue: input,
  });

  return updated;
};

export const deleteProject = async (userId: string, project: ProjectDoc): Promise<void> => {
  await softDeleteProject(project._id.toString(), userId);

  await createAuditLog({
    organizationId: project.organizationId.toString(),
    actorId: userId,
    entityType: "Project",
    entityId: project._id.toString(),
    action: "PROJECT_DELETED",
  });
};
