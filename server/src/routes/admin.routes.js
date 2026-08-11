import { Router } from "express";

import { getAdminDashboard } from "../controllers/admin-dashboard.controller.js";
import { getAdminMembers } from "../controllers/admin-member.controller.js";
import {
  cancelAdminOrder,
  getAdminOrder,
  getAdminOrders,
  updateAdminOrderMemo,
  updateAdminOrderStatus,
} from "../controllers/admin-order.controller.js";
import { authenticateToken, requireAdmin } from "../middlewares/auth.middleware.js";

const router = Router();

router.use(authenticateToken, requireAdmin);
router.get("/dashboard", getAdminDashboard);
router.get("/members", getAdminMembers);
router.get("/orders", getAdminOrders);
router.get("/orders/:orderId", getAdminOrder);
router.patch("/orders/:orderId/status", updateAdminOrderStatus);
router.patch("/orders/:orderId/memo", updateAdminOrderMemo);
router.post("/orders/:orderId/cancel", cancelAdminOrder);

export default router;
