import { Router } from "express";
import { validateBody } from "../../middleware/validate.middleware.js";
import { requireAuth } from "../auth/auth.middleware.js";
import { requireOrganizationRole } from "./organization.middleware.js";
import {
  acceptInvitationSchema,
  createOrganizationSchema,
  inviteMemberSchema,
  updateMemberRoleSchema,
  updateOrganizationSchema,
} from "./organization.validation.js";
import {
  acceptInvitationController,
  createOrganizationController,
  deleteOrganizationController,
  getOrganizationController,
  inviteMemberController,
  listMembersController,
  listOrganizationsController,
  removeMemberController,
  updateMemberRoleController,
  updateOrganizationController,
} from "./organization.controller.js";

const router = Router();

router.use(requireAuth);

router.post(
  "/invitations/accept",
  validateBody(acceptInvitationSchema),
  acceptInvitationController,
);

router.post("/", validateBody(createOrganizationSchema), createOrganizationController);
router.get("/", listOrganizationsController);

router.get("/:organizationId", requireOrganizationRole(), getOrganizationController);
router.patch(
  "/:organizationId",
  requireOrganizationRole("OWNER", "ADMIN"),
  validateBody(updateOrganizationSchema),
  updateOrganizationController,
);
router.delete("/:organizationId", requireOrganizationRole("OWNER"), deleteOrganizationController);

router.get(
  "/:organizationId/members",
  requireOrganizationRole(),
  listMembersController,
);
router.post(
  "/:organizationId/members",
  requireOrganizationRole("OWNER", "ADMIN"),
  validateBody(inviteMemberSchema),
  inviteMemberController,
);
router.patch(
  "/:organizationId/members/:memberId/role",
  requireOrganizationRole("OWNER", "ADMIN"),
  validateBody(updateMemberRoleSchema),
  updateMemberRoleController,
);
router.delete(
  "/:organizationId/members/:memberId",
  requireOrganizationRole("OWNER", "ADMIN"),
  removeMemberController,
);

export default router;
