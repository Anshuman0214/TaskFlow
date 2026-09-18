import { AppError } from "../../utils/AppError.js";
import { logger } from "../../utils/logger.js";
import { sendOrganizationInviteEmail } from "../../utils/mailer.js";
import { findUserByEmail } from "../users/user.repository.js";
import { createAuditLog } from "../audit/auditLog.repository.js";
import {
  createInvitation,
  findPendingInvitationByTokenHash,
  invalidatePendingInvitations,
  markInvitationAccepted,
} from "./invitation.repository.js";
import {
  createOrganization as createOrganizationRecord,
  deleteOrganizationHard,
  findOrganizationById,
  findOrganizationBySlug,
  findOrganizationsByIds,
  softDeleteOrganization,
  updateOrganizationFields,
} from "./organization.repository.js";
import {
  createMembership,
  deleteMembership,
  findMembership,
  findMembershipById,
  listMembersForOrganization,
  listMembershipsForUser,
  updateMembershipRole,
} from "./organizationMember.repository.js";
import { IOrganization } from "./organization.types.js";
import {
  AcceptInvitationInput,
  CreateOrganizationInput,
  InviteMemberInput,
  UpdateMemberRoleInput,
  UpdateOrganizationInput,
} from "./organization.validation.js";
import { generateRawToken, hashToken } from "../auth/token.util.js";

const INVITATION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

const slugify = (name: string): string =>
  name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const resolveUniqueSlug = async (name: string, requested?: string): Promise<string> => {
  const base = requested ?? slugify(name);
  let candidate = base;
  let suffix = 1;

  while (await findOrganizationBySlug(candidate)) {
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }

  return candidate;
};

export const createOrganization = async (
  userId: string,
  input: CreateOrganizationInput,
): Promise<IOrganization> => {
  const slug = await resolveUniqueSlug(input.name, input.slug);

  const organization = await createOrganizationRecord({
    name: input.name,
    slug,
    description: input.description ?? null,
    createdBy: userId,
    updatedBy: userId,
  });

  try {
    await createMembership(organization._id.toString(), userId, "OWNER");
  } catch (error) {
    // ponytail: no multi-document transaction here — this Atlas tier
    // doesn't support retryable-write transactions. Compensate manually
    // instead of leaving an ownerless organization behind.
    await deleteOrganizationHard(organization._id.toString());
    throw error;
  }

  await createAuditLog({
    organizationId: organization._id.toString(),
    actorId: userId,
    entityType: "Organization",
    entityId: organization._id.toString(),
    action: "ORGANIZATION_CREATED",
    newValue: { name: organization.name, slug: organization.slug },
  });

  return organization;
};

export const listUserOrganizations = async (userId: string) => {
  const memberships = await listMembershipsForUser(userId);
  const organizations = await findOrganizationsByIds(
    memberships.map((m) => m.organizationId.toString()),
  );
  const orgById = new Map(organizations.map((org) => [org._id.toString(), org]));

  return memberships.flatMap((m) => {
    const organization = orgById.get(m.organizationId.toString());
    return organization ? [{ organization, role: m.role }] : [];
  });
};

export const getOrganization = async (organizationId: string): Promise<IOrganization> => {
  const organization = await findOrganizationById(organizationId);

  if (!organization) {
    throw new AppError("Organization not found", 404, "RESOURCE_NOT_FOUND");
  }

  return organization;
};

export const updateOrganization = async (
  userId: string,
  organizationId: string,
  input: UpdateOrganizationInput,
): Promise<IOrganization> => {
  const organization = await updateOrganizationFields(organizationId, {
    ...input,
    updatedBy: userId,
  });

  if (!organization) {
    throw new AppError("Organization not found", 404, "RESOURCE_NOT_FOUND");
  }

  await createAuditLog({
    organizationId,
    actorId: userId,
    entityType: "Organization",
    entityId: organizationId,
    action: "ORGANIZATION_UPDATED",
    newValue: input,
  });

  return organization;
};

