import { apiClient } from "./client";
import type { ApiResponse } from "./types";
import type { TaskActivity } from "./collaboration";

export interface DashboardSummary {
  assignedTasks: number;
  completedTasks: number;
  overdueTasks: number;
  dueToday: number;
  pendingTasks: number;
}

export interface ProjectProgress {
  projectId: string;
  name: string;
  status: string;
  totalTasks: number;
  completedTasks: number;
  progressPercentage: number;
}

export interface WorkspaceDashboard {
  projectProgress: ProjectProgress[];
  activeMembers: number;
  teamActivity: TaskActivity[];
  completionRate: number;
  totalTasks: number;
  completedTasks: number;
}

export interface ProjectDashboard {
  totalTasks: number;
  completedTasks: number;
  progressPercentage: number;
  byStatus: Record<string, number>;
  byPriority: Record<string, number>;
  overdueTasks: number;
}

export interface Productivity {
  completedTasks: number;
  completedThisWeek: number;
  averageCompletionHours: number | null;
  weeklyStatistics: { weekStart: string; completed: number }[];
}

// Summary and productivity are personal, so they carry organizationId as a
// query param (there is no org in their path); the other two borrow their
// resource's id and role check.
export const getDashboardSummary = async (organizationId: string): Promise<DashboardSummary> => {
  const res = await apiClient.get<ApiResponse<DashboardSummary>>("/dashboard/summary", {
    params: { organizationId },
  });
  return res.data.data;
};

export const getProductivity = async (organizationId: string): Promise<Productivity> => {
  const res = await apiClient.get<ApiResponse<Productivity>>("/dashboard/productivity", {
    params: { organizationId },
  });
  return res.data.data;
};

export const getWorkspaceDashboard = async (workspaceId: string): Promise<WorkspaceDashboard> => {
  const res = await apiClient.get<ApiResponse<WorkspaceDashboard>>(
    `/dashboard/workspaces/${workspaceId}`,
  );
  return res.data.data;
};

export const getProjectDashboard = async (projectId: string): Promise<ProjectDashboard> => {
  const res = await apiClient.get<ApiResponse<ProjectDashboard>>(`/dashboard/projects/${projectId}`);
  return res.data.data;
};
