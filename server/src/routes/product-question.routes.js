import { Router } from "express";

import {
  createProductQuestionReply,
  createProductQuestion,
  deleteProductQuestion,
  deleteProductQuestionReply,
  getProductQuestionDetail,
  getProductQuestions,
  updateProductQuestionReply,
} from "../controllers/product-question.controller.js";
import { authenticateOptionalToken, authenticateToken, requireAdmin } from "../middlewares/auth.middleware.js";

const router = Router({ mergeParams: true });

router.get("/", authenticateOptionalToken, getProductQuestions);
router.post("/", authenticateToken, createProductQuestion);
router.delete("/:questionId", authenticateToken, deleteProductQuestion);
router.post("/:questionId/replies", authenticateToken, requireAdmin, createProductQuestionReply);
router.patch("/:questionId/replies/:replyId", authenticateToken, requireAdmin, updateProductQuestionReply);
router.delete("/:questionId/replies/:replyId", authenticateToken, requireAdmin, deleteProductQuestionReply);
router.get("/:questionId", authenticateToken, getProductQuestionDetail);

export default router;