export const deleteOrganization = async (userId: string, organizationId: string): Promise<void> => {
  const organization = await softDeleteOrganization(organizationId, userId);

  if (!organization) {
    throw new AppError("Organization not found", 404, "RESOURCE_NOT_FOUND");
  }

  await createAuditLog({
    organizationId,
    actorId: userId,
    entityType: "Organization",
    entityId: organizationId,
    action: "ORGANIZATION_DELETED",
  });
};

export const listMembers = (organizationId: string) => listMembersForOrganization(organizationId);

export const inviteMember = async (
  actorId: string,
  organizationId: string,
  organizationName: string,
  input: InviteMemberInput,
): Promise<void> => {
  const existingUser = await findUserByEmail(input.email);

  if (existingUser) {
    const existingMembership = await findMembership(organizationId, existingUser._id.toString());

    if (existingMembership) {
      throw new AppError("User is already a member of this organization", 409, "DUPLICATE_RESOURCE");
    }
  }

  await invalidatePendingInvitations(organizationId, input.email);

  const rawToken = generateRawToken();
  await createInvitation({
    organizationId,
    email: input.email,
    role: input.role,
    invitedBy: actorId,
    tokenHash: hashToken(rawToken),
    expiresAt: new Date(Date.now() + INVITATION_TTL_MS),
  });

  sendOrganizationInviteEmail(input.email, organizationName, rawToken);

  await createAuditLog({
    organizationId,
    actorId,
    entityType: "Invitation",
    entityId: organizationId,
    action: "MEMBER_INVITED",
    newValue: { email: input.email, role: input.role },
  });

  logger.info("Organization event", { event: "MEMBER_INVITED", organizationId, email: input.email });
};

export const acceptInvitation = async (
  userId: string,
  userEmail: string,
  input: AcceptInvitationInput,
): Promise<void> => {
  const invitation = await findPendingInvitationByTokenHash(hashToken(input.token));

  if (!invitation || invitation.expiresAt.getTime() < Date.now()) {
    throw new AppError("Invalid or expired invitation", 400, "INVALID_TOKEN");
  }

  if (invitation.email !== userEmail.toLowerCase()) {
    throw new AppError("This invitation was not addressed to your account", 403, "FORBIDDEN");
  }

  const organizationId = invitation.organizationId.toString();
  const existingMembership = await findMembership(organizationId, userId);

  if (!existingMembership) {
    await createMembership(organizationId, userId, invitation.role);
  }

  await markInvitationAccepted(invitation._id.toString());
};

export const updateMemberRole = async (
  actorId: string,
  organizationId: string,
  memberId: string,
  input: UpdateMemberRoleInput,
): Promise<void> => {
  const member = await findMembershipById(organizationId, memberId);

  if (!member) {
    throw new AppError("Member not found", 404, "RESOURCE_NOT_FOUND");
  }

  if (member.role === "OWNER") {
    throw new AppError("The Owner's role cannot be changed", 403, "FORBIDDEN");
  }

  const previousRole = member.role;
  await updateMembershipRole(memberId, input.role);

  await createAuditLog({
    organizationId,
    actorId,
    entityType: "OrganizationMember",
    entityId: memberId,
    action: "MEMBER_ROLE_UPDATED",
    previousValue: { role: previousRole },
    newValue: { role: input.role },
  });
};

export const removeMember = async (
  actorId: string,
  organizationId: string,
  memberId: string,
): Promise<void> => {
  const member = await findMembershipById(organizationId, memberId);

  if (!member) {
    throw new AppError("Member not found", 404, "RESOURCE_NOT_FOUND");
  }

  if (member.role === "OWNER") {
    throw new AppError("The Owner cannot be removed", 403, "FORBIDDEN");
  }

  if (member.userId.toString() === actorId) {
    throw new AppError("You cannot remove yourself from the organization", 403, "FORBIDDEN");
  }

  await deleteMembership(memberId);

  await createAuditLog({
    organizationId,
    actorId,
    entityType: "OrganizationMember",
    entityId: memberId,
    action: "MEMBER_REMOVED",
  });
};
