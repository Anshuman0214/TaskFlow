import { cached } from "../../utils/cache.js";
import {
  countWorkspaceMembers,
  getProductivityForUser,
  getProjectDashboard,
  getProjectProgressForWorkspace,
  getSummaryForUser,
  getTeamActivityForWorkspace,
} from "./dashboard.repository.js";

// 60s is long enough to absorb a dashboard being reloaded or several widgets
// hitting the same endpoint, short enough that a task you just completed shows
// up on the next look. Nothing invalidates these explicitly — the TTL is the
// whole invalidation strategy.
const TTL_SECONDS = 60;
const ACTIVITY_LIMIT = 20;
const PRODUCTIVITY_WEEKS = 8;

export const getSummary = (organizationId: string, userId: string) =>
  cached(`dashboard:summary:${organizationId}:${userId}`, TTL_SECONDS, () =>
    getSummaryForUser(organizationId, userId),
  );

export const getWorkspaceDashboard = (workspaceId: string) =>
  cached(`dashboard:workspace:${workspaceId}`, TTL_SECONDS, async () => {
    const [projectProgress, activeMembers, teamActivity] = await Promise.all([
      getProjectProgressForWorkspace(workspaceId),
      countWorkspaceMembers(workspaceId),
      getTeamActivityForWorkspace(workspaceId, ACTIVITY_LIMIT),
    ]);

    const totals = projectProgress.reduce(
      (acc, project) => ({
        total: acc.total + project.totalTasks,
        completed: acc.completed + project.completedTasks,
      }),
      { total: 0, completed: 0 },
    );

    return {
      projectProgress,
      activeMembers,
      teamActivity,
      completionRate: totals.total === 0 ? 0 : Math.round((totals.completed / totals.total) * 100),
      totalTasks: totals.total,
      completedTasks: totals.completed,
    };
  });

export const getProject = (projectId: string) =>
  cached(`dashboard:project:${projectId}`, TTL_SECONDS, () => getProjectDashboard(projectId));

export const getProductivity = (organizationId: string, userId: string) =>
  cached(`dashboard:productivity:${organizationId}:${userId}`, TTL_SECONDS, () =>
    getProductivityForUser(organizationId, userId, PRODUCTIVITY_WEEKS),
  );
