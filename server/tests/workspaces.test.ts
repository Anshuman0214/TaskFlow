import { describe, it, expect, afterAll } from "vitest";
import request from "supertest";
import app from "../src/app.js";
import { User } from "../src/modules/users/user.model.js";
import { Organization } from "../src/modules/organizations/organization.model.js";
import { OrganizationMember } from "../src/modules/organizations/organizationMember.model.js";
import { Workspace } from "../src/modules/workspaces/workspace.model.js";
import { WorkspaceMember } from "../src/modules/workspaces/workspaceMember.model.js";
import { OrganizationRole } from "../src/modules/organizations/organization.types.js";

const STRONG_PASSWORD = "StrongPass1!";
const testEmails: string[] = [];
const testOrgIds: string[] = [];
const testWorkspaceIds: string[] = [];

const uniqueEmail = (): string => {
  const email = `ws-test-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
  testEmails.push(email);
  return email;
};

const registerAndLogin = async (): Promise<{ accessToken: string; userId: string; email: string }> => {
  const email = uniqueEmail();

  await request(app)
    .post("/api/v1/auth/register")
    .send({ name: "Workspace Test User", email, password: STRONG_PASSWORD });

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

const addOrgMember = (organizationId: string, userId: string, role: OrganizationRole) =>
  OrganizationMember.create({ organizationId, userId, role });

afterAll(async () => {
  await User.deleteMany({ email: { $in: testEmails } });
  await WorkspaceMember.deleteMany({ workspaceId: { $in: testWorkspaceIds } });
  await Workspace.deleteMany({ _id: { $in: testWorkspaceIds } });
  await OrganizationMember.deleteMany({ organizationId: { $in: testOrgIds } });
  await Organization.deleteMany({ _id: { $in: testOrgIds } });
});

describe("POST /api/v1/workspaces", () => {
  it("creates a workspace and auto-adds the creator as a member", async () => {
    const owner = await registerAndLogin();
    const org = await createOrg(owner.accessToken, "Acme WS Corp");

    const res = await createWorkspace(owner.accessToken, org.body.data._id, "Engineering");

    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe("ACTIVE");

    const membership = await WorkspaceMember.findOne({
      workspaceId: res.body.data._id,
      userId: owner.userId,
    });
    expect(membership).not.toBeNull();
  });

  it("rejects creation by a MEMBER-role org member", async () => {
    const owner = await registerAndLogin();
    const member = await registerAndLogin();
    const org = await createOrg(owner.accessToken, "Member Gated Co");
    await addOrgMember(org.body.data._id, member.userId, "MEMBER");

    const res = await createWorkspace(member.accessToken, org.body.data._id, "Marketing");
    expect(res.status).toBe(403);
  });

  it("rejects creation for a non-member of the organization", async () => {
    const owner = await registerAndLogin();
    const outsider = await registerAndLogin();
    const org = await createOrg(owner.accessToken, "Outsider Gated Co");

    const res = await createWorkspace(outsider.accessToken, org.body.data._id, "Finance");
    expect(res.status).toBe(403);
  });

  it("returns 404 for an unknown organization", async () => {
    const owner = await registerAndLogin();
    const res = await createWorkspace(owner.accessToken, "64f000000000000000000000", "Ghost Org WS");
    expect(res.status).toBe(404);
  });
});

describe("GET /api/v1/workspaces", () => {
  it("lists workspaces scoped to the organizationId query param", async () => {
    const owner = await registerAndLogin();
    const orgA = await createOrg(owner.accessToken, "List Scope A");
    const orgB = await createOrg(owner.accessToken, "List Scope B");
    const wsA = await createWorkspace(owner.accessToken, orgA.body.data._id, "A Workspace");
    await createWorkspace(owner.accessToken, orgB.body.data._id, "B Workspace");

    const res = await request(app)
      .get(`/api/v1/workspaces?organizationId=${orgA.body.data._id}`)
      .set("Authorization", `Bearer ${owner.accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0]._id).toBe(wsA.body.data._id);
  });

  it("rejects listing for a non-member of the organization", async () => {
    const owner = await registerAndLogin();
    const outsider = await registerAndLogin();
    const org = await createOrg(owner.accessToken, "List Gated Co");

    const res = await request(app)
      .get(`/api/v1/workspaces?organizationId=${org.body.data._id}`)
      .set("Authorization", `Bearer ${outsider.accessToken}`);

    expect(res.status).toBe(403);
  });
});

