import { Task } from "./task.model.js";
import { TaskPriority, TaskStatus } from "./task.types.js";

export interface CreateTaskInput {
  organizationId: string;
  projectId: string;
  parentTaskId: string | null;
  title: string;
  description: string | null;
  priority: TaskPriority;
  assigneeId: string | null;
  reporterId: string;
  dueDate: Date | null;
  startDate: Date | null;
  labelIds: string[];
  createdBy: string;
  updatedBy: string;
}

export interface UpdateTaskFields {
  title?: string | undefined;
  description?: string | null | undefined;
  status?: TaskStatus | undefined;
  priority?: TaskPriority | undefined;
  assigneeId?: string | null | undefined;
  dueDate?: Date | null | undefined;
  startDate?: Date | null | undefined;
  labelIds?: string[] | undefined;
  completedAt?: Date | null | undefined;
  updatedBy: string;
}

export interface ListTasksOptions {
  page: number;
  limit: number;
  status?: TaskStatus | undefined;
  priority?: TaskPriority | undefined;
  assigneeId?: string | undefined;
  labelId?: string | undefined;
  dueDate?: Date | undefined;
  sortBy: string;
  order: "asc" | "desc";
}

// Every lookup here resolves regardless of isDeleted — the restore flow
// (PATCH { isDeleted: false }) needs to find an already-deleted task, and
// the "deleted = invisible" illusion is enforced one layer up (service/
// controller), not here. List/subtask queries filter isDeleted explicitly.
export const createTask = (input: CreateTaskInput) => Task.create(input);

export const findTaskById = (id: string) => Task.findById(id);

export const listTasksByProject = async (projectId: string, options: ListTasksOptions) => {
  const filter: Record<string, unknown> = { projectId, isDeleted: false, parentTaskId: null };
  if (options.status) filter.status = options.status;
  if (options.priority) filter.priority = options.priority;
  if (options.assigneeId) filter.assigneeId = options.assigneeId;
  if (options.labelId) filter.labelIds = options.labelId;
  if (options.dueDate) filter.dueDate = options.dueDate;

  const skip = (options.page - 1) * options.limit;
  const sort: Record<string, 1 | -1> = { [options.sortBy]: options.order === "asc" ? 1 : -1 };

  const [items, total] = await Promise.all([
    Task.find(filter).sort(sort).skip(skip).limit(options.limit),
    Task.countDocuments(filter),
  ]);

  return { items, total };
};

export const listSubtasks = (parentTaskId: string) =>
  Task.find({ parentTaskId, isDeleted: false });

export const updateTaskFields = (id: string, fields: UpdateTaskFields) =>
  Task.findByIdAndUpdate(id, fields, { returnDocument: "after" });

export const restoreTask = (id: string, updatedBy: string) =>
  Task.findByIdAndUpdate(
    id,
    { isDeleted: false, deletedAt: null, deletedBy: null, updatedBy },
    { returnDocument: "after" },
  );

export const softDeleteTask = (id: string, deletedBy: string) =>
  Task.findByIdAndUpdate(
    id,
    { isDeleted: true, deletedAt: new Date(), deletedBy, updatedBy: deletedBy },
    { returnDocument: "after" },
  );
