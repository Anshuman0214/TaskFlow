import { apiClient } from "./client";
import type { ApiResponse } from "./types";

export type OrganizationRole = "OWNER" | "ADMIN" | "MANAGER" | "MEMBER" | "GUEST";
export type AssignableOrganizationRole = Exclude<OrganizationRole, "OWNER">;

export interface Organization {
  _id: string;
  name: string;
  slug: string;
  description: string | null;
  logo: string | null;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface OrganizationMembership {
  organization: Organization;
  role: OrganizationRole;
}

export interface OrganizationMember {
  _id: string;
  organizationId: string;
  userId: { _id: string; name: string; email: string };
  role: OrganizationRole;
  joinedAt: string;
}

export interface PendingInvitation {
  _id: string;
  organizationId: { _id: string; name: string; slug: string };
  email: string;
  role: AssignableOrganizationRole;
  status: string;
  expiresAt: string;
  createdAt: string;
}

export interface CreateOrganizationInput {
  name: string;
  slug?: string;
  description?: string;
}

export interface UpdateOrganizationInput {
  name?: string;
  description?: string | null;
  logo?: string | null;
}

export const listOrganizations = async (): Promise<OrganizationMembership[]> => {
  const res = await apiClient.get<ApiResponse<OrganizationMembership[]>>("/organizations");
  return res.data.data;
};

export const createOrganization = async (input: CreateOrganizationInput): Promise<Organization> => {
  const res = await apiClient.post<ApiResponse<Organization>>("/organizations", input);
  return res.data.data;
};

export const getOrganization = async (organizationId: string): Promise<Organization> => {
  const res = await apiClient.get<ApiResponse<Organization>>(`/organizations/${organizationId}`);
  return res.data.data;
};

export const updateOrganization = async (
  organizationId: string,
  input: UpdateOrganizationInput,
): Promise<Organization> => {
  const res = await apiClient.patch<ApiResponse<Organization>>(`/organizations/${organizationId}`, input);
  return res.data.data;
};

export const deleteOrganization = async (organizationId: string): Promise<void> => {
  await apiClient.delete(`/organizations/${organizationId}`);
};

export const listOrganizationMembers = async (organizationId: string): Promise<OrganizationMember[]> => {
  const res = await apiClient.get<ApiResponse<OrganizationMember[]>>(
    `/organizations/${organizationId}/members`,
  );
  return res.data.data;
};

export const inviteOrganizationMember = async (
  organizationId: string,
  input: { email: string; role: AssignableOrganizationRole },
): Promise<void> => {
  await apiClient.post(`/organizations/${organizationId}/members`, input);
};

export const updateOrganizationMemberRole = async (
  organizationId: string,
  memberId: string,
  role: AssignableOrganizationRole,
): Promise<void> => {
  await apiClient.patch(`/organizations/${organizationId}/members/${memberId}/role`, { role });
};

export const removeOrganizationMember = async (organizationId: string, memberId: string): Promise<void> => {
  await apiClient.delete(`/organizations/${organizationId}/members/${memberId}`);
};

export const acceptOrganizationInvitation = async (token: string): Promise<void> => {
  await apiClient.post("/organizations/invitations/accept", { token });
};

export const listPendingInvitations = async (): Promise<PendingInvitation[]> => {
  const res = await apiClient.get<ApiResponse<PendingInvitation[]>>("/organizations/invitations/pending");
  return res.data.data;
};

export const declineInvitation = async (invitationId: string): Promise<void> => {
  await apiClient.post(`/organizations/invitations/${invitationId}/decline`);
};
