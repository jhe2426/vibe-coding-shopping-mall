import { Router } from "express";

import {
  completeOrderPayment,
  cancelOrder,
  createOrder,
  deleteOrder,
  getOrder,
  getOrders,
  handlePortOnePaymentWebhook,
  updateOrder,
} from "../controllers/order.controller.js";
import { authenticateToken } from "../middlewares/auth.middleware.js";

const router = Router();

router.post("/payment-webhook", handlePortOnePaymentWebhook);
router.use(authenticateToken);
router.get("/", getOrders);
router.post("/", createOrder);
router.post("/payment-complete", completeOrderPayment);
router.post("/:orderId/cancel", cancelOrder);
router.get("/:orderId", getOrder);
router.patch("/:orderId", updateOrder);
router.delete("/:orderId", deleteOrder);

export default router;
