import { Router } from "express";

import {
  createProduct,
  deleteProduct,
  getProduct,
  getProducts,
  updateProduct,
} from "../controllers/product.controller.js";

const router = Router();

// 새 상품을 생성합니다.
router.post("/", createProduct);

// 전체 상품 목록을 조회합니다.
router.get("/", getProducts);

// 특정 상품을 MongoDB _id 또는 productId로 조회합니다.
router.get("/:id", getProduct);

// 특정 상품 정보를 전체 수정합니다.
router.put("/:id", updateProduct);

// 특정 상품 정보를 일부 수정합니다.
router.patch("/:id", updateProduct);

// 특정 상품을 삭제합니다.
router.delete("/:id", deleteProduct);

export default router;
