import { WorkspaceMember } from "./workspaceMember.model.js";

export const createWorkspaceMembership = (
  workspaceId: string,
  organizationId: string,
  userId: string,
  addedBy: string,
) => WorkspaceMember.create({ workspaceId, organizationId, userId, addedBy });

export const findWorkspaceMembership = (workspaceId: string, userId: string) =>
  WorkspaceMember.findOne({ workspaceId, userId });

export const findWorkspaceMembershipById = (workspaceId: string, memberId: string) =>
  WorkspaceMember.findOne({ _id: memberId, workspaceId });

export const listMembersForWorkspace = (workspaceId: string) =>
  WorkspaceMember.find({ workspaceId }).populate("userId", "name email");

export const deleteWorkspaceMembership = (memberId: string) =>
  WorkspaceMember.findByIdAndDelete(memberId);
