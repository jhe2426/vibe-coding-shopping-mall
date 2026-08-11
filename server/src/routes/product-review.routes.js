import { Router } from "express";

import {
  createProductReview,
  getMyProductReviews,
  getProductReviews,
} from "../controllers/product-review.controller.js";
import { authenticateToken } from "../middlewares/auth.middleware.js";

const router = Router();

router.get("/products/:productId", getProductReviews);
router.get("/mine", authenticateToken, getMyProductReviews);
router.post("/", authenticateToken, createProductReview);

export default router;
