import { Types } from "mongoose";
import { Task } from "../tasks/task.model.js";
import { TaskActivity } from "../tasks/taskActivity.model.js";
import { Project } from "../projects/project.model.js";
import { WorkspaceMember } from "../workspaces/workspaceMember.model.js";
import { TaskStatus } from "../tasks/task.types.js";

const oid = (id: string) => new Types.ObjectId(id);

const startOfToday = (): Date => {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
};

const endOfToday = (): Date => {
  const date = new Date();
  date.setHours(23, 59, 59, 999);
  return date;
};

// "Pending" = anything not finished and not archived. DONE/ARCHIVED are the
// only terminal states in M5's workflow.
const OPEN_STATUSES: TaskStatus[] = ["TODO", "IN_PROGRESS", "IN_REVIEW"];

export interface DashboardSummary {
  assignedTasks: number;
  completedTasks: number;
  overdueTasks: number;
  dueToday: number;
  pendingTasks: number;
}

export const getSummaryForUser = async (
  organizationId: string,
  userId: string,
): Promise<DashboardSummary> => {
  const base = { organizationId: oid(organizationId), assigneeId: oid(userId), isDeleted: false };

  const [assignedTasks, completedTasks, overdueTasks, dueToday, pendingTasks] = await Promise.all([
    Task.countDocuments(base),
    Task.countDocuments({ ...base, status: "DONE" }),
    Task.countDocuments({
      ...base,
      status: { $in: OPEN_STATUSES },
      dueDate: { $ne: null, $lt: startOfToday() },
    }),
    Task.countDocuments({
      ...base,
      status: { $in: OPEN_STATUSES },
      dueDate: { $gte: startOfToday(), $lte: endOfToday() },
    }),
    Task.countDocuments({ ...base, status: { $in: OPEN_STATUSES } }),
  ]);

  return { assignedTasks, completedTasks, overdueTasks, dueToday, pendingTasks };
};

export interface ProjectProgress {
  projectId: string;
  name: string;
  status: string;
  totalTasks: number;
  completedTasks: number;
  progressPercentage: number;
}

// One grouped aggregation over the workspace's tasks rather than a count pair
// per project — the alternative is 2N queries for N projects.
export const getProjectProgressForWorkspace = async (
  workspaceId: string,
): Promise<ProjectProgress[]> => {
  const projects = await Project.find({ workspaceId, isDeleted: false }).select("name status");

  if (projects.length === 0) return [];

  const counts = await Task.aggregate<{
    _id: Types.ObjectId;
    totalTasks: number;
    completedTasks: number;
  }>([
    {
      $match: {
        projectId: { $in: projects.map((project) => project._id) },
        isDeleted: false,
      },
    },
    {
      $group: {
        _id: "$projectId",
        totalTasks: { $sum: 1 },
        completedTasks: { $sum: { $cond: [{ $eq: ["$status", "DONE"] }, 1, 0] } },
      },
    },
  ]);

  const countsByProject = new Map(counts.map((row) => [row._id.toString(), row]));

  return projects.map((project) => {
    const row = countsByProject.get(project._id.toString());
    const totalTasks = row?.totalTasks ?? 0;
    const completedTasks = row?.completedTasks ?? 0;

    return {
      projectId: project._id.toString(),
      name: project.name,
      status: project.status,
      totalTasks,
      completedTasks,
      progressPercentage: totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100),
    };
  });
};

export const countWorkspaceMembers = (workspaceId: string): Promise<number> =>
  WorkspaceMember.countDocuments({ workspaceId });

export interface TeamActivityEntry {
  action: string;
  actorId: string;
  taskId: string;
  createdAt: Date;
}

// Reads the append-only TaskActivity trail M5 writes and M6 exposed per task;
// here it is scoped to a whole workspace instead of one task.
export const getTeamActivityForWorkspace = async (
  workspaceId: string,
  limit: number,
): Promise<TeamActivityEntry[]> => {
  const projectIds = await Project.find({ workspaceId, isDeleted: false }).distinct("_id");

  if (projectIds.length === 0) return [];

  const taskIds = await Task.find({ projectId: { $in: projectIds } }).distinct("_id");

  if (taskIds.length === 0) return [];

  const activities = await TaskActivity.find({ taskId: { $in: taskIds } })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate("actorId", "name email");

  return activities as unknown as TeamActivityEntry[];
};

export interface ProjectDashboard {
  totalTasks: number;
  completedTasks: number;
  progressPercentage: number;
  byStatus: Record<string, number>;
  byPriority: Record<string, number>;
  overdueTasks: number;
}

export const getProjectDashboard = async (projectId: string): Promise<ProjectDashboard> => {
  const [byStatusRows, byPriorityRows, overdueTasks] = await Promise.all([
    Task.aggregate<{ _id: string; count: number }>([
      { $match: { projectId: oid(projectId), isDeleted: false } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]),
    Task.aggregate<{ _id: string; count: number }>([
      { $match: { projectId: oid(projectId), isDeleted: false } },
      { $group: { _id: "$priority", count: { $sum: 1 } } },
    ]),
    Task.countDocuments({
      projectId,
      isDeleted: false,
      status: { $in: OPEN_STATUSES },
      dueDate: { $ne: null, $lt: startOfToday() },
    }),
  ]);

  const byStatus = Object.fromEntries(byStatusRows.map((row) => [row._id, row.count]));
  const byPriority = Object.fromEntries(byPriorityRows.map((row) => [row._id, row.count]));

  const totalTasks = byStatusRows.reduce((sum, row) => sum + row.count, 0);
  const completedTasks = byStatus.DONE ?? 0;

  return {
    totalTasks,
    completedTasks,
    progressPercentage: totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100),
    byStatus,
    byPriority,
    overdueTasks,
  };
};

export interface Productivity {
  completedTasks: number;
  completedThisWeek: number;
  averageCompletionHours: number | null;
  weeklyStatistics: { weekStart: string; completed: number }[];
}

export const getProductivityForUser = async (
  organizationId: string,
  userId: string,
  weeks: number,
): Promise<Productivity> => {
  const since = new Date();
  since.setDate(since.getDate() - weeks * 7);
  since.setHours(0, 0, 0, 0);

  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - 7);

  const match = {
    organizationId: oid(organizationId),
    assigneeId: oid(userId),
    isDeleted: false,
    status: "DONE" as const,
    completedAt: { $ne: null },
  };

  const [completedTasks, completedThisWeek, timings, weekly] = await Promise.all([
    Task.countDocuments(match),
    Task.countDocuments({ ...match, completedAt: { $gte: weekStart } }),
    // Average wall-clock hours from task creation to completion.
    Task.aggregate<{ averageMs: number }>([
      { $match: match },
      {
        $group: {
          _id: null,
          averageMs: { $avg: { $subtract: ["$completedAt", "$createdAt"] } },
        },
      },
    ]),
    Task.aggregate<{ _id: string; completed: number }>([
      { $match: { ...match, completedAt: { $gte: since } } },
      {
        $group: {
          // %G-%V is the ISO week-numbering year and week, so weeks don't
          // split oddly across a year boundary.
          _id: { $dateToString: { format: "%G-W%V", date: "$completedAt" } },
          completed: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),
  ]);

  const averageMs = timings[0]?.averageMs;

  return {
    completedTasks,
    completedThisWeek,
    averageCompletionHours:
      averageMs === undefined || averageMs === null
        ? null
        : Math.round((averageMs / (1000 * 60 * 60)) * 10) / 10,
    weeklyStatistics: weekly.map((row) => ({ weekStart: row._id, completed: row.completed })),
  };
};
