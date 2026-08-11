import { Router } from "express";

import {
  createProduct,
  deleteProduct,
  getProduct,
  getProducts,
  updateProduct,
  updateProductStatuses,
} from "../controllers/product.controller.js";
import { authenticateToken, requireAdmin } from "../middlewares/auth.middleware.js";

const router = Router();

// 새 상품을 생성합니다.
router.post("/", authenticateToken, requireAdmin, createProduct);

// 전체 상품 목록을 조회합니다.
router.get("/", getProducts);

// 선택 상품의 판매 상태를 일괄 변경합니다.
router.patch("/bulk-status", authenticateToken, requireAdmin, updateProductStatuses);

// 특정 상품을 MongoDB _id 또는 productId로 조회합니다.
router.get("/:id", getProduct);

// 특정 상품 정보를 전체 수정합니다.
router.put("/:id", authenticateToken, requireAdmin, updateProduct);

// 특정 상품 정보를 일부 수정합니다.
router.patch("/:id", authenticateToken, requireAdmin, updateProduct);

// 특정 상품을 삭제합니다.
router.delete("/:id", authenticateToken, requireAdmin, deleteProduct);

export default router;
