import { Router } from "express";

import {
  createProductQuestionReply,
  createProductQuestion,
  getProductQuestionDetail,
  getProductQuestions,
} from "../controllers/product-question.controller.js";
import { authenticateToken, requireAdmin } from "../middlewares/auth.middleware.js";

const router = Router({ mergeParams: true });

router.get("/", getProductQuestions);
router.post("/", authenticateToken, createProductQuestion);
router.post("/:questionId/replies", authenticateToken, requireAdmin, createProductQuestionReply);
router.get("/:questionId", authenticateToken, getProductQuestionDetail);

export default router;
