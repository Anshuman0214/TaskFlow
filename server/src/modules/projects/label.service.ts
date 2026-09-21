import { HydratedDocument } from "mongoose";
import { AppError } from "../../utils/AppError.js";
import { createAuditLog } from "../audit/auditLog.repository.js";
import {
  createLabel as createLabelRecord,
  deleteLabel as deleteLabelRecord,
  findLabelById,
  findLabelByName,
  listLabelsForProject,
  updateLabelFields,
} from "./label.repository.js";
import { CreateLabelInput, UpdateLabelInput } from "./label.validation.js";
import { IProject } from "./project.types.js";

type ProjectDoc = HydratedDocument<IProject>;

export const createLabel = async (
  actorId: string,
  project: ProjectDoc,
  input: CreateLabelInput,
) => {
  const projectId = project._id.toString();
  const organizationId = project.organizationId.toString();

  const existing = await findLabelByName(projectId, input.name);

  if (existing) {
    throw new AppError("A label with this name already exists in the project", 409, "DUPLICATE_RESOURCE");
  }

  const label = await createLabelRecord({
    projectId,
    organizationId,
    name: input.name,
    color: input.color,
    description: input.description ?? null,
  });

  await createAuditLog({
    organizationId,
    actorId,
    entityType: "Label",
    entityId: label._id.toString(),
    action: "LABEL_CREATED",
    newValue: { name: label.name, color: label.color },
  });

  return label;
};

export const listLabels = (projectId: string) => listLabelsForProject(projectId);

export const updateLabel = async (
  actorId: string,
  project: ProjectDoc,
  labelId: string,
  input: UpdateLabelInput,
) => {
  const projectId = project._id.toString();
  const label = await findLabelById(projectId, labelId);

  if (!label) {
    throw new AppError("Label not found", 404, "RESOURCE_NOT_FOUND");
  }

  if (input.name && input.name !== label.name) {
    const duplicate = await findLabelByName(projectId, input.name);
    if (duplicate) {
      throw new AppError("A label with this name already exists in the project", 409, "DUPLICATE_RESOURCE");
    }
  }

  const updated = await updateLabelFields(labelId, input);

  await createAuditLog({
    organizationId: project.organizationId.toString(),
    actorId,
    entityType: "Label",
    entityId: labelId,
    action: "LABEL_UPDATED",
    newValue: input,
  });

  return updated;
};

export const deleteLabelFromProject = async (
  actorId: string,
  project: ProjectDoc,
  labelId: string,
): Promise<void> => {
  const projectId = project._id.toString();
  const label = await findLabelById(projectId, labelId);

  if (!label) {
    throw new AppError("Label not found", 404, "RESOURCE_NOT_FOUND");
  }

  await deleteLabelRecord(labelId);

  await createAuditLog({
    organizationId: project.organizationId.toString(),
    actorId,
    entityType: "Label",
    entityId: labelId,
    action: "LABEL_DELETED",
  });
};
