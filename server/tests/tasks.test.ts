import { describe, it, expect, afterAll } from "vitest";
import request from "supertest";
import app from "../src/app.js";
import { User } from "../src/modules/users/user.model.js";
import { Organization } from "../src/modules/organizations/organization.model.js";
import { OrganizationMember } from "../src/modules/organizations/organizationMember.model.js";
import { Workspace } from "../src/modules/workspaces/workspace.model.js";
import { WorkspaceMember } from "../src/modules/workspaces/workspaceMember.model.js";
import { Project } from "../src/modules/projects/project.model.js";
import { Label } from "../src/modules/projects/label.model.js";
import { Task } from "../src/modules/tasks/task.model.js";
import { TaskActivity } from "../src/modules/tasks/taskActivity.model.js";
import { AuditLog } from "../src/modules/audit/auditLog.model.js";
import { OrganizationRole } from "../src/modules/organizations/organization.types.js";

const STRONG_PASSWORD = "StrongPass1!";
const testEmails: string[] = [];
const testOrgIds: string[] = [];
const testWorkspaceIds: string[] = [];
const testProjectIds: string[] = [];
const testTaskIds: string[] = [];

const uniqueEmail = (): string => {
  const email = `task-test-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
  testEmails.push(email);
  return email;
};

const registerAndLogin = async (): Promise<{ accessToken: string; userId: string; email: string }> => {
  const email = uniqueEmail();

  await request(app)
    .post("/api/v1/auth/register")
    .send({ name: "Task Test User", email, password: STRONG_PASSWORD });

  const user = await User.findOneAndUpdate(
    { email },
    { isEmailVerified: true },
    { returnDocument: "after" },
  );

  const loginRes = await request(app)
    .post("/api/v1/auth/login")
    .send({ email, password: STRONG_PASSWORD });

  return { accessToken: loginRes.body.data.accessToken, userId: user!._id.toString(), email };
};

const createOrg = async (accessToken: string, name: string) => {
  const res = await request(app)
    .post("/api/v1/organizations")
    .set("Authorization", `Bearer ${accessToken}`)
    .send({ name });

  testOrgIds.push(res.body.data._id);
  return res;
};

const createWorkspace = async (accessToken: string, organizationId: string, name: string) => {
  const res = await request(app)
    .post("/api/v1/workspaces")
    .set("Authorization", `Bearer ${accessToken}`)
    .send({ organizationId, name });

  if (res.body.data?._id) testWorkspaceIds.push(res.body.data._id);
  return res;
};

const createProject = async (accessToken: string, organizationId: string, workspaceId: string, name: string) => {
  const res = await request(app)
    .post(`/api/v1/organizations/${organizationId}/workspaces/${workspaceId}/projects`)
    .set("Authorization", `Bearer ${accessToken}`)
    .send({ name, key: name.replace(/[^A-Za-z]/g, "").slice(0, 8) || "PRJ" });

  if (res.body.data?._id) testProjectIds.push(res.body.data._id);
  return res;
};

const tasksPath = (projectId: string) => `/api/v1/projects/${projectId}/tasks`;

const createTask = async (accessToken: string, projectId: string, body: Record<string, unknown>) => {
  const res = await request(app)
    .post(tasksPath(projectId))
    .set("Authorization", `Bearer ${accessToken}`)
    .send(body);

  if (res.body.data?._id) testTaskIds.push(res.body.data._id);
  return res;
};

const addOrgMember = (organizationId: string, userId: string, role: OrganizationRole) =>
  OrganizationMember.create({ organizationId, userId, role });

const addWorkspaceMember = (workspaceId: string, organizationId: string, userId: string, addedBy: string) =>
  WorkspaceMember.create({ workspaceId, organizationId, userId, addedBy });

afterAll(async () => {
  await User.deleteMany({ email: { $in: testEmails } });
  await TaskActivity.deleteMany({ taskId: { $in: testTaskIds } });
  await Task.deleteMany({ _id: { $in: testTaskIds } });
  await Label.deleteMany({ projectId: { $in: testProjectIds } });
  await Project.deleteMany({ _id: { $in: testProjectIds } });
  await WorkspaceMember.deleteMany({ workspaceId: { $in: testWorkspaceIds } });
  await Workspace.deleteMany({ _id: { $in: testWorkspaceIds } });
  await OrganizationMember.deleteMany({ organizationId: { $in: testOrgIds } });
  await Organization.deleteMany({ _id: { $in: testOrgIds } });
});

describe("POST /api/v1/projects/:projectId/tasks", () => {
  it("creates a task defaulting to TODO/MEDIUM", async () => {
    const owner = await registerAndLogin();
    const org = await createOrg(owner.accessToken, "Task Co");
    const ws = await createWorkspace(owner.accessToken, org.body.data._id, "Eng");
    const project = await createProject(owner.accessToken, org.body.data._id, ws.body.data._id, "Backend");

    const res = await createTask(owner.accessToken, project.body.data._id, { title: "Implement login" });

    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe("TODO");
    expect(res.body.data.priority).toBe("MEDIUM");
    expect(res.body.data.reporterId).toBe(owner.userId);
  });

  it("allows a MEMBER to create but rejects a GUEST", async () => {
    const owner = await registerAndLogin();
    const member = await registerAndLogin();
    const guest = await registerAndLogin();
    const org = await createOrg(owner.accessToken, "Role Task Co");
    await addOrgMember(org.body.data._id, member.userId, "MEMBER");
    await addOrgMember(org.body.data._id, guest.userId, "GUEST");
    const ws = await createWorkspace(owner.accessToken, org.body.data._id, "Eng");
    const project = await createProject(owner.accessToken, org.body.data._id, ws.body.data._id, "Frontend");

    const memberRes = await createTask(member.accessToken, project.body.data._id, { title: "Member task" });
    expect(memberRes.status).toBe(201);

    const guestRes = await createTask(guest.accessToken, project.body.data._id, { title: "Guest task" });
    expect(guestRes.status).toBe(403);
  });

  it("rejects creation on an archived project", async () => {
    const owner = await registerAndLogin();
    const org = await createOrg(owner.accessToken, "Archived Proj Task Co");
    const ws = await createWorkspace(owner.accessToken, org.body.data._id, "Eng");
    const project = await createProject(owner.accessToken, org.body.data._id, ws.body.data._id, "Api");
    await request(app)
      .patch(`/api/v1/organizations/${org.body.data._id}/workspaces/${ws.body.data._id}/projects/${project.body.data._id}`)
      .set("Authorization", `Bearer ${owner.accessToken}`)
      .send({ status: "ARCHIVED" });

    const res = await createTask(owner.accessToken, project.body.data._id, { title: "Nope" });
    expect(res.status).toBe(403);
  });

  it("rejects an assignee who isn't a workspace member", async () => {
    const owner = await registerAndLogin();
    const outsider = await registerAndLogin();
    const org = await createOrg(owner.accessToken, "Assignee Co");
    await addOrgMember(org.body.data._id, outsider.userId, "MEMBER");
    const ws = await createWorkspace(owner.accessToken, org.body.data._id, "Eng");
    const project = await createProject(owner.accessToken, org.body.data._id, ws.body.data._id, "Web");

    const res = await createTask(owner.accessToken, project.body.data._id, {
      title: "Needs assignee",
      assigneeId: outsider.userId,
    });
    expect(res.status).toBe(400);
  });

  it("rejects a label that doesn't belong to the project", async () => {
    const owner = await registerAndLogin();
    const org = await createOrg(owner.accessToken, "Label Task Co");
    const ws = await createWorkspace(owner.accessToken, org.body.data._id, "Eng");
    const project = await createProject(owner.accessToken, org.body.data._id, ws.body.data._id, "Mobile");

    const res = await createTask(owner.accessToken, project.body.data._id, {
      title: "Bad label",
      labelIds: ["64f000000000000000000000"],
    });
    expect(res.status).toBe(400);
  });

  it("rejects a parentTaskId belonging to a different project", async () => {
    const owner = await registerAndLogin();
    const org = await createOrg(owner.accessToken, "Cross Project Co");
    const ws = await createWorkspace(owner.accessToken, org.body.data._id, "Eng");
    const projectA = await createProject(owner.accessToken, org.body.data._id, ws.body.data._id, "PA");
    const projectB = await createProject(owner.accessToken, org.body.data._id, ws.body.data._id, "PB");
    const parent = await createTask(owner.accessToken, projectA.body.data._id, { title: "Parent" });

    const res = await createTask(owner.accessToken, projectB.body.data._id, {
      title: "Cross child",
      parentTaskId: parent.body.data._id,
    });
    expect(res.status).toBe(400);
  });
});

describe("GET /api/v1/projects/:projectId/tasks", () => {
  it("paginates, filters, and excludes subtasks from the root list", async () => {
    const owner = await registerAndLogin();
    const org = await createOrg(owner.accessToken, "List Task Co");
    const ws = await createWorkspace(owner.accessToken, org.body.data._id, "Eng");
    const project = await createProject(owner.accessToken, org.body.data._id, ws.body.data._id, "Listing");

    const t1 = await createTask(owner.accessToken, project.body.data._id, { title: "T1", priority: "HIGH" });
    await createTask(owner.accessToken, project.body.data._id, { title: "T2" });
    await request(app)
      .post(`${tasksPath(project.body.data._id)}/${t1.body.data._id}/subtasks`)
      .set("Authorization", `Bearer ${owner.accessToken}`)
      .send({ title: "Subtask of T1" });

    const listRes = await request(app)
      .get(tasksPath(project.body.data._id))
      .set("Authorization", `Bearer ${owner.accessToken}`);
    expect(listRes.body.data).toHaveLength(2);

    const filteredRes = await request(app)
      .get(`${tasksPath(project.body.data._id)}?priority=HIGH`)
      .set("Authorization", `Bearer ${owner.accessToken}`);
    expect(filteredRes.body.data).toHaveLength(1);
    expect(filteredRes.body.data[0]._id).toBe(t1.body.data._id);
  });
});

describe("GET/PATCH/DELETE .../tasks/:taskId", () => {
  it("returns labels and subtasks on get, and 404s once deleted", async () => {
    const owner = await registerAndLogin();
    const org = await createOrg(owner.accessToken, "Get Task Co");
    const ws = await createWorkspace(owner.accessToken, org.body.data._id, "Eng");
    const project = await createProject(owner.accessToken, org.body.data._id, ws.body.data._id, "Getter");

    const labelRes = await request(app)
      .post(`/api/v1/projects/${project.body.data._id}/labels`)
      .set("Authorization", `Bearer ${owner.accessToken}`)
      .send({ name: "Bug", color: "#FF0000" });

    const task = await createTask(owner.accessToken, project.body.data._id, {
      title: "Parent",
      labelIds: [labelRes.body.data._id],
    });
    const taskId = task.body.data._id;
    const base = `${tasksPath(project.body.data._id)}/${taskId}`;

    await request(app)
      .post(`${base}/subtasks`)
      .set("Authorization", `Bearer ${owner.accessToken}`)
      .send({ title: "Child" });

    const getRes = await request(app).get(base).set("Authorization", `Bearer ${owner.accessToken}`);
    expect(getRes.status).toBe(200);
    expect(getRes.body.data.subtasks).toHaveLength(1);
    expect(getRes.body.data.labelIds[0].name).toBe("Bug");

    const deleteRes = await request(app).delete(base).set("Authorization", `Bearer ${owner.accessToken}`);
    expect(deleteRes.status).toBe(200);

    const getAfterDelete = await request(app).get(base).set("Authorization", `Bearer ${owner.accessToken}`);
    expect(getAfterDelete.status).toBe(404);

    const secondDelete = await request(app).delete(base).set("Authorization", `Bearer ${owner.accessToken}`);
    expect(secondDelete.status).toBe(404);
  });

  it("rejects updates on an archived task, but allows delete", async () => {
    const owner = await registerAndLogin();
    const org = await createOrg(owner.accessToken, "Archived Task Co");
    const ws = await createWorkspace(owner.accessToken, org.body.data._id, "Eng");
    const project = await createProject(owner.accessToken, org.body.data._id, ws.body.data._id, "Arch");
    const task = await createTask(owner.accessToken, project.body.data._id, { title: "Archive me" });
    const base = `${tasksPath(project.body.data._id)}/${task.body.data._id}`;

    await request(app)
      .patch(base)
      .set("Authorization", `Bearer ${owner.accessToken}`)
      .send({ status: "ARCHIVED" });

    const updateRes = await request(app)
      .patch(base)
      .set("Authorization", `Bearer ${owner.accessToken}`)
      .send({ title: "Renamed" });
    expect(updateRes.status).toBe(403);

    const deleteRes = await request(app).delete(base).set("Authorization", `Bearer ${owner.accessToken}`);
    expect(deleteRes.status).toBe(200);
  });

  it("sets completedAt on DONE and clears it when moving away, picking the right audit action", async () => {
    const owner = await registerAndLogin();
    const assignee = await registerAndLogin();
    const org = await createOrg(owner.accessToken, "Lifecycle Task Co");
    await addOrgMember(org.body.data._id, assignee.userId, "MEMBER");
    const ws = await createWorkspace(owner.accessToken, org.body.data._id, "Eng");
    await addWorkspaceMember(ws.body.data._id, org.body.data._id, assignee.userId, owner.userId);
    const project = await createProject(owner.accessToken, org.body.data._id, ws.body.data._id, "Life");
    const task = await createTask(owner.accessToken, project.body.data._id, { title: "Lifecycle" });
    const taskId = task.body.data._id;
    const base = `${tasksPath(project.body.data._id)}/${taskId}`;

    const assignRes = await request(app)
      .patch(base)
      .set("Authorization", `Bearer ${owner.accessToken}`)
      .send({ assigneeId: assignee.userId });
    expect(assignRes.status).toBe(200);
    const assignedLog = await AuditLog.findOne({ entityId: taskId, action: "TASK_ASSIGNED" });
    expect(assignedLog).not.toBeNull();

    const doneRes = await request(app)
      .patch(base)
      .set("Authorization", `Bearer ${owner.accessToken}`)
      .send({ status: "DONE" });
    expect(doneRes.status).toBe(200);
    expect(doneRes.body.data.completedAt).not.toBeNull();
    const completedLog = await AuditLog.findOne({ entityId: taskId, action: "TASK_COMPLETED" });
    expect(completedLog).not.toBeNull();

    const reopenRes = await request(app)
      .patch(base)
      .set("Authorization", `Bearer ${owner.accessToken}`)
      .send({ status: "IN_PROGRESS" });
    expect(reopenRes.status).toBe(200);
    expect(reopenRes.body.data.completedAt).toBeNull();
  });

  it("restores a deleted task via PATCH { isDeleted: false } and rejects everything else while deleted", async () => {
    const owner = await registerAndLogin();
    const org = await createOrg(owner.accessToken, "Restore Task Co");
    const ws = await createWorkspace(owner.accessToken, org.body.data._id, "Eng");
    const project = await createProject(owner.accessToken, org.body.data._id, ws.body.data._id, "Restore");
    const task = await createTask(owner.accessToken, project.body.data._id, { title: "Restorable" });
    const taskId = task.body.data._id;
    const base = `${tasksPath(project.body.data._id)}/${taskId}`;

    await request(app).delete(base).set("Authorization", `Bearer ${owner.accessToken}`);

    const otherFieldWhileDeleted = await request(app)
      .patch(base)
      .set("Authorization", `Bearer ${owner.accessToken}`)
      .send({ title: "Nope" });
    expect(otherFieldWhileDeleted.status).toBe(404);

    const restoreRes = await request(app)
      .patch(base)
      .set("Authorization", `Bearer ${owner.accessToken}`)
      .send({ isDeleted: false });
    expect(restoreRes.status).toBe(200);

    const getRes = await request(app).get(base).set("Authorization", `Bearer ${owner.accessToken}`);
    expect(getRes.status).toBe(200);
  });
});
