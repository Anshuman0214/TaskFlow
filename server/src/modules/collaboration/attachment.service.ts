import { HydratedDocument } from "mongoose";
import { AppError } from "../../utils/AppError.js";
import { deleteFile, uploadFile } from "../../utils/storage.js";
import { createAuditLog } from "../audit/auditLog.repository.js";
import { createTaskActivity } from "../tasks/taskActivity.repository.js";
import { ITask } from "../tasks/task.types.js";
import {
  createAttachment,
  findAttachmentById,
  listAttachmentsByTask,
  softDeleteAttachment,
} from "./attachment.repository.js";

type TaskDoc = HydratedDocument<ITask>;

export interface UploadedFile {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

const assertTaskIsLive = (task: TaskDoc): void => {
  if (task.isDeleted) {
    throw new AppError("Task not found", 404, "RESOURCE_NOT_FOUND");
  }
};

export const uploadAttachment = async (userId: string, task: TaskDoc, file: UploadedFile) => {
  assertTaskIsLive(task);

  const taskId = task._id.toString();
  const organizationId = task.organizationId.toString();

  const stored = await uploadFile(
    file.buffer,
    file.originalname,
    file.mimetype,
    `taskflow/${organizationId}/${taskId}`,
  );

  // Sequential write with manual compensation — no multi-document
  // transactions on this Atlas tier, and the file is already in storage,
  // so an orphaned blob is the failure mode to clean up.
  let attachment;
  try {
    attachment = await createAttachment({
      taskId,
      organizationId,
      uploadedBy: userId,
      fileName: stored.publicId,
      originalFileName: file.originalname,
      mimeType: file.mimetype,
      fileSize: file.size,
      cloudinaryPublicId: stored.publicId,
      fileUrl: stored.url,
    });
  } catch (error) {
    await deleteFile(stored.publicId).catch(() => undefined);
    throw error;
  }

  await createAuditLog({
    organizationId,
    actorId: userId,
    entityType: "Attachment",
    entityId: attachment._id.toString(),
    action: "ATTACHMENT_UPLOADED",
    newValue: { taskId, originalFileName: file.originalname },
  });
  await createTaskActivity({
    taskId,
    organizationId,
    actorId: userId,
    action: "ATTACHMENT_UPLOADED",
    newValue: { attachmentId: attachment._id.toString(), fileName: file.originalname },
  });

  return attachment;
};

export const listAttachments = (task: TaskDoc) => {
  assertTaskIsLive(task);
  return listAttachmentsByTask(task._id.toString());
};

export const deleteAttachment = async (
  userId: string,
  task: TaskDoc,
  attachmentId: string,
): Promise<void> => {
  assertTaskIsLive(task);

  const taskId = task._id.toString();
  const attachment = await findAttachmentById(taskId, attachmentId);

  if (!attachment) {
    throw new AppError("Attachment not found", 404, "RESOURCE_NOT_FOUND");
  }

  await softDeleteAttachment(attachmentId, userId);
  // Per Docs/DatabaseDesign.md the stored asset goes too — the metadata row
  // is kept (soft-deleted) for audit, but the binary is not recoverable.
  await deleteFile(attachment.cloudinaryPublicId);

  const organizationId = task.organizationId.toString();

  await createAuditLog({
    organizationId,
    actorId: userId,
    entityType: "Attachment",
    entityId: attachmentId,
    action: "ATTACHMENT_DELETED",
  });
  await createTaskActivity({
    taskId,
    organizationId,
    actorId: userId,
    action: "ATTACHMENT_DELETED",
    newValue: { attachmentId },
  });
};
