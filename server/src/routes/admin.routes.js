import { Router } from "express";

import { getAdminDashboard } from "../controllers/admin-dashboard.controller.js";
import { authenticateToken, requireAdmin } from "../middlewares/auth.middleware.js";

const router = Router();

router.use(authenticateToken, requireAdmin);
router.get("/dashboard", getAdminDashboard);

export default router;
