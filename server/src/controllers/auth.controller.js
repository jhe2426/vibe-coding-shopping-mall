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
