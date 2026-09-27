import { Attachment } from "./attachment.model.js";

export interface CreateAttachmentInput {
  taskId: string;
  organizationId: string;
  uploadedBy: string;
  fileName: string;
  originalFileName: string;
  mimeType: string;
  fileSize: number;
  cloudinaryPublicId: string;
  fileUrl: string;
}

export const createAttachment = (input: CreateAttachmentInput) => Attachment.create(input);

export const findAttachmentById = (taskId: string, attachmentId: string) =>
  Attachment.findOne({ _id: attachmentId, taskId, isDeleted: false });

export const listAttachmentsByTask = (taskId: string) =>
  Attachment.find({ taskId, isDeleted: false })
    .sort({ createdAt: -1 })
    .populate("uploadedBy", "name email");

export const softDeleteAttachment = (id: string, deletedBy: string) =>
  Attachment.findByIdAndUpdate(
    id,
    { isDeleted: true, deletedAt: new Date(), deletedBy },
    { returnDocument: "after" },
  );
