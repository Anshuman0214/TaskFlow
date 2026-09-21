import { Schema, model } from "mongoose";
import { ITask, TASK_PRIORITIES, TASK_STATUSES } from "./task.types.js";

const taskSchema = new Schema<ITask>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true },
    projectId: { type: Schema.Types.ObjectId, ref: "Project", required: true },
    parentTaskId: { type: Schema.Types.ObjectId, ref: "Task", default: null },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: null },
    status: { type: String, enum: TASK_STATUSES, default: "TODO" },
    priority: { type: String, enum: TASK_PRIORITIES, default: "MEDIUM" },
    assigneeId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    reporterId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    dueDate: { type: Date, default: null },
    startDate: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    labelIds: { type: [Schema.Types.ObjectId], ref: "Label", default: [] },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
    deletedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true },
);

taskSchema.index({ organizationId: 1, projectId: 1, status: 1 });
taskSchema.index({ assigneeId: 1 });
taskSchema.index({ reporterId: 1 });
taskSchema.index({ dueDate: 1 });
taskSchema.index({ priority: 1 });
taskSchema.index({ parentTaskId: 1 });

export const Task = model<ITask>("Task", taskSchema);
