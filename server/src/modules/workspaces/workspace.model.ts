import { Schema, model } from "mongoose";
import { IWorkspace, WORKSPACE_STATUSES } from "./workspace.types.js";

const workspaceSchema = new Schema<IWorkspace>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: null },
    status: { type: String, enum: WORKSPACE_STATUSES, default: "ACTIVE" },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
    deletedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true },
);

workspaceSchema.index({ organizationId: 1, name: 1 });

export const Workspace = model<IWorkspace>("Workspace", workspaceSchema);
