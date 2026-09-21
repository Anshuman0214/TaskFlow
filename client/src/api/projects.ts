import { apiClient } from "./client";
import type { ApiResponse, PaginatedResponse, PaginationMeta } from "./types";

export type ProjectStatus = "PLANNING" | "ACTIVE" | "ON_HOLD" | "COMPLETED" | "ARCHIVED";

export interface Project {
  _id: string;
  organizationId: string;
  workspaceId: string;
  name: string;
  key: string;
  description: string | null;
  status: ProjectStatus;
  startDate: string | null;
  endDate: string | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProjectInput {
  name: string;
  key: string;
  description?: string;
  startDate?: string;
  endDate?: string;
}

export interface UpdateProjectInput {
  name?: string;
  description?: string | null;
  status?: ProjectStatus;
  startDate?: string | null;
  endDate?: string | null;
}

export interface ListProjectsQuery {
  page?: number;
  limit?: number;
  status?: ProjectStatus;
  sortBy?: "createdAt" | "updatedAt" | "name" | "startDate" | "endDate";
  order?: "asc" | "desc";
}

const base = (organizationId: string, workspaceId: string) =>
  `/organizations/${organizationId}/workspaces/${workspaceId}/projects`;

export const listProjects = async (
  organizationId: string,
  workspaceId: string,
  query: ListProjectsQuery = {},
): Promise<{ items: Project[]; meta: PaginationMeta }> => {
  const res = await apiClient.get<PaginatedResponse<Project>>(base(organizationId, workspaceId), {
    params: query,
  });
  return { items: res.data.data, meta: res.data.meta };
};

export const createProject = async (
  organizationId: string,
  workspaceId: string,
  input: CreateProjectInput,
): Promise<Project> => {
  const res = await apiClient.post<ApiResponse<Project>>(base(organizationId, workspaceId), input);
  return res.data.data;
};

export const getProject = async (
  organizationId: string,
  workspaceId: string,
  projectId: string,
): Promise<Project> => {
  const res = await apiClient.get<ApiResponse<Project>>(`${base(organizationId, workspaceId)}/${projectId}`);
  return res.data.data;
};

export const updateProject = async (
  organizationId: string,
  workspaceId: string,
  projectId: string,
  input: UpdateProjectInput,
): Promise<Project> => {
  const res = await apiClient.patch<ApiResponse<Project>>(
    `${base(organizationId, workspaceId)}/${projectId}`,
    input,
  );
  return res.data.data;
};

export const deleteProject = async (
  organizationId: string,
  workspaceId: string,
  projectId: string,
): Promise<void> => {
  await apiClient.delete(`${base(organizationId, workspaceId)}/${projectId}`);
};
