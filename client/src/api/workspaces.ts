import { apiClient } from "./client";
import type { ApiResponse } from "./types";

export type WorkspaceStatus = "ACTIVE" | "ARCHIVED";

export interface Workspace {
  _id: string;
  organizationId: string;
  name: string;
  description: string | null;
  status: WorkspaceStatus;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceMember {
  _id: string;
  workspaceId: string;
  organizationId: string;
  userId: { _id: string; name: string; email: string };
  addedBy: string;
  createdAt: string;
}

export interface CreateWorkspaceInput {
  organizationId: string;
  name: string;
  description?: string;
}

export interface UpdateWorkspaceInput {
  name?: string;
  description?: string | null;
}

export const listWorkspaces = async (organizationId: string): Promise<Workspace[]> => {
  const res = await apiClient.get<ApiResponse<Workspace[]>>("/workspaces", {
    params: { organizationId },
  });
  return res.data.data;
};

export const createWorkspace = async (input: CreateWorkspaceInput): Promise<Workspace> => {
  const res = await apiClient.post<ApiResponse<Workspace>>("/workspaces", input);
  return res.data.data;
};

export const getWorkspace = async (workspaceId: string): Promise<Workspace> => {
  const res = await apiClient.get<ApiResponse<Workspace>>(`/workspaces/${workspaceId}`);
  return res.data.data;
};

export const updateWorkspace = async (
  workspaceId: string,
  input: UpdateWorkspaceInput,
): Promise<Workspace> => {
  const res = await apiClient.patch<ApiResponse<Workspace>>(`/workspaces/${workspaceId}`, input);
  return res.data.data;
};

export const archiveWorkspace = async (workspaceId: string): Promise<Workspace> => {
  const res = await apiClient.patch<ApiResponse<Workspace>>(`/workspaces/${workspaceId}/archive`);
  return res.data.data;
};

export const deleteWorkspace = async (workspaceId: string): Promise<void> => {
  await apiClient.delete(`/workspaces/${workspaceId}`);
};

export const listWorkspaceMembers = async (workspaceId: string): Promise<WorkspaceMember[]> => {
  const res = await apiClient.get<ApiResponse<WorkspaceMember[]>>(`/workspaces/${workspaceId}/members`);
  return res.data.data;
};

export const addWorkspaceMember = async (workspaceId: string, userId: string): Promise<void> => {
  await apiClient.post(`/workspaces/${workspaceId}/members`, { userId });
};

export const removeWorkspaceMember = async (workspaceId: string, memberId: string): Promise<void> => {
  await apiClient.delete(`/workspaces/${workspaceId}/members/${memberId}`);
};
