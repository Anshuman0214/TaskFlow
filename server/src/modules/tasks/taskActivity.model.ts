import { Schema, model, Types } from "mongoose";

export interface ITaskActivity {
  taskId: Types.ObjectId;
  organizationId: Types.ObjectId;
  actorId: Types.ObjectId;
  action: string;
  previousValue?: unknown;
  newValue?: unknown;
  metadata?: unknown;
  createdAt: Date;
}

// Append-only, same rule as AuditLog: no update/delete exposed anywhere.
// Scoped to a single task (vs. AuditLog's org-wide scope) — both are written
// together on every significant task change, per Docs/DatabaseDesign.md.
const taskActivitySchema = new Schema<ITaskActivity>({
  taskId: { type: Schema.Types.ObjectId, ref: "Task", required: true, index: true },
  organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true },
  actorId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  action: { type: String, required: true },
  previousValue: { type: Schema.Types.Mixed },
  newValue: { type: Schema.Types.Mixed },
  metadata: { type: Schema.Types.Mixed },
  createdAt: { type: Date, default: () => new Date() },
});

export const TaskActivity = model<ITaskActivity>("TaskActivity", taskActivitySchema);
