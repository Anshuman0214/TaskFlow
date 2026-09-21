import { Router } from "express";
import { validateBody, validateQuery } from "../../middleware/validate.middleware.js";
import { requireAuth } from "../auth/auth.middleware.js";
import { requireProjectRole } from "../projects/project.middleware.js";
import { requireTaskRole } from "./task.middleware.js";
import { createTaskSchema, listTasksQuerySchema, updateTaskSchema } from "./task.validation.js";
import {
  createSubtaskController,
  createTaskController,
  deleteTaskController,
  getTaskController,
  listSubtasksController,
  listTasksController,
  updateTaskController,
} from "./task.controller.js";

const router = Router({ mergeParams: true });

router.use(requireAuth);

router.post(
  "/",
  requireProjectRole("OWNER", "ADMIN", "MANAGER", "MEMBER"),
  validateBody(createTaskSchema),
  createTaskController,
);
router.get(
  "/",
  requireProjectRole(),
  validateQuery(listTasksQuerySchema),
  listTasksController,
);

router.get("/:taskId", requireTaskRole(), getTaskController);
router.patch(
  "/:taskId",
  requireTaskRole("OWNER", "ADMIN", "MANAGER", "MEMBER"),
  validateBody(updateTaskSchema),
  updateTaskController,
);
router.delete("/:taskId", requireTaskRole("OWNER", "ADMIN", "MANAGER"), deleteTaskController);

router.get("/:taskId/subtasks", requireTaskRole(), listSubtasksController);
router.post(
  "/:taskId/subtasks",
  requireTaskRole("OWNER", "ADMIN", "MANAGER", "MEMBER"),
  validateBody(createTaskSchema),
  createSubtaskController,
);

export default router;
