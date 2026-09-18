import { Types } from "mongoose";
import { OrganizationMember } from "./organizationMember.model.js";
import { OrganizationRole } from "./organization.types.js";

export const createMembership = (organizationId: string, userId: string, role: OrganizationRole) =>
  OrganizationMember.create({
    organizationId: new Types.ObjectId(organizationId),
    userId: new Types.ObjectId(userId),
    role,
  });

export const findMembership = (organizationId: string, userId: string) =>
  OrganizationMember.findOne({ organizationId, userId });

export const findMembershipById = (organizationId: string, memberId: string) =>
  OrganizationMember.findOne({ _id: memberId, organizationId });

export const listMembersForOrganization = (organizationId: string) =>
  OrganizationMember.find({ organizationId }).populate("userId", "name email");

export const listMembershipsForUser = (userId: string) =>
  OrganizationMember.find({ userId });

export const updateMembershipRole = (memberId: string, role: OrganizationRole) =>
  OrganizationMember.findByIdAndUpdate(memberId, { role }, { returnDocument: "after" });

export const deleteMembership = (memberId: string) =>
  OrganizationMember.findByIdAndDelete(memberId);
