import { Invitation } from "./invitation.model.js";
import { AssignableOrganizationRole } from "./organization.types.js";

interface CreateInvitationInput {
  organizationId: string;
  email: string;
  role: AssignableOrganizationRole;
  invitedBy: string;
  tokenHash: string;
  expiresAt: Date;
}

export const createInvitation = (input: CreateInvitationInput) => Invitation.create(input);

export const findPendingInvitationByTokenHash = (tokenHash: string) =>
  Invitation.findOne({ tokenHash, status: "PENDING" }).select("+tokenHash");

export const invalidatePendingInvitations = (organizationId: string, email: string) =>
  Invitation.updateMany(
    { organizationId, email, status: "PENDING" },
    { status: "EXPIRED" },
  );

export const markInvitationAccepted = (id: string) =>
  Invitation.findByIdAndUpdate(id, { status: "ACCEPTED" });

export const markInvitationRejected = (id: string) =>
  Invitation.findByIdAndUpdate(id, { status: "REJECTED" });

export const findInvitationById = (id: string) => Invitation.findById(id);

export const listPendingInvitationsForEmail = (email: string) =>
  Invitation.find({ email: email.toLowerCase(), status: "PENDING" }).populate(
    "organizationId",
    "name slug",
  );
