import { Router } from "express";
import { validateQuery } from "../../middleware/validate.middleware.js";
import { requireAuth } from "../auth/auth.middleware.js";
import { requireOrganizationAccessFromQuery } from "../organizations/organization.middleware.js";
import {
  globalSearchQuerySchema,
  projectSearchQuerySchema,
  taskSearchQuerySchema,
} from "./search.validation.js";
import {
  globalSearchController,
  projectSearchController,
  taskSearchController,
} from "./search.controller.js";

// Read-only. validateQuery runs first so a missing organizationId is a 422;
// requireOrganizationAccessFromQuery then proves the caller belongs to that org
// before any query is built — search never crosses a tenant boundary.
const router = Router();

router.use(requireAuth);

router.get(
  "/",
  validateQuery(globalSearchQuerySchema),
  requireOrganizationAccessFromQuery(),
  globalSearchController,
);
router.get(
  "/tasks",
  validateQuery(taskSearchQuerySchema),
  requireOrganizationAccessFromQuery(),
  taskSearchController,
);
router.get(
  "/projects",
  validateQuery(projectSearchQuerySchema),
  requireOrganizationAccessFromQuery(),
  projectSearchController,
);

export default router;
