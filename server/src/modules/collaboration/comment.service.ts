import { HydratedDocument } from "mongoose";
import { AppError } from "../../utils/AppError.js";
import { createAuditLog } from "../audit/auditLog.repository.js";
import { findMembership } from "../organizations/organizationMember.repository.js";
import { OrganizationRole } from "../organizations/organization.types.js";
import { createTaskActivity, listTaskActivities } from "../tasks/taskActivity.repository.js";
import { notifyCommentAdded } from "../notifications/notification.events.js";
import { ITask } from "../tasks/task.types.js";
import {
  createComment as createCommentRecord,
  findCommentById,
  listCommentsByTask,
  softDeleteComment,
  updateCommentContent,
} from "./comment.repository.js";
import { CreateCommentInput, PaginationQuery, UpdateCommentInput } from "./collaboration.validation.js";

type TaskDoc = HydratedDocument<ITask>;

// Mentions drive notifications (M7), so an arbitrary user id must not be
// mentionable — it would let any member push a notification at any account.
const assertMentionsAreOrgMembers = async (
  organizationId: string,
  mentionedUserIds: string[],
): Promise<void> => {
  for (const userId of mentionedUserIds) {
    const membership = await findMembership(organizationId, userId);
    if (!membership) {
      throw new AppError(
        `Mentioned user ${userId} is not a member of this organization`,
        400,
        "VALIDATION_ERROR",
      );
    }
  }
};

const assertTaskIsLive = (task: TaskDoc): void => {
  if (task.isDeleted) {
    throw new AppError("Task not found", 404, "RESOURCE_NOT_FOUND");
  }
};

export const createComment = async (userId: string, task: TaskDoc, input: CreateCommentInput) => {
  assertTaskIsLive(task);

  const taskId = task._id.toString();
  const organizationId = task.organizationId.toString();

  await assertMentionsAreOrgMembers(organizationId, input.mentionedUserIds);

  const comment = await createCommentRecord({
    taskId,
    organizationId,
    content: input.content,
    mentionedUserIds: input.mentionedUserIds,
    createdBy: userId,
    updatedBy: userId,
  });

  await createAuditLog({
    organizationId,
    actorId: userId,
    entityType: "Comment",
    entityId: comment._id.toString(),
    action: "COMMENT_CREATED",
    newValue: { taskId },
  });
  await createTaskActivity({
    taskId,
    organizationId,
    actorId: userId,
    action: "COMMENT_CREATED",
    newValue: { commentId: comment._id.toString() },
  });

  await notifyCommentAdded(userId, task, comment._id.toString(), input.mentionedUserIds);

  return comment;
};

export const listComments = (task: TaskDoc, query: PaginationQuery) => {
  assertTaskIsLive(task);
  return listCommentsByTask(task._id.toString(), query);
};

export const updateComment = async (
  userId: string,
  role: OrganizationRole,
  task: TaskDoc,
  commentId: string,
  input: UpdateCommentInput,
) => {
  assertTaskIsLive(task);

  const taskId = task._id.toString();
  const comment = await findCommentById(taskId, commentId);

  if (!comment) {
    throw new AppError("Comment not found", 404, "RESOURCE_NOT_FOUND");
  }

  // Spec: comment owner, or Admin. OWNER is included as the strict superset
  // of ADMIN every other module already treats it as.
  const isAuthor = comment.createdBy.toString() === userId;
  if (!isAuthor && role !== "ADMIN" && role !== "OWNER") {
    throw new AppError("Only the comment author or an admin can edit it", 403, "FORBIDDEN");
  }

  const updated = await updateCommentContent(commentId, input.content, userId);

  if (!updated) {
    throw new AppError("Comment not found", 404, "RESOURCE_NOT_FOUND");
  }

  const organizationId = task.organizationId.toString();

  await createAuditLog({
    organizationId,
    actorId: userId,
    entityType: "Comment",
    entityId: commentId,
    action: "COMMENT_UPDATED",
    previousValue: { content: comment.content },
    newValue: { content: input.content },
  });
  await createTaskActivity({
    taskId,
    organizationId,
    actorId: userId,
    action: "COMMENT_UPDATED",
    newValue: { commentId },
  });

  return updated;
};

export const deleteComment = async (
  userId: string,
  role: OrganizationRole,
  task: TaskDoc,
  commentId: string,
): Promise<void> => {
  assertTaskIsLive(task);

  const taskId = task._id.toString();
  const comment = await findCommentById(taskId, commentId);

  if (!comment) {
    throw new AppError("Comment not found", 404, "RESOURCE_NOT_FOUND");
  }

  const isAuthor = comment.createdBy.toString() === userId;
  if (!isAuthor && role !== "ADMIN" && role !== "OWNER") {
    throw new AppError("Only the comment author or an admin can delete it", 403, "FORBIDDEN");
  }

  await softDeleteComment(commentId, userId);

  const organizationId = task.organizationId.toString();

  await createAuditLog({
    organizationId,
    actorId: userId,
    entityType: "Comment",
    entityId: commentId,
    action: "COMMENT_DELETED",
  });
  await createTaskActivity({
    taskId,
    organizationId,
    actorId: userId,
    action: "COMMENT_DELETED",
    newValue: { commentId },
  });
};

export const listActivities = (task: TaskDoc, query: PaginationQuery) => {
  assertTaskIsLive(task);
  return listTaskActivities(task._id.toString(), query);
};
