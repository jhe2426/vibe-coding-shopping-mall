import { Router } from "express";

import {
  createProductQuestionReply,
  createProductQuestion,
  getProductQuestionDetail,
  getProductQuestions,
} from "../controllers/product-question.controller.js";
import { authenticateToken } from "../middlewares/auth.middleware.js";

const router = Router({ mergeParams: true });

router.get("/", getProductQuestions);
router.post("/", authenticateToken, createProductQuestion);
router.post("/:questionId/replies", authenticateToken, createProductQuestionReply);
router.get("/:questionId", authenticateToken, getProductQuestionDetail);

export default router;
