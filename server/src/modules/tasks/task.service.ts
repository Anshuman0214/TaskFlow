import { HydratedDocument } from "mongoose";
import { AppError } from "../../utils/AppError.js";
import { createAuditLog } from "../audit/auditLog.repository.js";
import { findProjectById } from "../projects/project.repository.js";
import { findLabelById } from "../projects/label.repository.js";
import { findWorkspaceMembership } from "../workspaces/workspaceMember.repository.js";
import { createTaskActivity } from "./taskActivity.repository.js";
import {
  createTask as createTaskRecord,
  findTaskById,
  listSubtasks as listSubtasksRepo,
  listTasksByProject,
  restoreTask,
  softDeleteTask,
  updateTaskFields,
} from "./task.repository.js";
import { CreateTaskInput, ListTasksQuery, UpdateTaskInput } from "./task.validation.js";
import { ITask } from "./task.types.js";

type TaskDoc = HydratedDocument<ITask>;

const assertNotArchived = (task: TaskDoc): void => {
  if (task.status === "ARCHIVED") {
    throw new AppError("Task is archived and read-only", 403, "FORBIDDEN");
  }
};

const assertLabelsBelongToProject = async (projectId: string, labelIds: string[]): Promise<void> => {
  for (const labelId of labelIds) {
    const label = await findLabelById(projectId, labelId);
    if (!label) {
      throw new AppError(`Label ${labelId} does not belong to this project`, 400, "VALIDATION_ERROR");
    }
  }
};

const assertAssigneeBelongsToWorkspace = async (
  workspaceId: string,
  assigneeId: string,
): Promise<void> => {
  const membership = await findWorkspaceMembership(workspaceId, assigneeId);
  if (!membership) {
    throw new AppError("Assignee must belong to the workspace", 400, "VALIDATION_ERROR");
  }
};

export const createTask = async (
  userId: string,
  projectId: string,
  input: CreateTaskInput,
  parentTaskIdOverride?: string,
): Promise<TaskDoc> => {
  const project = await findProjectById(projectId);

  if (!project) {
    throw new AppError("Project not found", 404, "RESOURCE_NOT_FOUND");
  }

  if (project.status === "ARCHIVED") {
    throw new AppError("Project is archived; cannot create a task in it", 403, "FORBIDDEN");
  }

  const parentTaskId = parentTaskIdOverride ?? input.parentTaskId ?? null;

  if (parentTaskId) {
    const parent = await findTaskById(parentTaskId);
    if (!parent || parent.isDeleted || parent.projectId.toString() !== projectId) {
      throw new AppError("Parent task must belong to the same project", 400, "VALIDATION_ERROR");
    }
  }

  if (input.assigneeId) {
    await assertAssigneeBelongsToWorkspace(project.workspaceId.toString(), input.assigneeId);
  }

  if (input.labelIds.length > 0) {
    await assertLabelsBelongToProject(projectId, input.labelIds);
  }

  const task = await createTaskRecord({
    organizationId: project.organizationId.toString(),
    projectId,
    parentTaskId,
    title: input.title,
    description: input.description ?? null,
    priority: input.priority,
    assigneeId: input.assigneeId ?? null,
    reporterId: userId,
    dueDate: input.dueDate ?? null,
    startDate: input.startDate ?? null,
    labelIds: input.labelIds,
    createdBy: userId,
    updatedBy: userId,
  });

  const organizationId = project.organizationId.toString();
  const taskId = task._id.toString();

  await createAuditLog({
    organizationId,
    actorId: userId,
    entityType: "Task",
    entityId: taskId,
    action: "TASK_CREATED",
    newValue: { title: task.title },
  });
  await createTaskActivity({
    taskId,
    organizationId,
    actorId: userId,
    action: "TASK_CREATED",
    newValue: { title: task.title },
  });

  return task;
};

export const listTasks = (projectId: string, query: ListTasksQuery) =>
  listTasksByProject(projectId, query);

