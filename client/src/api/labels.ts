import { apiClient } from "./client";
import type { ApiResponse } from "./types";

export interface Label {
  _id: string;
  projectId: string;
  organizationId: string;
  name: string;
  color: string;
  description: string | null;
  createdAt: string;
}

export interface CreateLabelInput {
  name: string;
  color: string;
  description?: string;
}

export interface UpdateLabelInput {
  name?: string;
  color?: string;
  description?: string | null;
}

export const listLabels = async (projectId: string): Promise<Label[]> => {
  const res = await apiClient.get<ApiResponse<Label[]>>(`/projects/${projectId}/labels`);
  return res.data.data;
};

export const createLabel = async (projectId: string, input: CreateLabelInput): Promise<Label> => {
  const res = await apiClient.post<ApiResponse<Label>>(`/projects/${projectId}/labels`, input);
  return res.data.data;
};

export const updateLabel = async (
  projectId: string,
  labelId: string,
  input: UpdateLabelInput,
): Promise<Label> => {
  const res = await apiClient.patch<ApiResponse<Label>>(`/projects/${projectId}/labels/${labelId}`, input);
  return res.data.data;
};

export const deleteLabel = async (projectId: string, labelId: string): Promise<void> => {
  await apiClient.delete(`/projects/${projectId}/labels/${labelId}`);
};