describe("GET/PATCH/DELETE /api/v1/workspaces/:workspaceId", () => {
  it("lets a MANAGER update but not archive or delete", async () => {
    const owner = await registerAndLogin();
    const manager = await registerAndLogin();
    const org = await createOrg(owner.accessToken, "Manager Co");
    await addOrgMember(org.body.data._id, manager.userId, "MANAGER");

    const ws = await createWorkspace(owner.accessToken, org.body.data._id, "Team Space");
    const workspaceId = ws.body.data._id;

    const updateRes = await request(app)
      .patch(`/api/v1/workspaces/${workspaceId}`)
      .set("Authorization", `Bearer ${manager.accessToken}`)
      .send({ description: "Updated by manager" });
    expect(updateRes.status).toBe(200);
    expect(updateRes.body.data.description).toBe("Updated by manager");

    const archiveRes = await request(app)
      .patch(`/api/v1/workspaces/${workspaceId}/archive`)
      .set("Authorization", `Bearer ${manager.accessToken}`);
    expect(archiveRes.status).toBe(403);

    const deleteRes = await request(app)
      .delete(`/api/v1/workspaces/${workspaceId}`)
      .set("Authorization", `Bearer ${manager.accessToken}`);
    expect(deleteRes.status).toBe(403);
  });

  it("archiving makes a workspace read-only for updates and new members, but still deletable", async () => {
    const owner = await registerAndLogin();
    const invitee = await registerAndLogin();
    const org = await createOrg(owner.accessToken, "Archive Co");
    await addOrgMember(org.body.data._id, invitee.userId, "MEMBER");

    const ws = await createWorkspace(owner.accessToken, org.body.data._id, "Archivable Space");
    const workspaceId = ws.body.data._id;

    const archiveRes = await request(app)
      .patch(`/api/v1/workspaces/${workspaceId}/archive`)
      .set("Authorization", `Bearer ${owner.accessToken}`);
    expect(archiveRes.status).toBe(200);
    expect(archiveRes.body.data.status).toBe("ARCHIVED");

    const updateAfterArchive = await request(app)
      .patch(`/api/v1/workspaces/${workspaceId}`)
      .set("Authorization", `Bearer ${owner.accessToken}`)
      .send({ name: "Renamed" });
    expect(updateAfterArchive.status).toBe(403);

    const addMemberAfterArchive = await request(app)
      .post(`/api/v1/workspaces/${workspaceId}/members`)
      .set("Authorization", `Bearer ${owner.accessToken}`)
      .send({ userId: invitee.userId });
    expect(addMemberAfterArchive.status).toBe(403);

    const deleteRes = await request(app)
      .delete(`/api/v1/workspaces/${workspaceId}`)
      .set("Authorization", `Bearer ${owner.accessToken}`);
    expect(deleteRes.status).toBe(200);

    const getRes = await request(app)
      .get(`/api/v1/workspaces/${workspaceId}`)
      .set("Authorization", `Bearer ${owner.accessToken}`);
    expect(getRes.status).toBe(404);
  });

  it("returns 404 for a non-existent workspace and 403 for a non-member", async () => {
    const owner = await registerAndLogin();
    const outsider = await registerAndLogin();
    const org = await createOrg(owner.accessToken, "Visibility Co");
    const ws = await createWorkspace(owner.accessToken, org.body.data._id, "Private Space");

    const notFoundRes = await request(app)
      .get("/api/v1/workspaces/64f000000000000000000000")
      .set("Authorization", `Bearer ${owner.accessToken}`);
    expect(notFoundRes.status).toBe(404);

    const forbiddenRes = await request(app)
      .get(`/api/v1/workspaces/${ws.body.data._id}`)
      .set("Authorization", `Bearer ${outsider.accessToken}`);
    expect(forbiddenRes.status).toBe(403);
  });
});

describe("workspace members", () => {
  it("adds and removes a workspace member, rejecting non-org-members and duplicates", async () => {
    const owner = await registerAndLogin();
    const invitee = await registerAndLogin();
    const org = await createOrg(owner.accessToken, "Roster Co");
    const ws = await createWorkspace(owner.accessToken, org.body.data._id, "Roster Space");
    const workspaceId = ws.body.data._id;

    const addBeforeOrgMembership = await request(app)
      .post(`/api/v1/workspaces/${workspaceId}/members`)
      .set("Authorization", `Bearer ${owner.accessToken}`)
      .send({ userId: invitee.userId });
    expect(addBeforeOrgMembership.status).toBe(400);

    await addOrgMember(org.body.data._id, invitee.userId, "MEMBER");

    const addRes = await request(app)
      .post(`/api/v1/workspaces/${workspaceId}/members`)
      .set("Authorization", `Bearer ${owner.accessToken}`)
      .send({ userId: invitee.userId });
    expect(addRes.status).toBe(201);

    const duplicateRes = await request(app)
      .post(`/api/v1/workspaces/${workspaceId}/members`)
      .set("Authorization", `Bearer ${owner.accessToken}`)
      .send({ userId: invitee.userId });
    expect(duplicateRes.status).toBe(409);

    const listRes = await request(app)
      .get(`/api/v1/workspaces/${workspaceId}/members`)
      .set("Authorization", `Bearer ${owner.accessToken}`);
    expect(listRes.body.data).toHaveLength(2);

    const memberRecord = await WorkspaceMember.findOne({ workspaceId, userId: invitee.userId });

    const removeRes = await request(app)
      .delete(`/api/v1/workspaces/${workspaceId}/members/${memberRecord!._id.toString()}`)
      .set("Authorization", `Bearer ${owner.accessToken}`);
    expect(removeRes.status).toBe(200);

    const remaining = await WorkspaceMember.findById(memberRecord!._id);
    expect(remaining).toBeNull();
  });
});
