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
import { Attachment } from "../src/modules/collaboration/attachment.model.js";
import { AuditLog } from "../src/modules/audit/auditLog.model.js";
import { OrganizationRole } from "../src/modules/organizations/organization.types.js";

const STRONG_PASSWORD = "StrongPass1!";
const testEmails: string[] = [];
const testOrgIds: string[] = [];
const testWorkspaceIds: string[] = [];
const testProjectIds: string[] = [];
const testTaskIds: string[] = [];

const uniqueEmail = (): string => {
  const email = `collab-test-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
  testEmails.push(email);
  return email;
};

const registerAndLogin = async (): Promise<{ accessToken: string; userId: string }> => {
  const email = uniqueEmail();

  await request(app)
    .post("/api/v1/auth/register")
    .send({ name: "Collab Test User", email, password: STRONG_PASSWORD });

  const user = await User.findOneAndUpdate(
    { email },
    { isEmailVerified: true },
    { returnDocument: "after" },
  );

  const loginRes = await request(app)
    .post("/api/v1/auth/login")
    .send({ email, password: STRONG_PASSWORD });

  return { accessToken: loginRes.body.data.accessToken, userId: user!._id.toString() };
};

const addOrgMember = (organizationId: string, userId: string, role: OrganizationRole) =>
  OrganizationMember.create({ organizationId, userId, role });

// One org -> workspace -> project -> task chain; every test needs the whole
// stack before it can touch a comment or an attachment.
const seedTask = async (name: string) => {
  const owner = await registerAndLogin();

  const org = await request(app)
    .post("/api/v1/organizations")
    .set("Authorization", `Bearer ${owner.accessToken}`)
    .send({ name });
  const organizationId = org.body.data._id;
  testOrgIds.push(organizationId);

  const ws = await request(app)
    .post("/api/v1/workspaces")
    .set("Authorization", `Bearer ${owner.accessToken}`)
    .send({ organizationId, name: "Eng" });
  const workspaceId = ws.body.data._id;
  testWorkspaceIds.push(workspaceId);

  const project = await request(app)
    .post(`/api/v1/organizations/${organizationId}/workspaces/${workspaceId}/projects`)
    .set("Authorization", `Bearer ${owner.accessToken}`)
    .send({ name: "Core", key: "CORE" });
  const projectId = project.body.data._id;
  testProjectIds.push(projectId);

  const task = await request(app)
    .post(`/api/v1/projects/${projectId}/tasks`)
    .set("Authorization", `Bearer ${owner.accessToken}`)
    .send({ title: "Collaborate here" });
  const taskId = task.body.data._id;
  testTaskIds.push(taskId);

  return { owner, organizationId, workspaceId, projectId, taskId };
};

const commentsPath = (taskId: string) => `/api/v1/tasks/${taskId}/comments`;

afterAll(async () => {
  await User.deleteMany({ email: { $in: testEmails } });
  await Comment.deleteMany({ taskId: { $in: testTaskIds } });
  await Attachment.deleteMany({ taskId: { $in: testTaskIds } });
  await TaskActivity.deleteMany({ taskId: { $in: testTaskIds } });
  await Task.deleteMany({ _id: { $in: testTaskIds } });
  await Project.deleteMany({ _id: { $in: testProjectIds } });
  await WorkspaceMember.deleteMany({ workspaceId: { $in: testWorkspaceIds } });
  await Workspace.deleteMany({ _id: { $in: testWorkspaceIds } });
  await OrganizationMember.deleteMany({ organizationId: { $in: testOrgIds } });
  await Organization.deleteMany({ _id: { $in: testOrgIds } });
});

describe("Comment APIs", () => {
  it("creates a comment, writes an audit log + task activity, and lists it paginated", async () => {
    const { owner, taskId } = await seedTask("Comment Co");

    const createRes = await request(app)
      .post(commentsPath(taskId))
      .set("Authorization", `Bearer ${owner.accessToken}`)
      .send({ content: "Authentication API completed." });

    expect(createRes.status).toBe(201);
    expect(createRes.body.data.content).toBe("Authentication API completed.");
    expect(createRes.body.data.editedAt).toBeNull();

    const auditLog = await AuditLog.findOne({
      entityId: createRes.body.data._id,
      action: "COMMENT_CREATED",
    });
    expect(auditLog).not.toBeNull();

    const activity = await TaskActivity.findOne({ taskId, action: "COMMENT_CREATED" });
    expect(activity).not.toBeNull();

    const listRes = await request(app)
      .get(commentsPath(taskId))
      .set("Authorization", `Bearer ${owner.accessToken}`)
      .query({ page: 1, limit: 10 });

    expect(listRes.status).toBe(200);
    expect(listRes.body.data).toHaveLength(1);
    expect(listRes.body.meta.total).toBe(1);
  });

  it("rejects a mention of a user who is not an organization member", async () => {
    const { owner, taskId } = await seedTask("Mention Co");
    const outsider = await registerAndLogin();

    const res = await request(app)
      .post(commentsPath(taskId))
      .set("Authorization", `Bearer ${owner.accessToken}`)
      .send({ content: "cc you", mentionedUserIds: [outsider.userId] });

    expect(res.status).toBe(400);
  });

  it("lets the author edit (stamping editedAt) but not a different member", async () => {
    const { owner, organizationId, taskId } = await seedTask("Edit Co");
    const other = await registerAndLogin();
    await addOrgMember(organizationId, other.userId, "MEMBER");

    const created = await request(app)
      .post(commentsPath(taskId))
      .set("Authorization", `Bearer ${owner.accessToken}`)
      .send({ content: "first draft" });
    const commentId = created.body.data._id;

    const authorRes = await request(app)
      .patch(`${commentsPath(taskId)}/${commentId}`)
      .set("Authorization", `Bearer ${owner.accessToken}`)
      .send({ content: "second draft" });
    expect(authorRes.status).toBe(200);
    expect(authorRes.body.data.content).toBe("second draft");
    expect(authorRes.body.data.editedAt).not.toBeNull();

    const otherRes = await request(app)
      .patch(`${commentsPath(taskId)}/${commentId}`)
      .set("Authorization", `Bearer ${other.accessToken}`)
      .send({ content: "hijacked" });
    expect(otherRes.status).toBe(403);
  });

  it("lets an ADMIN who is not the author edit and delete", async () => {
    const { owner, organizationId, taskId } = await seedTask("Admin Edit Co");
    const admin = await registerAndLogin();
    await addOrgMember(organizationId, admin.userId, "ADMIN");

    const created = await request(app)
      .post(commentsPath(taskId))
      .set("Authorization", `Bearer ${owner.accessToken}`)
      .send({ content: "owner wrote this" });
    const commentId = created.body.data._id;

    const editRes = await request(app)
      .patch(`${commentsPath(taskId)}/${commentId}`)
      .set("Authorization", `Bearer ${admin.accessToken}`)
      .send({ content: "admin edited this" });
    expect(editRes.status).toBe(200);

    const deleteRes = await request(app)
      .delete(`${commentsPath(taskId)}/${commentId}`)
      .set("Authorization", `Bearer ${admin.accessToken}`);
    expect(deleteRes.status).toBe(200);
  });

  it("soft-deletes a comment so it leaves the list but survives in Mongo", async () => {
    const { owner, taskId } = await seedTask("Soft Delete Co");

    const created = await request(app)
      .post(commentsPath(taskId))
      .set("Authorization", `Bearer ${owner.accessToken}`)
      .send({ content: "to be removed" });
    const commentId = created.body.data._id;

    const deleteRes = await request(app)
      .delete(`${commentsPath(taskId)}/${commentId}`)
      .set("Authorization", `Bearer ${owner.accessToken}`);
    expect(deleteRes.status).toBe(200);

    const listRes = await request(app)
      .get(commentsPath(taskId))
      .set("Authorization", `Bearer ${owner.accessToken}`);
    expect(listRes.body.data).toHaveLength(0);

    const stored = await Comment.findById(commentId);
    expect(stored?.isDeleted).toBe(true);

    const secondDelete = await request(app)
      .delete(`${commentsPath(taskId)}/${commentId}`)
      .set("Authorization", `Bearer ${owner.accessToken}`);
    expect(secondDelete.status).toBe(404);
  });

  it("rejects a GUEST from commenting but still lets them read", async () => {
    const { owner, organizationId, taskId } = await seedTask("Guest Comment Co");
    const guest = await registerAndLogin();
    await addOrgMember(organizationId, guest.userId, "GUEST");

    await request(app)
      .post(commentsPath(taskId))
      .set("Authorization", `Bearer ${owner.accessToken}`)
      .send({ content: "visible to guests" });

    const writeRes = await request(app)
      .post(commentsPath(taskId))
      .set("Authorization", `Bearer ${guest.accessToken}`)
      .send({ content: "guest attempt" });
    expect(writeRes.status).toBe(403);

    const readRes = await request(app)
      .get(commentsPath(taskId))
      .set("Authorization", `Bearer ${guest.accessToken}`);
    expect(readRes.status).toBe(200);
    expect(readRes.body.data).toHaveLength(1);
  });

  it("rejects a non-member of the organization entirely", async () => {
    const { taskId } = await seedTask("Tenant Isolation Co");
    const outsider = await registerAndLogin();

    const res = await request(app)
      .get(commentsPath(taskId))
      .set("Authorization", `Bearer ${outsider.accessToken}`);
    expect(res.status).toBe(403);
  });
});

describe("Attachment APIs", () => {
  it("uploads a file, stores only metadata, lists it, then deletes it", async () => {
    const { owner, taskId } = await seedTask("Attachment Co");
    const base = `/api/v1/tasks/${taskId}/attachments`;

    const uploadRes = await request(app)
      .post(base)
      .set("Authorization", `Bearer ${owner.accessToken}`)
      .attach("file", Buffer.from("hello attachment"), {
        filename: "notes.txt",
        contentType: "text/plain",
      });

    expect(uploadRes.status).toBe(201);
    expect(uploadRes.body.data.originalFileName).toBe("notes.txt");
    expect(uploadRes.body.data.mimeType).toBe("text/plain");
    expect(uploadRes.body.data.fileSize).toBe(16);
    expect(uploadRes.body.data.fileUrl).toBeTruthy();
    expect(uploadRes.body.data).not.toHaveProperty("buffer");

    const activity = await TaskActivity.findOne({ taskId, action: "ATTACHMENT_UPLOADED" });
    expect(activity).not.toBeNull();

    const listRes = await request(app).get(base).set("Authorization", `Bearer ${owner.accessToken}`);
    expect(listRes.status).toBe(200);
    expect(listRes.body.data).toHaveLength(1);

    const deleteRes = await request(app)
      .delete(`${base}/${uploadRes.body.data._id}`)
      .set("Authorization", `Bearer ${owner.accessToken}`);
    expect(deleteRes.status).toBe(200);

    const afterDelete = await request(app)
      .get(base)
      .set("Authorization", `Bearer ${owner.accessToken}`);
    expect(afterDelete.body.data).toHaveLength(0);
  });

  it("rejects an unsupported MIME type and a request with no file", async () => {
    const { owner, taskId } = await seedTask("Bad Upload Co");
    const base = `/api/v1/tasks/${taskId}/attachments`;

    const badTypeRes = await request(app)
      .post(base)
      .set("Authorization", `Bearer ${owner.accessToken}`)
      .attach("file", Buffer.from("MZ"), {
        filename: "virus.exe",
        contentType: "application/x-msdownload",
      });
    expect(badTypeRes.status).toBe(422);

    const noFileRes = await request(app)
      .post(base)
      .set("Authorization", `Bearer ${owner.accessToken}`);
    expect(noFileRes.status).toBe(422);
  });
});

describe("Activity Timeline", () => {
  it("returns the append-only activity trail newest-first, including comment events", async () => {
    const { owner, projectId, taskId } = await seedTask("Timeline Co");

    await request(app)
      .patch(`/api/v1/projects/${projectId}/tasks/${taskId}`)
      .set("Authorization", `Bearer ${owner.accessToken}`)
      .send({ status: "IN_PROGRESS" });

    await request(app)
      .post(commentsPath(taskId))
      .set("Authorization", `Bearer ${owner.accessToken}`)
      .send({ content: "moving this along" });

    const res = await request(app)
      .get(`/api/v1/tasks/${taskId}/activities`)
      .set("Authorization", `Bearer ${owner.accessToken}`);

    expect(res.status).toBe(200);
    const actions = res.body.data.map((entry: { action: string }) => entry.action);
    expect(actions).toContain("TASK_CREATED");
    expect(actions).toContain("TASK_STATUS_CHANGED");
    expect(actions).toContain("COMMENT_CREATED");
    expect(res.body.meta.total).toBe(actions.length);
  });
});