export const listSubtasks = (task: TaskDoc) => listSubtasksRepo(task._id.toString());

export const getTask = async (task: TaskDoc) => {
  if (task.isDeleted) {
    throw new AppError("Task not found", 404, "RESOURCE_NOT_FOUND");
  }

  const subtasks = await listSubtasksRepo(task._id.toString());
  const populated = await task.populate("labelIds", "name color");

  return { ...populated.toObject(), subtasks };
};

export const updateTask = async (
  userId: string,
  task: TaskDoc,
  input: UpdateTaskInput,
): Promise<TaskDoc> => {
  const taskId = task._id.toString();
  const organizationId = task.organizationId.toString();

  if (task.isDeleted) {
    const keys = Object.keys(input);
    if (keys.length === 1 && input.isDeleted === false) {
      const restored = await restoreTask(taskId, userId);
      if (!restored) {
        throw new AppError("Task not found", 404, "RESOURCE_NOT_FOUND");
      }

      await createAuditLog({
        organizationId,
        actorId: userId,
        entityType: "Task",
        entityId: taskId,
        action: "TASK_RESTORED",
      });
      await createTaskActivity({ taskId, organizationId, actorId: userId, action: "TASK_RESTORED" });

      return restored;
    }

    throw new AppError("Task not found", 404, "RESOURCE_NOT_FOUND");
  }

  assertNotArchived(task);

  if (input.assigneeId) {
    const project = await findProjectById(task.projectId.toString());
    if (!project) {
      throw new AppError("Project not found", 404, "RESOURCE_NOT_FOUND");
    }
    await assertAssigneeBelongsToWorkspace(project.workspaceId.toString(), input.assigneeId);
  }

  if (input.labelIds) {
    await assertLabelsBelongToProject(task.projectId.toString(), input.labelIds);
  }

  const statusChanging = input.status !== undefined && input.status !== task.status;
  const assigneeChanging =
    input.assigneeId !== undefined && input.assigneeId !== (task.assigneeId?.toString() ?? null);

  const completedAt =
    input.status === "DONE" && task.status !== "DONE"
      ? new Date()
      : input.status !== undefined && input.status !== "DONE" && task.status === "DONE"
        ? null
        : undefined;

  const { isDeleted: _isDeleted, ...updateInput } = input;

  const updated = await updateTaskFields(taskId, {
    ...updateInput,
    ...(completedAt !== undefined ? { completedAt } : {}),
    updatedBy: userId,
  });

  if (!updated) {
    throw new AppError("Task not found", 404, "RESOURCE_NOT_FOUND");
  }

  const action = statusChanging
    ? input.status === "DONE"
      ? "TASK_COMPLETED"
      : "TASK_STATUS_CHANGED"
    : assigneeChanging
      ? "TASK_ASSIGNED"
      : "TASK_UPDATED";

  await createAuditLog({
    organizationId,
    actorId: userId,
    entityType: "Task",
    entityId: taskId,
    action,
    newValue: updateInput,
  });
  await createTaskActivity({
    taskId,
    organizationId,
    actorId: userId,
    action,
    previousValue: statusChanging
      ? { status: task.status }
      : assigneeChanging
        ? { assigneeId: task.assigneeId }
        : undefined,
    newValue: updateInput,
  });

  return updated;
};

export const deleteTask = async (userId: string, task: TaskDoc): Promise<void> => {
  if (task.isDeleted) {
    throw new AppError("Task not found", 404, "RESOURCE_NOT_FOUND");
  }

  const taskId = task._id.toString();
  const organizationId = task.organizationId.toString();

  await softDeleteTask(taskId, userId);

  await createAuditLog({
    organizationId,
    actorId: userId,
    entityType: "Task",
    entityId: taskId,
    action: "TASK_DELETED",
  });
  await createTaskActivity({ taskId, organizationId, actorId: userId, action: "TASK_DELETED" });
};
