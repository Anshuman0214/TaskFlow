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
import { AuditLog } from "../src/modules/audit/auditLog.model.js";
import { OrganizationRole } from "../src/modules/organizations/organization.types.js";

const STRONG_PASSWORD = "StrongPass1!";
const testEmails: string[] = [];
const testOrgIds: string[] = [];
const testWorkspaceIds: string[] = [];
const testProjectIds: string[] = [];

const uniqueEmail = (): string => {
  const email = `proj-test-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
  testEmails.push(email);
  return email;
};

const registerAndLogin = async (): Promise<{ accessToken: string; userId: string; email: string }> => {
  const email = uniqueEmail();

  await request(app)
    .post("/api/v1/auth/register")
    .send({ name: "Project Test User", email, password: STRONG_PASSWORD });

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

const projectsPath = (organizationId: string, workspaceId: string) =>
  `/api/v1/organizations/${organizationId}/workspaces/${workspaceId}/projects`;

const createProject = async (
  accessToken: string,
  organizationId: string,
  workspaceId: string,
  body: Record<string, unknown>,
) => {
  const res = await request(app)
    .post(projectsPath(organizationId, workspaceId))
    .set("Authorization", `Bearer ${accessToken}`)
    .send(body);

  if (res.body.data?._id) testProjectIds.push(res.body.data._id);
  return res;
};

const addOrgMember = (organizationId: string, userId: string, role: OrganizationRole) =>
  OrganizationMember.create({ organizationId, userId, role });

afterAll(async () => {
  await User.deleteMany({ email: { $in: testEmails } });
  await Label.deleteMany({ projectId: { $in: testProjectIds } });
  await Project.deleteMany({ _id: { $in: testProjectIds } });
  await WorkspaceMember.deleteMany({ workspaceId: { $in: testWorkspaceIds } });
  await Workspace.deleteMany({ _id: { $in: testWorkspaceIds } });
  await OrganizationMember.deleteMany({ organizationId: { $in: testOrgIds } });
  await Organization.deleteMany({ _id: { $in: testOrgIds } });
});

describe("POST /api/v1/organizations/:organizationId/workspaces/:workspaceId/projects", () => {
  it("creates a project defaulting to PLANNING", async () => {
    const owner = await registerAndLogin();
    const org = await createOrg(owner.accessToken, "Project Co");
    const ws = await createWorkspace(owner.accessToken, org.body.data._id, "Eng");

    const res = await createProject(owner.accessToken, org.body.data._id, ws.body.data._id, {
      name: "Auth Service",
      key: "auth",
    });

    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe("PLANNING");
    expect(res.body.data.key).toBe("AUTH");
  });

  it("rejects creation by a MEMBER-role org member", async () => {
    const owner = await registerAndLogin();
    const member = await registerAndLogin();
    const org = await createOrg(owner.accessToken, "Member Gated Proj Co");
    await addOrgMember(org.body.data._id, member.userId, "MEMBER");
    const ws = await createWorkspace(owner.accessToken, org.body.data._id, "Eng");

    const res = await createProject(member.accessToken, org.body.data._id, ws.body.data._id, {
      name: "Blocked",
      key: "BLK",
    });
    expect(res.status).toBe(403);
  });

  it("rejects creation in an archived workspace", async () => {
    const owner = await registerAndLogin();
    const org = await createOrg(owner.accessToken, "Archived Ws Proj Co");
    const ws = await createWorkspace(owner.accessToken, org.body.data._id, "Eng");
    await request(app)
      .patch(`/api/v1/workspaces/${ws.body.data._id}/archive`)
      .set("Authorization", `Bearer ${owner.accessToken}`);

    const res = await createProject(owner.accessToken, org.body.data._id, ws.body.data._id, {
      name: "Nope",
      key: "NOP",
    });
    expect(res.status).toBe(403);
  });

  it("rejects a duplicate name and a duplicate key within the same workspace", async () => {
    const owner = await registerAndLogin();
    const org = await createOrg(owner.accessToken, "Dup Proj Co");
    const ws = await createWorkspace(owner.accessToken, org.body.data._id, "Eng");

    await createProject(owner.accessToken, org.body.data._id, ws.body.data._id, {
      name: "Payments",
      key: "PAY",
    });

    const dupName = await createProject(owner.accessToken, org.body.data._id, ws.body.data._id, {
      name: "Payments",
      key: "PAY2",
    });
    expect(dupName.status).toBe(409);

    const dupKey = await createProject(owner.accessToken, org.body.data._id, ws.body.data._id, {
      name: "Payments Two",
      key: "PAY",
    });
    expect(dupKey.status).toBe(409);
  });

  it("rejects a start date after the end date", async () => {
    const owner = await registerAndLogin();
    const org = await createOrg(owner.accessToken, "Date Order Co");
    const ws = await createWorkspace(owner.accessToken, org.body.data._id, "Eng");

    const res = await createProject(owner.accessToken, org.body.data._id, ws.body.data._id, {
      name: "Backwards",
      key: "BWD",
      startDate: "2026-09-15",
      endDate: "2026-08-10",
    });
    expect(res.status).toBe(422);
  });
});

describe("GET /api/v1/organizations/:organizationId/workspaces/:workspaceId/projects", () => {
  it("paginates and filters by status", async () => {
    const owner = await registerAndLogin();
    const org = await createOrg(owner.accessToken, "List Proj Co");
    const ws = await createWorkspace(owner.accessToken, org.body.data._id, "Eng");

    for (let i = 0; i < 3; i += 1) {
      await createProject(owner.accessToken, org.body.data._id, ws.body.data._id, {
        name: `Project ${i}`,
        key: `KEY${i}`,
      });
    }

    const page1 = await request(app)
      .get(`${projectsPath(org.body.data._id, ws.body.data._id)}?limit=2&page=1`)
      .set("Authorization", `Bearer ${owner.accessToken}`);
    expect(page1.status).toBe(200);
    expect(page1.body.data).toHaveLength(2);
    expect(page1.body.meta).toMatchObject({ page: 1, limit: 2, total: 3, totalPages: 2 });

    const page2 = await request(app)
      .get(`${projectsPath(org.body.data._id, ws.body.data._id)}?limit=2&page=2`)
      .set("Authorization", `Bearer ${owner.accessToken}`);
    expect(page2.body.data).toHaveLength(1);

    const filtered = await request(app)
      .get(`${projectsPath(org.body.data._id, ws.body.data._id)}?status=ARCHIVED`)
      .set("Authorization", `Bearer ${owner.accessToken}`);
    expect(filtered.body.data).toHaveLength(0);
  });

  it("rejects listing for a non-member of the organization", async () => {
    const owner = await registerAndLogin();
    const outsider = await registerAndLogin();
    const org = await createOrg(owner.accessToken, "List Gated Proj Co");
    const ws = await createWorkspace(owner.accessToken, org.body.data._id, "Eng");

    const res = await request(app)
      .get(projectsPath(org.body.data._id, ws.body.data._id))
      .set("Authorization", `Bearer ${outsider.accessToken}`);
    expect(res.status).toBe(403);
  });
});

describe("GET/PATCH/DELETE .../projects/:projectId", () => {
  it("lets a MANAGER update but not delete", async () => {
    const owner = await registerAndLogin();
    const manager = await registerAndLogin();
    const org = await createOrg(owner.accessToken, "Manager Proj Co");
    await addOrgMember(org.body.data._id, manager.userId, "MANAGER");
    const ws = await createWorkspace(owner.accessToken, org.body.data._id, "Eng");
    const project = await createProject(owner.accessToken, org.body.data._id, ws.body.data._id, {
      name: "Managed",
      key: "MGD",
    });
    const projectId = project.body.data._id;
    const base = `${projectsPath(org.body.data._id, ws.body.data._id)}/${projectId}`;

    const updateRes = await request(app)
      .patch(base)
      .set("Authorization", `Bearer ${manager.accessToken}`)
      .send({ description: "Updated by manager" });
    expect(updateRes.status).toBe(200);

    const deleteRes = await request(app)
      .delete(base)
      .set("Authorization", `Bearer ${manager.accessToken}`);
    expect(deleteRes.status).toBe(403);
  });

  it("blocks COMPLETED -> PLANNING and rejects updates once archived, but still allows delete", async () => {
    const owner = await registerAndLogin();
    const org = await createOrg(owner.accessToken, "Lifecycle Proj Co");
    const ws = await createWorkspace(owner.accessToken, org.body.data._id, "Eng");
    const project = await createProject(owner.accessToken, org.body.data._id, ws.body.data._id, {
      name: "Lifecycle",
      key: "LIFE",
    });
    const projectId = project.body.data._id;
    const base = `${projectsPath(org.body.data._id, ws.body.data._id)}/${projectId}`;

    const toCompleted = await request(app)
      .patch(base)
      .set("Authorization", `Bearer ${owner.accessToken}`)
      .send({ status: "COMPLETED" });
    expect(toCompleted.status).toBe(200);

    const backToPlanning = await request(app)
      .patch(base)
      .set("Authorization", `Bearer ${owner.accessToken}`)
      .send({ status: "PLANNING" });
    expect(backToPlanning.status).toBe(422);

    const archiveRes = await request(app)
      .patch(base)
      .set("Authorization", `Bearer ${owner.accessToken}`)
      .send({ status: "ARCHIVED" });
    expect(archiveRes.status).toBe(200);
    expect(archiveRes.body.data.status).toBe("ARCHIVED");

    const archivedLog = await AuditLog.findOne({ entityId: projectId, action: "PROJECT_ARCHIVED" });
    expect(archivedLog).not.toBeNull();

    const updateAfterArchive = await request(app)
      .patch(base)
      .set("Authorization", `Bearer ${owner.accessToken}`)
      .send({ name: "Renamed" });
    expect(updateAfterArchive.status).toBe(403);

    const deleteRes = await request(app)
      .delete(base)
      .set("Authorization", `Bearer ${owner.accessToken}`);
    expect(deleteRes.status).toBe(200);
  });

  it("returns 404 when the workspaceId in the URL doesn't match the project's real workspace", async () => {
    const owner = await registerAndLogin();
    const org = await createOrg(owner.accessToken, "Mismatch Co");
    const wsA = await createWorkspace(owner.accessToken, org.body.data._id, "Ws A");
    const wsB = await createWorkspace(owner.accessToken, org.body.data._id, "Ws B");
    const project = await createProject(owner.accessToken, org.body.data._id, wsA.body.data._id, {
      name: "Mismatched",
      key: "MIS",
    });

    const res = await request(app)
      .get(`${projectsPath(org.body.data._id, wsB.body.data._id)}/${project.body.data._id}`)
      .set("Authorization", `Bearer ${owner.accessToken}`);
    expect(res.status).toBe(404);
  });
});

describe("labels", () => {
  const labelsPath = (projectId: string) => `/api/v1/projects/${projectId}/labels`;

  it("creates, lists, updates and deletes labels, rejecting duplicate names", async () => {
    const owner = await registerAndLogin();
    const org = await createOrg(owner.accessToken, "Label Co");
    const ws = await createWorkspace(owner.accessToken, org.body.data._id, "Eng");
    const project = await createProject(owner.accessToken, org.body.data._id, ws.body.data._id, {
      name: "Labeled",
      key: "LBL",
    });
    const projectId = project.body.data._id;

    const createRes = await request(app)
      .post(labelsPath(projectId))
      .set("Authorization", `Bearer ${owner.accessToken}`)
      .send({ name: "Bug", color: "#FF0000" });
    expect(createRes.status).toBe(201);

    const dupRes = await request(app)
      .post(labelsPath(projectId))
      .set("Authorization", `Bearer ${owner.accessToken}`)
      .send({ name: "Bug", color: "#00FF00" });
    expect(dupRes.status).toBe(409);

    const listRes = await request(app)
      .get(labelsPath(projectId))
      .set("Authorization", `Bearer ${owner.accessToken}`);
    expect(listRes.body.data).toHaveLength(1);
    const labelId = listRes.body.data[0]._id;

    const updateRes = await request(app)
      .patch(`${labelsPath(projectId)}/${labelId}`)
      .set("Authorization", `Bearer ${owner.accessToken}`)
      .send({ color: "#123456" });
    expect(updateRes.status).toBe(200);
    expect(updateRes.body.data.color).toBe("#123456");

    const deleteRes = await request(app)
      .delete(`${labelsPath(projectId)}/${labelId}`)
      .set("Authorization", `Bearer ${owner.accessToken}`);
    expect(deleteRes.status).toBe(200);

    const remaining = await Label.findById(labelId);
    expect(remaining).toBeNull();
  });

  it("rejects label creation by a MEMBER-role org member", async () => {
    const owner = await registerAndLogin();
    const member = await registerAndLogin();
    const org = await createOrg(owner.accessToken, "Label Gated Co");
    await addOrgMember(org.body.data._id, member.userId, "MEMBER");
    const ws = await createWorkspace(owner.accessToken, org.body.data._id, "Eng");
    const project = await createProject(owner.accessToken, org.body.data._id, ws.body.data._id, {
      name: "Guarded",
      key: "GRD",
    });

    const res = await request(app)
      .post(labelsPath(project.body.data._id))
      .set("Authorization", `Bearer ${member.accessToken}`)
      .send({ name: "Nope", color: "#000000" });
    expect(res.status).toBe(403);
  });
});
