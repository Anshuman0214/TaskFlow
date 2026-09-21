import { Router } from "express";
import { sendSuccessResponse } from "../../utils/apiResponse.js";
import systemRouter from "../../modules/system/system.routes.js";
import authRouter from "../../modules/auth/auth.routes.js";
import organizationRouter from "../../modules/organizations/organization.routes.js";
import workspaceRouter from "../../modules/workspaces/workspace.routes.js";
import projectRouter from "../../modules/projects/project.routes.js";
import labelRouter from "../../modules/projects/label.routes.js";
import taskRouter from "../../modules/tasks/task.routes.js";

const router = Router();

router.get("/", (_req, res) => {
  sendSuccessResponse({
    res,
    statusCode: 200,
    message: "TaskFlow API v1 is running",
    data: {
      version: "v1",
    },
  });
});

router.use("/system", systemRouter);
router.use("/auth", authRouter);
router.use("/organizations", organizationRouter);
router.use("/workspaces", workspaceRouter);
router.use("/organizations/:organizationId/workspaces/:workspaceId/projects", projectRouter);
router.use("/projects/:projectId/labels", labelRouter);
router.use("/projects/:projectId/tasks", taskRouter);

export default router;