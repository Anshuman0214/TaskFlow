import { apiClient } from "./client";
import type { ApiResponse, PaginatedResponse, PaginationMeta } from "./types";
import type { Label } from "./labels";

export type TaskStatus = "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE" | "ARCHIVED";
export type TaskPriority = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface Task {
  _id: string;
  organizationId: string;
  projectId: string;
  parentTaskId: string | null;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeId: string | null;
  reporterId: string;
  dueDate: string | null;
  startDate: string | null;
  completedAt: string | null;
  labelIds: string[];
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TaskDetail extends Omit<Task, "labelIds"> {
  labelIds: Label[];
  subtasks: Task[];
}

export interface CreateTaskInput {
  title: string;
  description?: string;
  priority?: TaskPriority;
  assigneeId?: string | null;
  dueDate?: string | null;
  startDate?: string | null;
  parentTaskId?: string | null;
  labelIds?: string[];
}

export interface UpdateTaskInput {
  title?: string;
  description?: string | null;
  priority?: TaskPriority;
  status?: TaskStatus;
  assigneeId?: string | null;
  dueDate?: string | null;
  startDate?: string | null;
  labelIds?: string[];
  isDeleted?: false;
}

export interface ListTasksQuery {
  page?: number;
  limit?: number;
  status?: TaskStatus;
  priority?: TaskPriority;
  assigneeId?: string;
  labelId?: string;
  dueDate?: string;
  sortBy?: "createdAt" | "updatedAt" | "dueDate" | "priority" | "title";
  order?: "asc" | "desc";
}

const base = (projectId: string) => `/projects/${projectId}/tasks`;

export const listTasks = async (
  projectId: string,
  query: ListTasksQuery = {},
): Promise<{ items: Task[]; meta: PaginationMeta }> => {
  const res = await apiClient.get<PaginatedResponse<Task>>(base(projectId), { params: query });
  return { items: res.data.data, meta: res.data.meta };
};

export const createTask = async (projectId: string, input: CreateTaskInput): Promise<Task> => {
  const res = await apiClient.post<ApiResponse<Task>>(base(projectId), input);
  return res.data.data;
};

export const getTask = async (projectId: string, taskId: string): Promise<TaskDetail> => {
  const res = await apiClient.get<ApiResponse<TaskDetail>>(`${base(projectId)}/${taskId}`);
  return res.data.data;
};

export const updateTask = async (
  projectId: string,
  taskId: string,
  input: UpdateTaskInput,
): Promise<Task> => {
  const res = await apiClient.patch<ApiResponse<Task>>(`${base(projectId)}/${taskId}`, input);
  return res.data.data;
};

export const deleteTask = async (projectId: string, taskId: string): Promise<void> => {
  await apiClient.delete(`${base(projectId)}/${taskId}`);
};

export const listSubtasks = async (projectId: string, taskId: string): Promise<Task[]> => {
  const res = await apiClient.get<ApiResponse<Task[]>>(`${base(projectId)}/${taskId}/subtasks`);
  return res.data.data;
};

export const createSubtask = async (
  projectId: string,
  taskId: string,
  input: CreateTaskInput,
): Promise<Task> => {
  const res = await apiClient.post<ApiResponse<Task>>(`${base(projectId)}/${taskId}/subtasks`, input);
  return res.data.data;
};
