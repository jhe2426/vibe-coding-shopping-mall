import { Router } from "express";

import { getMyProfile, loginUser, sendVerificationCode, verifyVerificationCode } from "../controllers/auth.controller.js";
import { authenticateToken } from "../middlewares/auth.middleware.js";

const router = Router();

// 이메일과 비밀번호로 로그인하고 JWT 토큰을 발급합니다.
router.post("/login", loginUser);

// JWT 토큰으로 현재 로그인한 유저 정보를 조회합니다.
router.get("/me", authenticateToken, getMyProfile);

// 휴대폰 번호로 SMS 인증번호를 전송합니다.
router.post("/send-verification-code", sendVerificationCode);

// 사용자가 입력한 SMS 인증번호가 유효한지 검증합니다.
router.post("/verify-verification-code", verifyVerificationCode);

export default router;
