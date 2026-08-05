import jwt from "jsonwebtoken";

import User from "../models/user.model.js";
import {
  cleanupExpiredVerificationCodes,
  generateVerificationCode,
  getResendWaitSeconds,
  isValidKoreanMobileNumber,
  normalizePhoneNumber,
  saveVerificationCode,
  verifySavedCode,
} from "../services/verification-code.store.js";
import { sendVerificationSms } from "../services/solapi.service.js";
import { comparePassword } from "../utils/password.js";

const invalidLoginMessage = "이메일 또는 비밀번호가 일치하지 않습니다.";

const buildLoginUserResponse = (user) => ({
  id: user._id,
  userId: user.userId,
  name: user.name,
  phoneNumber: user.phoneNumber,
  userType: user.userType,
  address: user.address,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

const getJwtConfig = () => ({
  secret: process.env.JWT_SECRET,
  expiresIn: process.env.JWT_EXPIRES_IN || "1d",
});

// 이메일과 비밀번호로 유저를 확인하고, 성공 시 JWT 토큰과 유저 정보를 반환합니다.
export const loginUser = async (req, res, next) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");

    if (!email || !password) {
      return res.status(400).json({
        message: "이메일과 비밀번호를 입력해주세요.",
      });
    }

    const user = await User.findOne({ userId: email }).select("+password");

    if (!user) {
      return res.status(401).json({
        message: invalidLoginMessage,
      });
    }

    const isPasswordMatched = await comparePassword(password, user.password);

    if (!isPasswordMatched) {
      return res.status(401).json({
        message: invalidLoginMessage,
      });
    }

    const { secret, expiresIn } = getJwtConfig();

    if (!secret) {
      return res.status(500).json({
        message: "JWT_SECRET이 설정되지 않았습니다.",
      });
    }

    const token = jwt.sign(
      {
        id: user._id.toString(),
        userId: user.userId,
        userType: user.userType,
      },
      secret,
      { expiresIn },
    );

    return res.status(200).json({
      message: "로그인에 성공했습니다.",
      token,
      accessToken: token,
      tokenType: "Bearer",
      expiresIn,
      user: buildLoginUserResponse(user),
    });
  } catch (error) {
    return next(error);
  }
};

// 검증된 JWT 토큰의 유저 id로 현재 로그인한 유저 정보를 조회합니다.
export const getMyProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.authUser.id);

    if (!user) {
      return res.status(404).json({
        message: "유저를 찾을 수 없습니다.",
      });
    }

    return res.status(200).json({
      user: buildLoginUserResponse(user),
    });
  } catch (error) {
    return next(error);
  }
};

// 입력받은 전화번호로 4자리 인증번호를 생성하고 Solapi 단건 SMS를 전송합니다.
export const sendVerificationCode = async (req, res, next) => {
  try {
    const phoneNumber = normalizePhoneNumber(req.body.phoneNumber);

    cleanupExpiredVerificationCodes();

    if (!isValidKoreanMobileNumber(phoneNumber)) {
      return res.status(400).json({
        message: "휴대폰 번호는 010으로 시작하는 11자리 숫자여야 합니다.",
      });
    }

    const waitSeconds = getResendWaitSeconds(phoneNumber);

    if (waitSeconds > 0) {
      return res.status(429).json({
        message: `${waitSeconds}초 후 다시 요청해주세요.`,
      });
    }

    const code = generateVerificationCode();

    await sendVerificationSms({
      to: phoneNumber,
      code,
    });

    saveVerificationCode(phoneNumber, code);

    return res.status(200).json({
      message: "인증번호를 전송했습니다.",
    });
  } catch (error) {
    return next(error);
  }
};

// 사용자가 입력한 인증번호가 서버에 저장된 인증번호와 일치하는지 확인합니다.
export const verifyVerificationCode = (req, res) => {
  const { phoneNumber, code } = req.body;

  if (!isValidKoreanMobileNumber(phoneNumber)) {
    return res.status(400).json({
      message: "휴대폰 번호는 010으로 시작하는 11자리 숫자여야 합니다.",
    });
  }

  if (!/^\d{4}$/.test(String(code || ""))) {
    return res.status(400).json({
      message: "인증번호 4자리를 입력해주세요.",
    });
  }

  const result = verifySavedCode(phoneNumber, code);

  if (!result.ok) {
    return res.status(400).json({
      message: result.message,
    });
  }

  return res.status(200).json({
    message: result.message,
  });
};
