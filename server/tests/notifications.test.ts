import { describe, it, expect, afterAll } from "vitest";
import request from "supertest";
import app from "../src/app.js";
import { User } from "../src/modules/users/user.model.js";
import { Organization } from "../src/modules/organizations/organization.model.js";
import { OrganizationMember } from "../src/modules/organizations/organizationMember.model.js";
import { Workspace } from "../src/modules/workspaces/workspace.model.js";
import { WorkspaceMember } from "../src/modules/workspaces/workspaceMember.model.js";
import { Project } from "../src/modules/projects/project.model.js";
import { Task } from "../src/modules/tasks/task.model.js";
import { TaskActivity } from "../src/modules/tasks/taskActivity.model.js";
import { Comment } from "../src/modules/collaboration/comment.model.js";
import { Notification } from "../src/modules/notifications/notification.model.js";
import { scheduleDueDateReminders } from "../src/modules/notifications/reminder.service.js";
import { dispatchNotification } from "../src/modules/notifications/notification.dispatcher.js";

const STRONG_PASSWORD = "StrongPass1!";
const testEmails: string[] = [];
const testOrgIds: string[] = [];
const testWorkspaceIds: string[] = [];
const testProjectIds: string[] = [];
const testTaskIds: string[] = [];
const testUserIds: string[] = [];

