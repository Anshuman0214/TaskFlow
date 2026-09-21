import { Router } from "express";
import { validateBody } from "../../middleware/validate.middleware.js";
import { requireAuth } from "../auth/auth.middleware.js";
import {
  requireOrganizationAccessForWorkspaceCreate,
  requireOrganizationAccessForWorkspaceList,
  requireWorkspaceRole,
} from "./workspace.middleware.js";
import {
  addWorkspaceMemberSchema,
  createWorkspaceSchema,
  updateWorkspaceSchema,
} from "./workspace.validation.js";
import {
  addWorkspaceMemberController,
  archiveWorkspaceController,
  createWorkspaceController,
  deleteWorkspaceController,
  getWorkspaceController,
  listWorkspaceMembersController,
  listWorkspacesController,
  removeWorkspaceMemberController,
  updateWorkspaceController,
} from "./workspace.controller.js";

const router = Router();

router.use(requireAuth);

router.post(
  "/",
  requireOrganizationAccessForWorkspaceCreate("OWNER", "ADMIN", "MANAGER"),
  validateBody(createWorkspaceSchema),
  createWorkspaceController,
);
router.get("/", requireOrganizationAccessForWorkspaceList(), listWorkspacesController);

router.get("/:workspaceId", requireWorkspaceRole(), getWorkspaceController);
router.patch(
  "/:workspaceId",
  requireWorkspaceRole("OWNER", "ADMIN", "MANAGER"),
  validateBody(updateWorkspaceSchema),
  updateWorkspaceController,
);
router.patch(
  "/:workspaceId/archive",
  requireWorkspaceRole("OWNER", "ADMIN"),
  archiveWorkspaceController,
);
router.delete("/:workspaceId", requireWorkspaceRole("OWNER", "ADMIN"), deleteWorkspaceController);

router.get(
  "/:workspaceId/members",
  requireWorkspaceRole(),
  listWorkspaceMembersController,
);
router.post(
  "/:workspaceId/members",
  requireWorkspaceRole("OWNER", "ADMIN", "MANAGER"),
  validateBody(addWorkspaceMemberSchema),
  addWorkspaceMemberController,
);
router.delete(
  "/:workspaceId/members/:memberId",
  requireWorkspaceRole("OWNER", "ADMIN", "MANAGER"),
  removeWorkspaceMemberController,
);

export default router;
