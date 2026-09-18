import { Types } from "mongoose";

export const ORGANIZATION_ROLES = ["OWNER", "ADMIN", "MANAGER", "MEMBER", "GUEST"] as const;
export type OrganizationRole = (typeof ORGANIZATION_ROLES)[number];

// Roles assignable through the member-management endpoints. OWNER is
// granted only at organization creation and can never be assigned or
// removed through these endpoints — every org must always have exactly one.
export const ASSIGNABLE_ORGANIZATION_ROLES = ["ADMIN", "MANAGER", "MEMBER", "GUEST"] as const;
export type AssignableOrganizationRole = (typeof ASSIGNABLE_ORGANIZATION_ROLES)[number];

export interface IOrganization {
  name: string;
  slug: string;
  description: string | null;
  logo: string | null;
  isDeleted: boolean;
  deletedAt: Date | null;
  deletedBy: Types.ObjectId | null;
  createdBy: Types.ObjectId;
  updatedBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}
