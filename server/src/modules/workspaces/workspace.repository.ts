import { Workspace } from "./workspace.model.js";

export interface CreateWorkspaceInput {
  organizationId: string;
  name: string;
  description: string | null;
  createdBy: string;
  updatedBy: string;
}

export interface UpdateWorkspaceFields {
  name?: string | undefined;
  description?: string | null | undefined;
  updatedBy: string;
}

export const createWorkspace = (input: CreateWorkspaceInput) => Workspace.create(input);

export const findWorkspaceById = (id: string) => Workspace.findOne({ _id: id, isDeleted: false });

export const findWorkspacesByOrganization = (organizationId: string) =>
  Workspace.find({ organizationId, isDeleted: false });

export const updateWorkspaceFields = (id: string, fields: UpdateWorkspaceFields) =>
  Workspace.findByIdAndUpdate(id, fields, { returnDocument: "after" });

export const archiveWorkspace = (id: string, updatedBy: string) =>
  Workspace.findByIdAndUpdate(id, { status: "ARCHIVED", updatedBy }, { returnDocument: "after" });

export const softDeleteWorkspace = (id: string, deletedBy: string) =>
  Workspace.findByIdAndUpdate(
    id,
    { isDeleted: true, deletedAt: new Date(), deletedBy, updatedBy: deletedBy },
    { returnDocument: "after" },
  );

export const deleteWorkspaceHard = (id: string) => Workspace.findByIdAndDelete(id);
