import { Schema, model } from "mongoose";
import { IComment } from "./comment.types.js";

const commentSchema = new Schema<IComment>(
  {
    taskId: { type: Schema.Types.ObjectId, ref: "Task", required: true },
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true },
    content: { type: String, required: true, trim: true },
    mentionedUserIds: { type: [Schema.Types.ObjectId], ref: "User", default: [] },
    editedAt: { type: Date, default: null },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
    deletedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true },
);

commentSchema.index({ taskId: 1, isDeleted: 1, createdAt: -1 });

export const Comment = model<IComment>("Comment", commentSchema);
