import { describe, it, expect, afterAll, beforeAll } from "vitest";
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
import { Notification } from "../src/modules/notifications/notification.model.js";

const STRONG_PASSWORD = "StrongPass1!";
const testEmails: string[] = [];
const testOrgIds: string[] = [];
const testWorkspaceIds: string[] = [];
const testProjectIds: string[] = [];
const testTaskIds: string[] = [];
const testUserIds: string[] = [];

const uniqueEmail = (prefix: string): string => {
  const email = `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
  testEmails.push(email);
  return email;
};

const registerAndLogin = async (
  prefix = "dash-test",
  name = "Dash Test User",
): Promise<{ accessToken: string; userId: string; email: string }> => {
  const email = uniqueEmail(prefix);

  await request(app).post("/api/v1/auth/register").send({ name, email, password: STRONG_PASSWORD });

  const user = await User.findOneAndUpdate(
    { email },
    { isEmailVerified: true },
    { returnDocument: "after" },
  );

  const loginRes = await request(app)
    .post("/api/v1/auth/login")
    .send({ email, password: STRONG_PASSWORD });

  testUserIds.push(user!._id.toString());
  return { accessToken: loginRes.body.data.accessToken, userId: user!._id.toString(), email };
};

// One shared fixture: building org → workspace → project → tasks costs several
// round-trips against the real Atlas cluster, and every assertion below is a
// read, so there is nothing to isolate between tests.
interface Fixture {
  owner: { accessToken: string; userId: string; email: string };
  member: { accessToken: string; userId: string; email: string };
  organizationId: string;
  workspaceId: string;
  projectId: string;
  overdueTaskId: string;
  dueTodayTaskId: string;
  doneTaskId: string;
}

let fixture: Fixture;

const createTask = async (
  accessToken: string,
  projectId: string,
  body: Record<string, unknown>,
): Promise<string> => {
  const res = await request(app)
    .post(`/api/v1/projects/${projectId}/tasks`)
    .set("Authorization", `Bearer ${accessToken}`)
    .send(body);

  expect(res.status).toBe(201);
  testTaskIds.push(res.body.data._id);
  return res.body.data._id;
};

beforeAll(async () => {
  const owner = await registerAndLogin("dash-owner", "Dashboard Owner");
  const member = await registerAndLogin("dash-member", "Zenobia Searchable");

  const org = await request(app)
    .post("/api/v1/organizations")
    .set("Authorization", `Bearer ${owner.accessToken}`)
    .send({ name: `Dashboard Co ${Date.now()}` });
  const organizationId = org.body.data._id;
  testOrgIds.push(organizationId);

  await OrganizationMember.create({ organizationId, userId: member.userId, role: "MEMBER" });

  const ws = await request(app)
    .post("/api/v1/workspaces")
    .set("Authorization", `Bearer ${owner.accessToken}`)
    .send({ organizationId, name: "Platform Engineering" });
  const workspaceId = ws.body.data._id;
  testWorkspaceIds.push(workspaceId);

  await request(app)
    .post(`/api/v1/workspaces/${workspaceId}/members`)
    .set("Authorization", `Bearer ${owner.accessToken}`)
    .send({ userId: member.userId });

  const project = await request(app)
    .post(`/api/v1/organizations/${organizationId}/workspaces/${workspaceId}/projects`)
    .set("Authorization", `Bearer ${owner.accessToken}`)
    .send({ name: "Authentication Service", key: "AUTHSVC" });
  const projectId = project.body.data._id;
  testProjectIds.push(projectId);

  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const today = new Date();
  today.setHours(12, 0, 0, 0);

  const overdueTaskId = await createTask(owner.accessToken, projectId, {
    title: "Rotate authentication secrets",
    description: "Overdue security chore",
    assigneeId: member.userId,
    priority: "CRITICAL",
    dueDate: yesterday.toISOString(),
  });

  const dueTodayTaskId = await createTask(owner.accessToken, projectId, {
    title: "Review pull request",
    assigneeId: member.userId,
    dueDate: today.toISOString(),
  });

  const doneTaskId = await createTask(owner.accessToken, projectId, {
    title: "Write authentication docs",
    assigneeId: member.userId,
  });

  await request(app)
    .patch(`/api/v1/projects/${projectId}/tasks/${doneTaskId}`)
    .set("Authorization", `Bearer ${owner.accessToken}`)
    .send({ status: "DONE" });

  // Unassigned, so it must not appear in the member's personal summary.
  await createTask(owner.accessToken, projectId, { title: "Unowned chore" });

  fixture = {
    owner,
    member,
    organizationId,
    workspaceId,
    projectId,
    overdueTaskId,
    dueTodayTaskId,
    doneTaskId,
  };
});

afterAll(async () => {
  await Notification.deleteMany({ userId: { $in: testUserIds } });
  await User.deleteMany({ email: { $in: testEmails } });
  await TaskActivity.deleteMany({ taskId: { $in: testTaskIds } });
  await Task.deleteMany({ _id: { $in: testTaskIds } });
  await Project.deleteMany({ _id: { $in: testProjectIds } });
  await WorkspaceMember.deleteMany({ workspaceId: { $in: testWorkspaceIds } });
  await Workspace.deleteMany({ _id: { $in: testWorkspaceIds } });
  await OrganizationMember.deleteMany({ organizationId: { $in: testOrgIds } });
  await Organization.deleteMany({ _id: { $in: testOrgIds } });
});

describe("GET /api/v1/dashboard/summary", () => {
  it("counts the caller's assigned, completed, overdue, due-today and pending tasks", async () => {
    const res = await request(app)
      .get("/api/v1/dashboard/summary")
      .set("Authorization", `Bearer ${fixture.member.accessToken}`)
      .query({ organizationId: fixture.organizationId });

    expect(res.status).toBe(200);
    expect(res.body.data.assignedTasks).toBe(3);
    expect(res.body.data.completedTasks).toBe(1);
    expect(res.body.data.overdueTasks).toBe(1);
    expect(res.body.data.dueToday).toBe(1);
    expect(res.body.data.pendingTasks).toBe(2);
  });

  it("is personal: the owner assigned nothing to themselves", async () => {
    const res = await request(app)
      .get("/api/v1/dashboard/summary")
      .set("Authorization", `Bearer ${fixture.owner.accessToken}`)
      .query({ organizationId: fixture.organizationId });

    expect(res.status).toBe(200);
    expect(res.body.data.assignedTasks).toBe(0);
  });

  it("rejects a missing organizationId (422) and a non-member (403)", async () => {
    const missing = await request(app)
      .get("/api/v1/dashboard/summary")
      .set("Authorization", `Bearer ${fixture.member.accessToken}`);
    expect(missing.status).toBe(422);

    const outsider = await registerAndLogin();
    const forbidden = await request(app)
      .get("/api/v1/dashboard/summary")
      .set("Authorization", `Bearer ${outsider.accessToken}`)
      .query({ organizationId: fixture.organizationId });
    expect(forbidden.status).toBe(403);
  });
});

describe("GET /api/v1/dashboard/workspaces/:workspaceId", () => {
  it("returns per-project progress, completion rate, active members and team activity", async () => {
    const res = await request(app)
      .get(`/api/v1/dashboard/workspaces/${fixture.workspaceId}`)
      .set("Authorization", `Bearer ${fixture.owner.accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.projectProgress).toHaveLength(1);

    const progress = res.body.data.projectProgress[0];
    expect(progress.totalTasks).toBe(4);
    expect(progress.completedTasks).toBe(1);
    expect(progress.progressPercentage).toBe(25);

    expect(res.body.data.completionRate).toBe(25);
    // Owner is auto-added on workspace creation, plus the member added above.
    expect(res.body.data.activeMembers).toBe(2);
    expect(res.body.data.teamActivity.length).toBeGreaterThan(0);
  });
});

