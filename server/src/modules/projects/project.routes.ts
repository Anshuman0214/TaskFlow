import { Router } from "express";
import { validateBody, validateQuery } from "../../middleware/validate.middleware.js";
import { requireAuth } from "../auth/auth.middleware.js";
import { requireWorkspaceRole } from "../workspaces/workspace.middleware.js";
import { requireProjectRole } from "./project.middleware.js";
import { createProjectSchema, listProjectsQuerySchema, updateProjectSchema } from "./project.validation.js";
import {
  createProjectController,
  deleteProjectController,
  getProjectController,
  listProjectsController,
  updateProjectController,
} from "./project.controller.js";

const router = Router({ mergeParams: true });

router.use(requireAuth);

router.post(
  "/",
  requireWorkspaceRole("OWNER", "ADMIN", "MANAGER"),
  validateBody(createProjectSchema),
  createProjectController,
);
router.get(
  "/",
  requireWorkspaceRole(),
  validateQuery(listProjectsQuerySchema),
  listProjectsController,
);

router.get("/:projectId", requireProjectRole(), getProjectController);
router.patch(
  "/:projectId",
  requireProjectRole("OWNER", "ADMIN", "MANAGER"),
  validateBody(updateProjectSchema),
  updateProjectController,
);
router.delete("/:projectId", requireProjectRole("OWNER", "ADMIN"), deleteProjectController);

export default router;
