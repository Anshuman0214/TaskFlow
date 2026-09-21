import { Schema, model, Types } from "mongoose";
import { AssignableOrganizationRole, ASSIGNABLE_ORGANIZATION_ROLES } from "./organization.types.js";

export const INVITATION_STATUSES = ["PENDING", "ACCEPTED", "REJECTED", "EXPIRED"] as const;
export type InvitationStatus = (typeof INVITATION_STATUSES)[number];

export interface IInvitation {
  organizationId: Types.ObjectId;
  email: string;
  role: AssignableOrganizationRole;
  invitedBy: Types.ObjectId;
  tokenHash: string;
  status: InvitationStatus;
  expiresAt: Date;
  createdAt: Date;
}

const invitationSchema = new Schema<IInvitation>({
  organizationId: {
    type: Schema.Types.ObjectId,
    ref: "Organization",
    required: true,
  },
  email: { type: String, required: true, lowercase: true, trim: true },
  role: { type: String, enum: ASSIGNABLE_ORGANIZATION_ROLES, required: true },
  invitedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  tokenHash: { type: String, required: true, select: false },
  status: { type: String, enum: INVITATION_STATUSES, default: "PENDING" },
  expiresAt: { type: Date, required: true, index: { expires: 0 } },
  createdAt: { type: Date, default: () => new Date() },
});

invitationSchema.index({ organizationId: 1, email: 1, status: 1 });

export const Invitation = model<IInvitation>("Invitation", invitationSchema);
