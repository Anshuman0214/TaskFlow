import { Types } from "mongoose";

export const TASK_STATUSES = ["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE", "ARCHIVED"] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const TASK_PRIORITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;
export type TaskPriority = (typeof TASK_PRIORITIES)[number];

export interface ITask {
  organizationId: Types.ObjectId;
  projectId: Types.ObjectId;
  parentTaskId: Types.ObjectId | null;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeId: Types.ObjectId | null;
  reporterId: Types.ObjectId;
  dueDate: Date | null;
  startDate: Date | null;
  completedAt: Date | null;
  labelIds: Types.ObjectId[];
  isDeleted: boolean;
  deletedAt: Date | null;
  deletedBy: Types.ObjectId | null;
  createdBy: Types.ObjectId;
  updatedBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}
