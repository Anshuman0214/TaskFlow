import { Request, Response, NextFunction } from "express";
import { sendSuccessResponse } from "../../utils/apiResponse.js";
import { AuthedRequest } from "../auth/auth.middleware.js";
import { getCurrentUser } from "../auth/auth.service.js";
import {
  acceptInvitation,
  createOrganization,
  declineInvitation,
  deleteOrganization,
  getOrganization,
  inviteMember,
  listMembers,
  listPendingInvitations,
  listUserOrganizations,
  removeMember,
  updateMemberRole,
  updateOrganization,
} from "./organization.service.js";

export const createOrganizationController = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const organization = await createOrganization((req as AuthedRequest).userId, req.body);

    sendSuccessResponse({
      res,
      statusCode: 201,
      message: "Organization created successfully.",
      data: organization,
    });
  } catch (error) {
    next(error);
  }
};

export const listOrganizationsController = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const organizations = await listUserOrganizations((req as AuthedRequest).userId);

    sendSuccessResponse({
      res,
      statusCode: 200,
      message: "Organizations retrieved successfully.",
      data: organizations,
    });
  } catch (error) {
    next(error);
  }
};

export const getOrganizationController = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const organization = await getOrganization(req.params.organizationId as string);

    sendSuccessResponse({
      res,
      statusCode: 200,
      message: "Organization retrieved successfully.",
      data: organization,
    });
  } catch (error) {
    next(error);
  }
};

export const updateOrganizationController = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const organization = await updateOrganization(
      (req as AuthedRequest).userId,
      req.params.organizationId as string,
      req.body,
    );

    sendSuccessResponse({
      res,
      statusCode: 200,
      message: "Organization updated successfully.",
      data: organization,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteOrganizationController = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    await deleteOrganization((req as AuthedRequest).userId, req.params.organizationId as string);

    sendSuccessResponse({
      res,
      statusCode: 200,
      message: "Organization deleted successfully.",
    });
  } catch (error) {
    next(error);
  }
};

export const listMembersController = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const members = await listMembers(req.params.organizationId as string);

    sendSuccessResponse({
      res,
      statusCode: 200,
      message: "Members retrieved successfully.",
      data: members,
    });
  } catch (error) {
    next(error);
  }
};

export const inviteMemberController = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const organization = await getOrganization(req.params.organizationId as string);
    await inviteMember(
      (req as AuthedRequest).userId,
      req.params.organizationId as string,
      organization.name,
      req.body,
    );

    sendSuccessResponse({
      res,
      statusCode: 201,
      message: "Invitation sent successfully.",
    });
  } catch (error) {
    next(error);
  }
};

export const acceptInvitationController = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = (req as AuthedRequest).userId;
    const currentUser = await getCurrentUser(userId);
    await acceptInvitation(userId, currentUser.email, req.body);

    sendSuccessResponse({
      res,
      statusCode: 200,
      message: "Invitation accepted successfully.",
    });
  } catch (error) {
    next(error);
  }
};

export const listPendingInvitationsController = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const currentUser = await getCurrentUser((req as AuthedRequest).userId);
    const invitations = await listPendingInvitations(currentUser.email);

    sendSuccessResponse({
      res,
      statusCode: 200,
      message: "Pending invitations retrieved successfully.",
      data: invitations,
    });
  } catch (error) {
    next(error);
  }
};

export const declineInvitationController = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const currentUser = await getCurrentUser((req as AuthedRequest).userId);
    await declineInvitation(currentUser.email, req.params.invitationId as string);

    sendSuccessResponse({
      res,
      statusCode: 200,
      message: "Invitation declined.",
    });
  } catch (error) {
    next(error);
  }
};

export const updateMemberRoleController = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    await updateMemberRole(
      (req as AuthedRequest).userId,
      req.params.organizationId as string,
      req.params.memberId as string,
      req.body,
    );

    sendSuccessResponse({
      res,
      statusCode: 200,
      message: "Member role updated successfully.",
    });
  } catch (error) {
    next(error);
  }
};

export const removeMemberController = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    await removeMember(
      (req as AuthedRequest).userId,
      req.params.organizationId as string,
      req.params.memberId as string,
    );

    sendSuccessResponse({
      res,
      statusCode: 200,
      message: "Member removed successfully.",
    });
  } catch (error) {
    next(error);
  }
};
