import { Types } from "mongoose";
import { Task } from "../tasks/task.model.js";
import { Project } from "../projects/project.model.js";
import { Workspace } from "../workspaces/workspace.model.js";
import { User } from "../users/user.model.js";
import { OrganizationMember } from "../organizations/organizationMember.model.js";
import { TaskPriority, TaskStatus } from "../tasks/task.types.js";
import { ProjectStatus } from "../projects/project.types.js";

export interface Paged {
  page: number;
  limit: number;
}

// Every function here takes organizationId as its first argument and puts it in
// the filter. That is the whole tenant-isolation story for search, per
// Docs/ApiSpecifications.md: "Search results are always restricted to the
// authenticated user's organization."
const scope = (organizationId: string) => ({
  organizationId: new Types.ObjectId(organizationId),
  isDeleted: false,
});

const skipFor = (paged: Paged) => (paged.page - 1) * paged.limit;

// $text needs the per-collection text index declared on each model. Sorting by
// textScore puts the best match first; without a query there is no score, so
// those paths fall back to newest-first.
const textFilter = (q: string | undefined) => (q ? { $text: { $search: q } } : {});

const textProjection = (q: string | undefined) =>
  q ? { score: { $meta: "textScore" as const } } : {};

const textSort = (q: string | undefined) =>
  q ? { score: { $meta: "textScore" as const } } : { createdAt: -1 as const };

export interface TaskSearchFilters extends Paged {
  q?: string | undefined;
  status?: TaskStatus | undefined;
  priority?: TaskPriority | undefined;
  assigneeId?: string | undefined;
  labelId?: string | undefined;
  dueBefore?: Date | undefined;
  dueAfter?: Date | undefined;
  projectId?: string | undefined;
}

export const searchTasks = async (organizationId: string, filters: TaskSearchFilters) => {
  const query: Record<string, unknown> = { ...scope(organizationId), ...textFilter(filters.q) };

  if (filters.status) query.status = filters.status;
  if (filters.priority) query.priority = filters.priority;
  if (filters.assigneeId) query.assigneeId = filters.assigneeId;
  if (filters.labelId) query.labelIds = filters.labelId;
  if (filters.projectId) query.projectId = filters.projectId;
  if (filters.dueBefore || filters.dueAfter) {
    query.dueDate = {
      ...(filters.dueAfter ? { $gte: filters.dueAfter } : {}),
      ...(filters.dueBefore ? { $lte: filters.dueBefore } : {}),
    };
  }

  const [items, total] = await Promise.all([
    Task.find(query, textProjection(filters.q))
      .sort(textSort(filters.q))
      .skip(skipFor(filters))
      .limit(filters.limit),
    Task.countDocuments(query),
  ]);

  return { items, total };
};

export interface ProjectSearchFilters extends Paged {
  q?: string | undefined;
  status?: ProjectStatus | undefined;
  workspaceId?: string | undefined;
}

export const searchProjects = async (organizationId: string, filters: ProjectSearchFilters) => {
  const query: Record<string, unknown> = { ...scope(organizationId), ...textFilter(filters.q) };

  if (filters.status) query.status = filters.status;
  if (filters.workspaceId) query.workspaceId = filters.workspaceId;

  const [items, total] = await Promise.all([
    Project.find(query, textProjection(filters.q))
      .sort(textSort(filters.q))
      .skip(skipFor(filters))
      .limit(filters.limit),
    Project.countDocuments(query),
  ]);

  return { items, total };
};

export const searchWorkspaces = async (
  organizationId: string,
  filters: Paged & { q?: string | undefined },
) => {
  const query: Record<string, unknown> = { ...scope(organizationId), ...textFilter(filters.q) };

  const [items, total] = await Promise.all([
    Workspace.find(query, textProjection(filters.q))
      .sort(textSort(filters.q))
      .skip(skipFor(filters))
      .limit(filters.limit),
    Workspace.countDocuments(query),
  ]);

  return { items, total };
};

// Users are global documents, so the org scope has to come from the membership
// collection instead of a field on the user. No text index here on purpose:
// that would index every tenant's users into one global index, and the
// candidate set is already bounded by one organization's membership.
export const searchUsers = async (
  organizationId: string,
  filters: Paged & { q?: string | undefined },
) => {
  const memberIds = await OrganizationMember.find({ organizationId }).distinct("userId");

  if (memberIds.length === 0) return { items: [], total: 0 };

  const query: Record<string, unknown> = { _id: { $in: memberIds } };

  if (filters.q) {
    const escaped = filters.q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pattern = new RegExp(escaped, "i");
    query.$or = [{ name: pattern }, { email: pattern }];
  }

  const [items, total] = await Promise.all([
    User.find(query)
      .select("name email isActive createdAt")
      .sort({ name: 1 })
      .skip(skipFor(filters))
      .limit(filters.limit),
    User.countDocuments(query),
  ]);

  return { items, total };
};
