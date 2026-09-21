import { Router } from "express";
import { validateBody } from "../../middleware/validate.middleware.js";
import { requireAuth } from "../auth/auth.middleware.js";
import { requireProjectRole } from "./project.middleware.js";
import { createLabelSchema, updateLabelSchema } from "./label.validation.js";
import {
  createLabelController,
  deleteLabelController,
  listLabelsController,
  updateLabelController,
} from "./label.controller.js";

const router = Router({ mergeParams: true });

router.use(requireAuth);

router.post(
  "/",
  requireProjectRole("OWNER", "ADMIN", "MANAGER"),
  validateBody(createLabelSchema),
  createLabelController,
);
router.get("/", requireProjectRole(), listLabelsController);
router.patch(
  "/:labelId",
  requireProjectRole("OWNER", "ADMIN", "MANAGER"),
  validateBody(updateLabelSchema),
  updateLabelController,
);
router.delete("/:labelId", requireProjectRole("OWNER", "ADMIN", "MANAGER"), deleteLabelController);

export default router;
