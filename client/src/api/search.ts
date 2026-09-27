import { apiClient } from "./client";
import type { ApiResponse, PaginatedResponse, PaginationMeta } from "./types";
import type { Task, TaskPriority, TaskStatus } from "./tasks";
import type { Project, ProjectStatus } from "./projects";
import type { Workspace } from "./workspaces";

export type SearchType = "task" | "project" | "workspace" | "user";

export interface SearchUser {
  _id: string;
  name: string;
  email: string;
  isActive: boolean;
}

interface Bucket<T> {
  items: T[];
  total: number;
}

// Without ?type= the backend returns all four buckets; with it, only that one.
export interface GlobalSearchResults {
  tasks?: Bucket<Task>;
  projects?: Bucket<Project>;
  workspaces?: Bucket<Workspace>;
  users?: Bucket<SearchUser>;
}

export const globalSearch = async (
  organizationId: string,
  q: string,
  type?: SearchType,
): Promise<GlobalSearchResults> => {
  const res = await apiClient.get<ApiResponse<GlobalSearchResults>>("/search", {
    params: { organizationId, q, ...(type ? { type } : {}) },
  });
  return res.data.data;
};

export interface TaskSearchQuery {
  q?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  assigneeId?: string;
  labelId?: string;
  projectId?: string;
  dueBefore?: string;
  dueAfter?: string;
  page?: number;
  limit?: number;
}

export const searchTasks = async (
  organizationId: string,
  query: TaskSearchQuery,
): Promise<{ items: Task[]; meta: PaginationMeta }> => {
  const res = await apiClient.get<PaginatedResponse<Task>>("/search/tasks", {
    params: { organizationId, ...query },
  });
  return { items: res.data.data, meta: res.data.meta };
};

export interface ProjectSearchQuery {
  q?: string;
  status?: ProjectStatus;
  workspaceId?: string;
  page?: number;
  limit?: number;
}

export const searchProjects = async (
  organizationId: string,
  query: ProjectSearchQuery,
): Promise<{ items: Project[]; meta: PaginationMeta }> => {
  const res = await apiClient.get<PaginatedResponse<Project>>("/search/projects", {
    params: { organizationId, ...query },
  });
  return { items: res.data.data, meta: res.data.meta };
};
