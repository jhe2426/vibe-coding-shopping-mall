import { Router } from "express";

import {
  createProductLike,
  deleteProductLike,
  getProductLike,
  getProductLikes,
  updateProductLike,
} from "../controllers/product-like.controller.js";
import { authenticateToken } from "../middlewares/auth.middleware.js";

const router = Router();

router.use(authenticateToken);
router.get("/", getProductLikes);
router.post("/", createProductLike);
router.get("/:productId", getProductLike);
router.put("/:productId", updateProductLike);
router.delete("/:productId", deleteProductLike);

export default router;
