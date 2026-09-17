import { Router } from "express";
import { healthController, infoController } from "./system.controller.js";

const router = Router();

router.get("/health", healthController);
router.get("/info", infoController);

export default router;
