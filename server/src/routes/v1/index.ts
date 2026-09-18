import { Router } from "express";
import { sendSuccessResponse } from "../../utils/apiResponse.js";
import systemRouter from "../../modules/system/system.routes.js";
import authRouter from "../../modules/auth/auth.routes.js";

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

export default router;