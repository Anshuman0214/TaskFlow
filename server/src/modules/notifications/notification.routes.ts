import { Router } from "express";
import { validateBody, validateQuery } from "../../middleware/validate.middleware.js";
import { requireAuth } from "../auth/auth.middleware.js";
import {
  listNotificationsQuerySchema,
  markNotificationSchema,
} from "./notification.validation.js";
import {
  deleteNotificationController,
  listNotificationsController,
  markAllReadController,
  markNotificationController,
} from "./notification.controller.js";

const router = Router();

// Every route is scoped to req.userId — no organization role check, because a
// notification belongs to a person, not to an org membership.
router.use(requireAuth);

router.get("/", validateQuery(listNotificationsQuerySchema), listNotificationsController);

// Must precede /:notificationId or "read-all" would be matched as an id.
router.patch("/read-all", markAllReadController);

router.patch(
  "/:notificationId",
  validateBody(markNotificationSchema),
  markNotificationController,
);
router.delete("/:notificationId", deleteNotificationController);

export default router;
