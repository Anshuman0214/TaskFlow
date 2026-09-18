import { Schema, model, Types } from "mongoose";
import { ORGANIZATION_ROLES, OrganizationRole } from "./organization.types.js";

export interface IOrganizationMember {
  organizationId: Types.ObjectId;
  userId: Types.ObjectId;
  role: OrganizationRole;
  joinedAt: Date;
}

const organizationMemberSchema = new Schema<IOrganizationMember>({
  organizationId: {
    type: Schema.Types.ObjectId,
    ref: "Organization",
    required: true,
  },
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  role: { type: String, enum: ORGANIZATION_ROLES, required: true },
  joinedAt: { type: Date, default: () => new Date() },
});

organizationMemberSchema.index({ organizationId: 1, userId: 1 }, { unique: true });
organizationMemberSchema.index({ organizationId: 1, role: 1 });

export const OrganizationMember = model<IOrganizationMember>(
  "OrganizationMember",
  organizationMemberSchema,
);
