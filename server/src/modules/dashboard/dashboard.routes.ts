import { Router } from "express";
import { validateQuery } from "../../middleware/validate.middleware.js";
import { requireAuth } from "../auth/auth.middleware.js";
import { requireOrganizationAccessFromQuery } from "../organizations/organization.middleware.js";
import { requireWorkspaceRole } from "../workspaces/workspace.middleware.js";
import { requireProjectRole } from "../projects/project.middleware.js";
import { organizationScopeQuerySchema } from "./dashboard.validation.js";
import {
  productivityController,
  projectDashboardController,
  summaryController,
  workspaceDashboardController,
} from "./dashboard.controller.js";

// Read-only module, per Docs/ApiSpecifications.md. Summary and productivity are
// personal (scoped to req.userId) so any org member may call them; the workspace
// and project dashboards borrow their resource's existing role check.
const router = Router();

router.use(requireAuth);

router.get(
  "/summary",
  validateQuery(organizationScopeQuerySchema),
  requireOrganizationAccessFromQuery(),
  summaryController,
);
router.get(
  "/productivity",
  validateQuery(organizationScopeQuerySchema),
  requireOrganizationAccessFromQuery(),
  productivityController,
);

router.get("/workspaces/:workspaceId", requireWorkspaceRole(), workspaceDashboardController);
router.get("/projects/:projectId", requireProjectRole(), projectDashboardController);

export default router;
