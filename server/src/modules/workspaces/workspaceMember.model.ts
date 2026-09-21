import { Schema, model, Types } from "mongoose";

export interface IWorkspaceMember {
  workspaceId: Types.ObjectId;
  organizationId: Types.ObjectId;
  userId: Types.ObjectId;
  addedBy: Types.ObjectId;
  createdAt: Date;
}

const workspaceMemberSchema = new Schema<IWorkspaceMember>({
  workspaceId: { type: Schema.Types.ObjectId, ref: "Workspace", required: true },
  organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true },
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  addedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  createdAt: { type: Date, default: () => new Date() },
});

workspaceMemberSchema.index({ workspaceId: 1, userId: 1 }, { unique: true });

export const WorkspaceMember = model<IWorkspaceMember>("WorkspaceMember", workspaceMemberSchema);
