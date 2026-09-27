import { Router } from "express";
import { validateBody, validateQuery } from "../../middleware/validate.middleware.js";
import { requireAuth } from "../auth/auth.middleware.js";
import { requireTaskRole } from "../tasks/task.middleware.js";
import { uploadSingleFile } from "./upload.middleware.js";
import {
  createCommentSchema,
  paginationQuerySchema,
  updateCommentSchema,
} from "./collaboration.validation.js";
import {
  createCommentController,
  deleteAttachmentController,
  deleteCommentController,
  listActivitiesController,
  listAttachmentsController,
  listCommentsController,
  updateCommentController,
  uploadAttachmentController,
} from "./collaboration.controller.js";

// Mounted at /api/v1/tasks/:taskId per Docs/ApiSpecifications.md Part 5 —
// note the task module itself lives under /projects/:projectId/tasks, but
// requireTaskRole only cross-checks :projectId when the URL carries one.
const router = Router({ mergeParams: true });

router.use(requireAuth);

const WRITE_ROLES = ["OWNER", "ADMIN", "MANAGER", "MEMBER"] as const;

router.post(
  "/comments",
  requireTaskRole(...WRITE_ROLES),
  validateBody(createCommentSchema),
  createCommentController,
);
router.get(
  "/comments",
  requireTaskRole(),
  validateQuery(paginationQuerySchema),
  listCommentsController,
);
// Author-or-admin is enforced in the service (it needs the comment itself),
// so the route only gates on "can write at all".
router.patch(
  "/comments/:commentId",
  requireTaskRole(...WRITE_ROLES),
  validateBody(updateCommentSchema),
  updateCommentController,
);
router.delete("/comments/:commentId", requireTaskRole(...WRITE_ROLES), deleteCommentController);

router.post(
  "/attachments",
  requireTaskRole(...WRITE_ROLES),
  uploadSingleFile,
  uploadAttachmentController,
);
router.get("/attachments", requireTaskRole(), listAttachmentsController);
router.delete(
  "/attachments/:attachmentId",
  requireTaskRole("OWNER", "ADMIN", "MANAGER"),
  deleteAttachmentController,
);

router.get(
  "/activities",
  requireTaskRole(),
  validateQuery(paginationQuerySchema),
  listActivitiesController,
);

export default router;