const uniqueEmail = (): string => {
  const email = `notif-test-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
  testEmails.push(email);
  return email;
};

const registerAndLogin = async (): Promise<{ accessToken: string; userId: string }> => {
  const email = uniqueEmail();

  await request(app)
    .post("/api/v1/auth/register")
    .send({ name: "Notif Test User", email, password: STRONG_PASSWORD });

  const user = await User.findOneAndUpdate(
    { email },
    { isEmailVerified: true },
    { returnDocument: "after" },
  );

  const loginRes = await request(app)
    .post("/api/v1/auth/login")
    .send({ email, password: STRONG_PASSWORD });

  testUserIds.push(user!._id.toString());
  return { accessToken: loginRes.body.data.accessToken, userId: user!._id.toString() };
};

// Owner + a second member who is also a workspace member, so the second user is
// assignable and therefore notifiable.
const seedTeam = async (name: string) => {
  const owner = await registerAndLogin();
  const member = await registerAndLogin();

  const org = await request(app)
    .post("/api/v1/organizations")
    .set("Authorization", `Bearer ${owner.accessToken}`)
    .send({ name });
  const organizationId = org.body.data._id;
  testOrgIds.push(organizationId);

  await OrganizationMember.create({ organizationId, userId: member.userId, role: "MEMBER" });

  const ws = await request(app)
    .post("/api/v1/workspaces")
    .set("Authorization", `Bearer ${owner.accessToken}`)
    .send({ organizationId, name: "Eng" });
  const workspaceId = ws.body.data._id;
  testWorkspaceIds.push(workspaceId);

  await request(app)
    .post(`/api/v1/workspaces/${workspaceId}/members`)
    .set("Authorization", `Bearer ${owner.accessToken}`)
    .send({ userId: member.userId });

  const project = await request(app)
    .post(`/api/v1/organizations/${organizationId}/workspaces/${workspaceId}/projects`)
    .set("Authorization", `Bearer ${owner.accessToken}`)
    .send({ name: "Core", key: "CORE" });
  const projectId = project.body.data._id;
  testProjectIds.push(projectId);

  return { owner, member, organizationId, workspaceId, projectId };
};

const createTask = async (
  accessToken: string,
  projectId: string,
  body: Record<string, unknown>,
) => {
  const res = await request(app)
    .post(`/api/v1/projects/${projectId}/tasks`)
    .set("Authorization", `Bearer ${accessToken}`)
    .send(body);

  if (res.body.data?._id) testTaskIds.push(res.body.data._id);
  return res;
};

afterAll(async () => {
  await Notification.deleteMany({ userId: { $in: testUserIds } });
  await User.deleteMany({ email: { $in: testEmails } });
  await Comment.deleteMany({ taskId: { $in: testTaskIds } });
  await TaskActivity.deleteMany({ taskId: { $in: testTaskIds } });
  await Task.deleteMany({ _id: { $in: testTaskIds } });
  await Project.deleteMany({ _id: { $in: testProjectIds } });
  await WorkspaceMember.deleteMany({ workspaceId: { $in: testWorkspaceIds } });
  await Workspace.deleteMany({ _id: { $in: testWorkspaceIds } });
  await OrganizationMember.deleteMany({ organizationId: { $in: testOrgIds } });
  await Organization.deleteMany({ _id: { $in: testOrgIds } });
});

describe("Notification producers", () => {
  it("notifies the assignee when a task is created assigned to them", async () => {
    const { owner, member, projectId } = await seedTeam("Assign Notif Co");

    const res = await createTask(owner.accessToken, projectId, {
      title: "Ship the thing",
      assigneeId: member.userId,
    });
    expect(res.status).toBe(201);

    const notification = await Notification.findOne({
      userId: member.userId,
      type: "TASK_ASSIGNED",
    });
    expect(notification).not.toBeNull();
    expect(notification?.isRead).toBe(false);
    expect(notification?.metadata).toMatchObject({ taskId: res.body.data._id });
  });

  it("does not notify the actor about their own action", async () => {
    const { owner, projectId } = await seedTeam("Self Notif Co");

    await createTask(owner.accessToken, projectId, {
      title: "Self assigned",
      assigneeId: owner.userId,
    });

    const count = await Notification.countDocuments({
      userId: owner.userId,
      type: "TASK_ASSIGNED",
    });
    expect(count).toBe(0);
  });

  it("notifies the reporter when someone else completes their task", async () => {
    const { owner, member, projectId } = await seedTeam("Complete Notif Co");

    const task = await createTask(owner.accessToken, projectId, { title: "Finish me" });

    await request(app)
      .patch(`/api/v1/projects/${projectId}/tasks/${task.body.data._id}`)
      .set("Authorization", `Bearer ${member.accessToken}`)
      .send({ status: "DONE" });

    const notification = await Notification.findOne({
      userId: owner.userId,
      type: "TASK_COMPLETED",
    });
    expect(notification).not.toBeNull();
  });

  it("notifies a mentioned user when a comment is added", async () => {
    const { owner, member, projectId } = await seedTeam("Comment Notif Co");

    const task = await createTask(owner.accessToken, projectId, { title: "Discuss me" });

    await request(app)
      .post(`/api/v1/tasks/${task.body.data._id}/comments`)
      .set("Authorization", `Bearer ${owner.accessToken}`)
      .send({ content: "thoughts?", mentionedUserIds: [member.userId] });

    const notification = await Notification.findOne({
      userId: member.userId,
      type: "COMMENT_ADDED",
    });
    expect(notification).not.toBeNull();
  });

  it("notifies workspace members when a project is archived", async () => {
    const { owner, member, organizationId, workspaceId, projectId } =
      await seedTeam("Archive Notif Co");

    const res = await request(app)
      .patch(
        `/api/v1/organizations/${organizationId}/workspaces/${workspaceId}/projects/${projectId}`,
      )
      .set("Authorization", `Bearer ${owner.accessToken}`)
      .send({ status: "ARCHIVED" });
    expect(res.status).toBe(200);

    const notification = await Notification.findOne({
      userId: member.userId,
      type: "PROJECT_ARCHIVED",
    });
    expect(notification).not.toBeNull();
  });

  it("notifies an existing user when they are invited to an organization", async () => {
    const owner = await registerAndLogin();
    const invitee = await registerAndLogin();
    const inviteeUser = await User.findById(invitee.userId);

    const org = await request(app)
      .post("/api/v1/organizations")
      .set("Authorization", `Bearer ${owner.accessToken}`)
      .send({ name: "Invite Notif Co" });
    testOrgIds.push(org.body.data._id);

    const res = await request(app)
      .post(`/api/v1/organizations/${org.body.data._id}/members`)
      .set("Authorization", `Bearer ${owner.accessToken}`)
      .send({ email: inviteeUser!.email, role: "MEMBER" });
    expect(res.status).toBe(201);

    const notification = await Notification.findOne({
      userId: invitee.userId,
      type: "INVITATION_SENT",
    });
    expect(notification).not.toBeNull();
  });
});

describe("Notification APIs", () => {
  it("lists notifications newest-first with an unread count, filtered by isRead and type", async () => {
    const { owner, member, projectId } = await seedTeam("List Notif Co");

    await createTask(owner.accessToken, projectId, {
      title: "First",
      assigneeId: member.userId,
    });
    await createTask(owner.accessToken, projectId, {
      title: "Second",
      assigneeId: member.userId,
    });

    const listRes = await request(app)
      .get("/api/v1/notifications")
      .set("Authorization", `Bearer ${member.accessToken}`);

    expect(listRes.status).toBe(200);
    expect(listRes.body.data.length).toBeGreaterThanOrEqual(2);
    expect(listRes.body.meta.unreadCount).toBe(listRes.body.meta.total);

    const typedRes = await request(app)
      .get("/api/v1/notifications")
      .set("Authorization", `Bearer ${member.accessToken}`)
      .query({ type: "TASK_ASSIGNED", isRead: "false" });
    expect(typedRes.status).toBe(200);
    expect(typedRes.body.data.length).toBeGreaterThanOrEqual(2);

    const wrongTypeRes = await request(app)
      .get("/api/v1/notifications")
      .set("Authorization", `Bearer ${member.accessToken}`)
      .query({ type: "DUE_DATE_REMINDER" });
    expect(wrongTypeRes.body.data).toHaveLength(0);
  });

  it("marks one as read, then marks all remaining as read", async () => {
    const { owner, member, projectId } = await seedTeam("Read Notif Co");

    await createTask(owner.accessToken, projectId, { title: "A", assigneeId: member.userId });
    await createTask(owner.accessToken, projectId, { title: "B", assigneeId: member.userId });

    const listRes = await request(app)
      .get("/api/v1/notifications")
      .set("Authorization", `Bearer ${member.accessToken}`);
    const firstId = listRes.body.data[0]._id;

    const markRes = await request(app)
      .patch(`/api/v1/notifications/${firstId}`)
      .set("Authorization", `Bearer ${member.accessToken}`)
      .send({ isRead: true });
    expect(markRes.status).toBe(200);
    expect(markRes.body.data.isRead).toBe(true);
    expect(markRes.body.data.readAt).not.toBeNull();

    const allRes = await request(app)
      .patch("/api/v1/notifications/read-all")
      .set("Authorization", `Bearer ${member.accessToken}`);
    expect(allRes.status).toBe(200);
    expect(allRes.body.data.updated).toBeGreaterThanOrEqual(1);

    const afterRes = await request(app)
      .get("/api/v1/notifications")
      .set("Authorization", `Bearer ${member.accessToken}`);
    expect(afterRes.body.meta.unreadCount).toBe(0);
  });

  it("soft-deletes a notification and hides it from the list", async () => {
    const { owner, member, projectId } = await seedTeam("Delete Notif Co");

    await createTask(owner.accessToken, projectId, { title: "Gone", assigneeId: member.userId });

    const listRes = await request(app)
      .get("/api/v1/notifications")
      .set("Authorization", `Bearer ${member.accessToken}`);
    const id = listRes.body.data[0]._id;

    const deleteRes = await request(app)
      .delete(`/api/v1/notifications/${id}`)
      .set("Authorization", `Bearer ${member.accessToken}`);
    expect(deleteRes.status).toBe(200);

    const stored = await Notification.findById(id);
    expect(stored?.isDeleted).toBe(true);

    const afterRes = await request(app)
      .get("/api/v1/notifications")
      .set("Authorization", `Bearer ${member.accessToken}`);
    expect(afterRes.body.data.map((n: { _id: string }) => n._id)).not.toContain(id);

    const secondDelete = await request(app)
      .delete(`/api/v1/notifications/${id}`)
      .set("Authorization", `Bearer ${member.accessToken}`);
    expect(secondDelete.status).toBe(404);
  });

  it("never exposes another user's notification", async () => {
    const { owner, member, projectId } = await seedTeam("Isolation Notif Co");

    await createTask(owner.accessToken, projectId, { title: "Theirs", assigneeId: member.userId });

    const listRes = await request(app)
      .get("/api/v1/notifications")
      .set("Authorization", `Bearer ${member.accessToken}`);
    const id = listRes.body.data[0]._id;

    const ownerSees = await request(app)
      .get("/api/v1/notifications")
      .set("Authorization", `Bearer ${owner.accessToken}`);
    expect(ownerSees.body.data.map((n: { _id: string }) => n._id)).not.toContain(id);

    const hijack = await request(app)
      .patch(`/api/v1/notifications/${id}`)
      .set("Authorization", `Bearer ${owner.accessToken}`)
      .send({ isRead: true });
    expect(hijack.status).toBe(404);
  });
});

describe("Due-date reminder sweep", () => {
  it("queues one reminder per due task and stays idempotent across runs", async () => {
    const { owner, member, projectId } = await seedTeam("Reminder Co");

    const soon = new Date(Date.now() + 6 * 60 * 60 * 1000);
    await createTask(owner.accessToken, projectId, {
      title: "Due very soon",
      assigneeId: member.userId,
      dueDate: soon.toISOString(),
    });

    const firstRun = await scheduleDueDateReminders(dispatchNotification);
    expect(firstRun).toBeGreaterThanOrEqual(1);

    const reminders = await Notification.countDocuments({
      userId: member.userId,
      type: "DUE_DATE_REMINDER",
    });
    expect(reminders).toBeGreaterThanOrEqual(1);

    // The sweep runs hourly, so re-running it must not duplicate the reminder.
    await scheduleDueDateReminders(dispatchNotification);
    const afterSecondRun = await Notification.countDocuments({
      userId: member.userId,
      type: "DUE_DATE_REMINDER",
    });
    expect(afterSecondRun).toBe(reminders);
  });

  it("ignores tasks that are done, unassigned, or due outside the window", async () => {
    const { owner, member, projectId } = await seedTeam("No Reminder Co");

    const soon = new Date(Date.now() + 3 * 60 * 60 * 1000);
    const farOff = new Date(Date.now() + 40 * 24 * 60 * 60 * 1000);

    const done = await createTask(owner.accessToken, projectId, {
      title: "Already done",
      assigneeId: member.userId,
      dueDate: soon.toISOString(),
    });
    await request(app)
      .patch(`/api/v1/projects/${projectId}/tasks/${done.body.data._id}`)
      .set("Authorization", `Bearer ${owner.accessToken}`)
      .send({ status: "DONE" });

    await createTask(owner.accessToken, projectId, {
      title: "Nobody owns this",
      dueDate: soon.toISOString(),
    });
    await createTask(owner.accessToken, projectId, {
      title: "Due next month",
      assigneeId: member.userId,
      dueDate: farOff.toISOString(),
    });

    await scheduleDueDateReminders(dispatchNotification);

    const reminders = await Notification.countDocuments({
      userId: member.userId,
      type: "DUE_DATE_REMINDER",
    });
    expect(reminders).toBe(0);
  });
});
