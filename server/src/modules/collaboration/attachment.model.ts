import { Schema, model } from "mongoose";
import { IAttachment } from "./comment.types.js";

const attachmentSchema = new Schema<IAttachment>(
  {
    taskId: { type: Schema.Types.ObjectId, ref: "Task", required: true },
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true },
    uploadedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    fileName: { type: String, required: true },
    originalFileName: { type: String, required: true },
    mimeType: { type: String, required: true },
    fileSize: { type: Number, required: true },
    // Only metadata lives here — binaries never touch MongoDB, per
    // Docs/DatabaseDesign.md. With no Cloudinary configured this holds the
    // local storage key instead (see storage.ts).
    cloudinaryPublicId: { type: String, required: true },
    fileUrl: { type: String, required: true },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
    deletedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true },
);

attachmentSchema.index({ taskId: 1, isDeleted: 1, createdAt: -1 });

export const Attachment = model<IAttachment>("Attachment", attachmentSchema);