describe("GET /api/v1/dashboard/projects/:projectId", () => {
  it("breaks tasks down by status and priority and reports progress", async () => {
    const res = await request(app)
      .get(`/api/v1/dashboard/projects/${fixture.projectId}`)
      .set("Authorization", `Bearer ${fixture.owner.accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.totalTasks).toBe(4);
    expect(res.body.data.completedTasks).toBe(1);
    expect(res.body.data.progressPercentage).toBe(25);
    expect(res.body.data.byStatus.DONE).toBe(1);
    expect(res.body.data.byStatus.TODO).toBe(3);
    expect(res.body.data.byPriority.CRITICAL).toBe(1);
    expect(res.body.data.overdueTasks).toBe(1);
  });
});

describe("GET /api/v1/dashboard/productivity", () => {
  it("reports completed totals, this week's count and an average completion time", async () => {
    const res = await request(app)
      .get("/api/v1/dashboard/productivity")
      .set("Authorization", `Bearer ${fixture.member.accessToken}`)
      .query({ organizationId: fixture.organizationId });

    expect(res.status).toBe(200);
    expect(res.body.data.completedTasks).toBe(1);
    expect(res.body.data.completedThisWeek).toBe(1);
    expect(res.body.data.averageCompletionHours).not.toBeNull();
    expect(res.body.data.weeklyStatistics.length).toBeGreaterThanOrEqual(1);
  });
});

describe("GET /api/v1/search", () => {
  it("searches tasks, projects, workspaces and users at once", async () => {
    const res = await request(app)
      .get("/api/v1/search")
      .set("Authorization", `Bearer ${fixture.owner.accessToken}`)
      .query({ organizationId: fixture.organizationId, q: "authentication" });

    expect(res.status).toBe(200);
    // "Rotate authentication secrets" + "Write authentication docs".
    expect(res.body.data.tasks.total).toBe(2);
    expect(res.body.data.projects.total).toBe(1);
    expect(res.body.data.workspaces.total).toBe(0);
    expect(res.body.data.users).toBeDefined();
  });

  it("narrows to one collection with ?type=", async () => {
    const res = await request(app)
      .get("/api/v1/search")
      .set("Authorization", `Bearer ${fixture.owner.accessToken}`)
      .query({ organizationId: fixture.organizationId, q: "authentication", type: "task" });

    expect(res.status).toBe(200);
    expect(res.body.data.tasks.total).toBe(2);
    expect(res.body.data.projects).toBeUndefined();
  });

  it("finds an organization member by name", async () => {
    const res = await request(app)
      .get("/api/v1/search")
      .set("Authorization", `Bearer ${fixture.owner.accessToken}`)
      .query({ organizationId: fixture.organizationId, q: "Zenobia", type: "user" });

    expect(res.status).toBe(200);
    expect(res.body.data.users.total).toBe(1);
    expect(res.body.data.users.items[0].name).toBe("Zenobia Searchable");
    // Password hashes must never leave the users collection.
    expect(res.body.data.users.items[0]).not.toHaveProperty("password");
  });

  it("never returns another organization's data", async () => {
    const outsider = await registerAndLogin();
    const theirOrg = await request(app)
      .post("/api/v1/organizations")
      .set("Authorization", `Bearer ${outsider.accessToken}`)
      .send({ name: `Outsider Co ${Date.now()}` });
    testOrgIds.push(theirOrg.body.data._id);

    const ownScope = await request(app)
      .get("/api/v1/search")
      .set("Authorization", `Bearer ${outsider.accessToken}`)
      .query({ organizationId: theirOrg.body.data._id, q: "authentication" });
    expect(ownScope.status).toBe(200);
    expect(ownScope.body.data.tasks.total).toBe(0);
    expect(ownScope.body.data.projects.total).toBe(0);

    const crossTenant = await request(app)
      .get("/api/v1/search")
      .set("Authorization", `Bearer ${outsider.accessToken}`)
      .query({ organizationId: fixture.organizationId, q: "authentication" });
    expect(crossTenant.status).toBe(403);
  });

  it("requires a query string", async () => {
    const res = await request(app)
      .get("/api/v1/search")
      .set("Authorization", `Bearer ${fixture.owner.accessToken}`)
      .query({ organizationId: fixture.organizationId });

    expect(res.status).toBe(422);
  });
});

describe("GET /api/v1/search/tasks", () => {
  it("filters by status, priority, assignee and due date without a text query", async () => {
    const base = {
      organizationId: fixture.organizationId,
      projectId: fixture.projectId,
    };

    const critical = await request(app)
      .get("/api/v1/search/tasks")
      .set("Authorization", `Bearer ${fixture.owner.accessToken}`)
      .query({ ...base, priority: "CRITICAL" });
    expect(critical.status).toBe(200);
    expect(critical.body.data).toHaveLength(1);
    expect(critical.body.data[0]._id).toBe(fixture.overdueTaskId);

    const done = await request(app)
      .get("/api/v1/search/tasks")
      .set("Authorization", `Bearer ${fixture.owner.accessToken}`)
      .query({ ...base, status: "DONE" });
    expect(done.body.data).toHaveLength(1);
    expect(done.body.data[0]._id).toBe(fixture.doneTaskId);

    const assigned = await request(app)
      .get("/api/v1/search/tasks")
      .set("Authorization", `Bearer ${fixture.owner.accessToken}`)
      .query({ ...base, assigneeId: fixture.member.userId });
    expect(assigned.body.meta.total).toBe(3);

    const dueBefore = await request(app)
      .get("/api/v1/search/tasks")
      .set("Authorization", `Bearer ${fixture.owner.accessToken}`)
      .query({ ...base, dueBefore: new Date().toISOString() });
    expect(dueBefore.body.data.map((t: { _id: string }) => t._id)).toContain(
      fixture.overdueTaskId,
    );
  });

  it("combines a text query with a filter", async () => {
    const res = await request(app)
      .get("/api/v1/search/tasks")
      .set("Authorization", `Bearer ${fixture.owner.accessToken}`)
      .query({
        organizationId: fixture.organizationId,
        q: "authentication",
        status: "DONE",
      });

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0]._id).toBe(fixture.doneTaskId);
  });
});

describe("GET /api/v1/search/projects", () => {
  it("searches by name and filters by status and workspace", async () => {
    const byName = await request(app)
      .get("/api/v1/search/projects")
      .set("Authorization", `Bearer ${fixture.owner.accessToken}`)
      .query({ organizationId: fixture.organizationId, q: "authentication" });
    expect(byName.status).toBe(200);
    expect(byName.body.data).toHaveLength(1);
    expect(byName.body.data[0]._id).toBe(fixture.projectId);

    const byWorkspace = await request(app)
      .get("/api/v1/search/projects")
      .set("Authorization", `Bearer ${fixture.owner.accessToken}`)
      .query({ organizationId: fixture.organizationId, workspaceId: fixture.workspaceId });
    expect(byWorkspace.body.meta.total).toBe(1);

    const wrongStatus = await request(app)
      .get("/api/v1/search/projects")
      .set("Authorization", `Bearer ${fixture.owner.accessToken}`)
      .query({ organizationId: fixture.organizationId, status: "COMPLETED" });
    expect(wrongStatus.body.data).toHaveLength(0);
  });
});
