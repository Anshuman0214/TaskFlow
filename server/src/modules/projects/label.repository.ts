import { Label } from "./label.model.js";

export interface CreateLabelInput {
  projectId: string;
  organizationId: string;
  name: string;
  color: string;
  description: string | null;
}

export interface UpdateLabelFields {
  name?: string | undefined;
  color?: string | undefined;
  description?: string | null | undefined;
}

export const createLabel = (input: CreateLabelInput) => Label.create(input);

export const findLabelByName = (projectId: string, name: string) =>
  Label.findOne({ projectId, name });

export const findLabelById = (projectId: string, labelId: string) =>
  Label.findOne({ _id: labelId, projectId });

export const listLabelsForProject = (projectId: string) => Label.find({ projectId });

export const updateLabelFields = (id: string, fields: UpdateLabelFields) =>
  Label.findByIdAndUpdate(id, fields, { returnDocument: "after" });

export const deleteLabel = (id: string) => Label.findByIdAndDelete(id);
