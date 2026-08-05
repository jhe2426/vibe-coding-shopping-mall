import { Router } from "express";

import { sendVerificationCode, verifyVerificationCode } from "../controllers/auth.controller.js";

const router = Router();

// 휴대폰 번호로 SMS 인증번호를 전송합니다.
router.post("/send-verification-code", sendVerificationCode);

// 사용자가 입력한 SMS 인증번호가 유효한지 검증합니다.
router.post("/verify-verification-code", verifyVerificationCode);

export default router;
