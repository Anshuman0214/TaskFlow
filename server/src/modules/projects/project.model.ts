import { Schema, model } from "mongoose";
import { IProject, PROJECT_STATUSES } from "./project.types.js";

const projectSchema = new Schema<IProject>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true },
    workspaceId: { type: Schema.Types.ObjectId, ref: "Workspace", required: true },
    name: { type: String, required: true, trim: true },
    key: { type: String, required: true, trim: true, uppercase: true },
    description: { type: String, default: null },
    status: { type: String, enum: PROJECT_STATUSES, default: "PLANNING" },
    startDate: { type: Date, default: null },
    endDate: { type: Date, default: null },
    archivedAt: { type: Date, default: null },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
    deletedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true },
);

projectSchema.index({ organizationId: 1, workspaceId: 1, key: 1 }, { unique: true });
projectSchema.index({ workspaceId: 1, status: 1 });

export const Project = model<IProject>("Project", projectSchema);
