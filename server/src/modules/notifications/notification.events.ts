import { HydratedDocument, Types } from "mongoose";
import { IProject } from "../projects/project.types.js";
import { ITask } from "../tasks/task.types.js";
import { listWorkspaceMemberUserIds } from "../workspaces/workspaceMember.repository.js";
import type { NotificationJob } from "./notification.dispatcher.js";
import { enqueueNotification, enqueueNotifications } from "./notification.queue.js";

// One place for every notification-producing event so the six call sites in
// the task/comment/organization/project services stay one line each and the
// user-facing copy lives together.

const asId = (value: Types.ObjectId | string | null | undefined): string | null =>
  value ? value.toString() : null;

// Nobody should be notified about their own action, and a recipient who shows
// up twice (assignee who is also the reporter) gets one notification.
const recipients = (actorId: string, candidates: (string | null)[]): string[] => [
  ...new Set(candidates.filter((id): id is string => id !== null && id !== actorId)),
];

export const notifyTaskAssigned = async (
  actorId: string,
  task: HydratedDocument<ITask>,
): Promise<void> => {
  const assigneeId = asId(task.assigneeId);

  if (!assigneeId || assigneeId === actorId) return;

  await enqueueNotification({
    userId: assigneeId,
    organizationId: task.organizationId.toString(),
    title: "You were assigned a task",
    message: `"${task.title}" was assigned to you.`,
    type: "TASK_ASSIGNED",
    metadata: { taskId: task._id.toString(), projectId: task.projectId.toString() },
    email: true,
  });
};

export const notifyTaskCompleted = async (
  actorId: string,
  task: HydratedDocument<ITask>,
): Promise<void> => {
  const targets = recipients(actorId, [asId(task.reporterId), asId(task.assigneeId)]);

  await enqueueNotifications(
    targets.map<NotificationJob>((userId) => ({
      userId,
      organizationId: task.organizationId.toString(),
      title: "Task completed",
      message: `"${task.title}" was marked done.`,
      type: "TASK_COMPLETED",
      metadata: { taskId: task._id.toString(), projectId: task.projectId.toString() },
    })),
  );
};

export const notifyTaskUpdated = async (
  actorId: string,
  task: HydratedDocument<ITask>,
): Promise<void> => {
  const targets = recipients(actorId, [asId(task.assigneeId)]);

  await enqueueNotifications(
    targets.map<NotificationJob>((userId) => ({
      userId,
      organizationId: task.organizationId.toString(),
      title: "Task updated",
      message: `"${task.title}" was updated.`,
      type: "TASK_UPDATED",
      metadata: { taskId: task._id.toString(), projectId: task.projectId.toString() },
    })),
  );
};

export const notifyCommentAdded = async (
  actorId: string,
  task: HydratedDocument<ITask>,
  commentId: string,
  mentionedUserIds: string[],
): Promise<void> => {
  const targets = recipients(actorId, [
    asId(task.assigneeId),
    asId(task.reporterId),
    ...mentionedUserIds,
  ]);

  await enqueueNotifications(
    targets.map<NotificationJob>((userId) => ({
      userId,
      organizationId: task.organizationId.toString(),
      title: "New comment",
      message: `A comment was added to "${task.title}".`,
      type: "COMMENT_ADDED",
      metadata: { taskId: task._id.toString(), projectId: task.projectId.toString(), commentId },
      // Mentions are the case worth an email; a comment on a task you merely
      // own can wait for the in-app bell.
      email: mentionedUserIds.includes(userId),
    })),
  );
};

// Invitations go to an email address, which may not belong to a User yet — an
// in-app notification is only possible for an existing account. The invitation
// email itself (utils/mailer.ts) is what reaches everyone else.
export const notifyInvitationSent = async (
  organizationId: string,
  organizationName: string,
  invitedUserId: string | null,
): Promise<void> => {
  if (!invitedUserId) return;

  await enqueueNotification({
    userId: invitedUserId,
    organizationId,
    title: `Invitation to ${organizationName}`,
    message: `You have been invited to join ${organizationName}.`,
    type: "INVITATION_SENT",
    metadata: { organizationId },
  });
};

export const notifyInvitationAccepted = async (
  inviterId: string,
  accepterId: string,
  organizationId: string,
  organizationName: string,
): Promise<void> => {
  if (inviterId === accepterId) return;

  await enqueueNotification({
    userId: inviterId,
    organizationId,
    title: "Invitation accepted",
    message: `Your invitation to ${organizationName} was accepted.`,
    type: "INVITATION_ACCEPTED",
    metadata: { organizationId, userId: accepterId },
  });
};

export const notifyProjectArchived = async (
  actorId: string,
  project: HydratedDocument<IProject>,
): Promise<void> => {
  const memberIds = await listWorkspaceMemberUserIds(project.workspaceId.toString());
  const targets = recipients(actorId, memberIds.map(asId));

  await enqueueNotifications(
    targets.map<NotificationJob>((userId) => ({
      userId,
      organizationId: project.organizationId.toString(),
      title: "Project archived",
      message: `"${project.name}" was archived.`,
      type: "PROJECT_ARCHIVED",
      metadata: { projectId: project._id.toString(), workspaceId: project.workspaceId.toString() },
    })),
  );
};
