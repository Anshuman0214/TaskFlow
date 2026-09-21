import { describe, it, expect, afterAll, vi } from "vitest";
import request from "supertest";
import app from "../src/app.js";
import { User } from "../src/modules/users/user.model.js";
import { Organization } from "../src/modules/organizations/organization.model.js";
import { OrganizationMember } from "../src/modules/organizations/organizationMember.model.js";
import { Invitation } from "../src/modules/organizations/invitation.model.js";
import * as mailer from "../src/utils/mailer.js";

const STRONG_PASSWORD = "StrongPass1!";
const testEmails: string[] = [];
const testOrgIds: string[] = [];

const uniqueEmail = (): string => {
  const email = `org-test-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
  testEmails.push(email);
  return email;
};

const registerAndLogin = async (): Promise<{
  accessToken: string;
  userId: string;
  email: string;
  cookies: string[];
}> => {
  const email = uniqueEmail();

  await request(app)
    .post("/api/v1/auth/register")
    .send({ name: "Org Test User", email, password: STRONG_PASSWORD });

  const user = await User.findOneAndUpdate(
    { email },
    { isEmailVerified: true },
    { returnDocument: "after" },
  );

  const loginRes = await request(app)
    .post("/api/v1/auth/login")
    .send({ email, password: STRONG_PASSWORD });

  return {
    accessToken: loginRes.body.data.accessToken,
    userId: user!._id.toString(),
    email,
    cookies: loginRes.headers["set-cookie"] as unknown as string[],
  };
};

const createOrg = async (accessToken: string, name: string) => {
  const res = await request(app)
    .post("/api/v1/organizations")
    .set("Authorization", `Bearer ${accessToken}`)
    .send({ name });

  testOrgIds.push(res.body.data.id ?? res.body.data._id);
  return res;
};

afterAll(async () => {
  await User.deleteMany({ email: { $in: testEmails } });
  await OrganizationMember.deleteMany({ organizationId: { $in: testOrgIds } });
  await Invitation.deleteMany({ organizationId: { $in: testOrgIds } });
  await Organization.deleteMany({ _id: { $in: testOrgIds } });
});

describe("POST /api/v1/organizations", () => {
  it("creates an organization and makes the creator the OWNER", async () => {
    const owner = await registerAndLogin();
    const res = await createOrg(owner.accessToken, "Acme Corp");

    expect(res.status).toBe(201);
    expect(res.body.data.slug).toBe("acme-corp");

    const membership = await OrganizationMember.findOne({
      organizationId: res.body.data._id,
      userId: owner.userId,
    });
    expect(membership?.role).toBe("OWNER");
  });

  it("auto-suffixes the slug on a duplicate name", async () => {
    const owner = await registerAndLogin();
    const first = await createOrg(owner.accessToken, "Duplicate Name Co");
    const second = await createOrg(owner.accessToken, "Duplicate Name Co");

    expect(first.body.data.slug).toBe("duplicate-name-co");
    expect(second.body.data.slug).toBe("duplicate-name-co-1");
  });

  it("rejects an unauthenticated request", async () => {
    const res = await request(app).post("/api/v1/organizations").send({ name: "No Auth Co" });
    expect(res.status).toBe(401);
  });
});

describe("membership-gated access", () => {
  it("returns 403 for a non-member and 200 for the owner", async () => {
    const owner = await registerAndLogin();
    const outsider = await registerAndLogin();
    const org = await createOrg(owner.accessToken, "Gated Co");

    const asOwner = await request(app)
      .get(`/api/v1/organizations/${org.body.data._id}`)
      .set("Authorization", `Bearer ${owner.accessToken}`);
    expect(asOwner.status).toBe(200);

    const asOutsider = await request(app)
      .get(`/api/v1/organizations/${org.body.data._id}`)
      .set("Authorization", `Bearer ${outsider.accessToken}`);
    expect(asOutsider.status).toBe(403);
  });

  it("returns 404 for a non-existent organization", async () => {
    const owner = await registerAndLogin();
    const res = await request(app)
      .get("/api/v1/organizations/64f000000000000000000000")
      .set("Authorization", `Bearer ${owner.accessToken}`);
    expect(res.status).toBe(404);
  });
});

describe("PATCH/DELETE /api/v1/organizations/:organizationId", () => {
  it("lets the owner update the org and rejects deletion by a non-owner", async () => {
    const owner = await registerAndLogin();
    const org = await createOrg(owner.accessToken, "Editable Co");

    const updateRes = await request(app)
      .patch(`/api/v1/organizations/${org.body.data._id}`)
      .set("Authorization", `Bearer ${owner.accessToken}`)
      .send({ description: "Updated description" });
    expect(updateRes.status).toBe(200);
    expect(updateRes.body.data.description).toBe("Updated description");

    const outsider = await registerAndLogin();
    const deleteRes = await request(app)
      .delete(`/api/v1/organizations/${org.body.data._id}`)
      .set("Authorization", `Bearer ${outsider.accessToken}`);
    expect(deleteRes.status).toBe(403);
  });

  it("soft-deletes the org for the owner", async () => {
    const owner = await registerAndLogin();
    const org = await createOrg(owner.accessToken, "Deletable Co");

    const deleteRes = await request(app)
      .delete(`/api/v1/organizations/${org.body.data._id}`)
      .set("Authorization", `Bearer ${owner.accessToken}`);
    expect(deleteRes.status).toBe(200);

    const getRes = await request(app)
      .get(`/api/v1/organizations/${org.body.data._id}`)
      .set("Authorization", `Bearer ${owner.accessToken}`);
    expect(getRes.status).toBe(404);
  });
});

describe("invitations and membership management", () => {
  it("invites, accepts, updates role, and removes a member — enforcing owner protections", async () => {
    const owner = await registerAndLogin();
    const invitee = await registerAndLogin();
    const org = await createOrg(owner.accessToken, "Team Co");
    const organizationId = org.body.data._id;

    const inviteSpy = vi.spyOn(mailer, "sendOrganizationInviteEmail");

    const inviteRes = await request(app)
      .post(`/api/v1/organizations/${organizationId}/members`)
      .set("Authorization", `Bearer ${owner.accessToken}`)
      .send({ email: invitee.email, role: "MEMBER" });
    expect(inviteRes.status).toBe(201);

    const rawToken = inviteSpy.mock.calls.at(-1)?.[2];
    expect(rawToken).toBeTypeOf("string");

    const acceptRes = await request(app)
      .post("/api/v1/organizations/invitations/accept")
      .set("Authorization", `Bearer ${invitee.accessToken}`)
      .send({ token: rawToken });
    expect(acceptRes.status).toBe(200);

    const membersRes = await request(app)
      .get(`/api/v1/organizations/${organizationId}/members`)
      .set("Authorization", `Bearer ${owner.accessToken}`);
    expect(membersRes.body.data).toHaveLength(2);

    const memberRecord = await OrganizationMember.findOne({ organizationId, userId: invitee.userId });
    expect(memberRecord?.role).toBe("MEMBER");

    const roleUpdateRes = await request(app)
      .patch(`/api/v1/organizations/${organizationId}/members/${memberRecord!._id.toString()}/role`)
      .set("Authorization", `Bearer ${owner.accessToken}`)
      .send({ role: "ADMIN" });
    expect(roleUpdateRes.status).toBe(200);

    const ownerMembership = await OrganizationMember.findOne({ organizationId, userId: owner.userId });
    const ownerRoleUpdateRes = await request(app)
      .patch(`/api/v1/organizations/${organizationId}/members/${ownerMembership!._id.toString()}/role`)
      .set("Authorization", `Bearer ${owner.accessToken}`)
      .send({ role: "MEMBER" });
    expect(ownerRoleUpdateRes.status).toBe(403);

    const selfRemoveRes = await request(app)
      .delete(`/api/v1/organizations/${organizationId}/members/${ownerMembership!._id.toString()}`)
      .set("Authorization", `Bearer ${owner.accessToken}`);
    expect(selfRemoveRes.status).toBe(403);

    const removeRes = await request(app)
      .delete(`/api/v1/organizations/${organizationId}/members/${memberRecord!._id.toString()}`)
      .set("Authorization", `Bearer ${owner.accessToken}`);
    expect(removeRes.status).toBe(200);

    const remaining = await OrganizationMember.findById(memberRecord!._id);
    expect(remaining).toBeNull();
  });

  it("rejects an invite role of OWNER at the validation layer", async () => {
    const owner = await registerAndLogin();
    const org = await createOrg(owner.accessToken, "Strict Co");

    const res = await request(app)
      .post(`/api/v1/organizations/${org.body.data._id}/members`)
      .set("Authorization", `Bearer ${owner.accessToken}`)
      .send({ email: "someone@example.com", role: "OWNER" });

    expect(res.status).toBe(422);
  });
});

describe("pending invitations: list and decline", () => {
  it("lists a pending invitation for the invitee and lets them decline it", async () => {
    const owner = await registerAndLogin();
    const invitee = await registerAndLogin();
    const org = await createOrg(owner.accessToken, "Invite List Co");
    const organizationId = org.body.data._id;

    await request(app)
      .post(`/api/v1/organizations/${organizationId}/members`)
      .set("Authorization", `Bearer ${owner.accessToken}`)
      .send({ email: invitee.email, role: "MEMBER" });

    const listRes = await request(app)
      .get("/api/v1/organizations/invitations/pending")
      .set("Authorization", `Bearer ${invitee.accessToken}`);
    expect(listRes.status).toBe(200);
    expect(listRes.body.data).toHaveLength(1);

    const invitationId = listRes.body.data[0]._id;

    const declineRes = await request(app)
      .post(`/api/v1/organizations/invitations/${invitationId}/decline`)
      .set("Authorization", `Bearer ${invitee.accessToken}`);
    expect(declineRes.status).toBe(200);

    const afterDeclineList = await request(app)
      .get("/api/v1/organizations/invitations/pending")
      .set("Authorization", `Bearer ${invitee.accessToken}`);
    expect(afterDeclineList.body.data).toHaveLength(0);

    const invitation = await Invitation.findById(invitationId);
    expect(invitation?.status).toBe("REJECTED");
  });

  it("rejects declining an invitation addressed to someone else", async () => {
    const owner = await registerAndLogin();
    const invitee = await registerAndLogin();
    const outsider = await registerAndLogin();
    const org = await createOrg(owner.accessToken, "Invite Guard Co");
    const organizationId = org.body.data._id;

    await request(app)
      .post(`/api/v1/organizations/${organizationId}/members`)
      .set("Authorization", `Bearer ${owner.accessToken}`)
      .send({ email: invitee.email, role: "MEMBER" });

    const invitation = await Invitation.findOne({ organizationId, email: invitee.email });

    const res = await request(app)
      .post(`/api/v1/organizations/invitations/${invitation!._id.toString()}/decline`)
      .set("Authorization", `Bearer ${outsider.accessToken}`);
    expect(res.status).toBe(403);
  });
});

describe("organization deletion revokes sessions with no remaining org access", () => {
  it("revokes a session whose only accessed organization was deleted", async () => {
    const owner = await registerAndLogin();
    const org = await createOrg(owner.accessToken, "Solo Access Co");
    const organizationId = org.body.data._id;

    // Touch the org so this login session gets tracked against it.
    await request(app)
      .get(`/api/v1/organizations/${organizationId}`)
      .set("Authorization", `Bearer ${owner.accessToken}`);

    const deleteRes = await request(app)
      .delete(`/api/v1/organizations/${organizationId}`)
      .set("Authorization", `Bearer ${owner.accessToken}`);
    expect(deleteRes.status).toBe(200);

    const refreshRes = await request(app).post("/api/v1/auth/refresh").set("Cookie", owner.cookies);
    expect(refreshRes.status).toBe(401);
  });

  it("keeps a session alive when the member still belongs to another organization", async () => {
    const owner = await registerAndLogin();
    const orgA = await createOrg(owner.accessToken, "Multi Access A");
    const orgB = await createOrg(owner.accessToken, "Multi Access B");

    await request(app)
      .get(`/api/v1/organizations/${orgA.body.data._id}`)
      .set("Authorization", `Bearer ${owner.accessToken}`);
    await request(app)
      .get(`/api/v1/organizations/${orgB.body.data._id}`)
      .set("Authorization", `Bearer ${owner.accessToken}`);

    const deleteRes = await request(app)
      .delete(`/api/v1/organizations/${orgA.body.data._id}`)
      .set("Authorization", `Bearer ${owner.accessToken}`);
    expect(deleteRes.status).toBe(200);

    const refreshRes = await request(app).post("/api/v1/auth/refresh").set("Cookie", owner.cookies);
    expect(refreshRes.status).toBe(200);
  });
});
