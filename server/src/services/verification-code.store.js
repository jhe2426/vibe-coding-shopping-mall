import crypto from "crypto";

const verificationCodes = new Map();

const getTtlMs = () => Number(process.env.VERIFICATION_CODE_TTL_MS || 3 * 60 * 1000);
const getMaxAttempts = () => Number(process.env.VERIFICATION_CODE_MAX_ATTEMPTS || 5);
const getResendCooldownMs = () => Number(process.env.VERIFICATION_CODE_RESEND_COOLDOWN_MS || 60 * 1000);
const getHashSecret = () => process.env.VERIFICATION_CODE_SECRET || "local-verification-secret";

export const normalizePhoneNumber = (phoneNumber = "") => phoneNumber.replace(/\D/g, "");

export const isValidKoreanMobileNumber = (phoneNumber) => /^010\d{8}$/.test(normalizePhoneNumber(phoneNumber));

export const generateVerificationCode = () => crypto.randomInt(1000, 10000).toString();

const hashVerificationCode = (phoneNumber, code) =>
  crypto.createHash("sha256").update(`${normalizePhoneNumber(phoneNumber)}:${code}:${getHashSecret()}`).digest("hex");

const getRemainingSeconds = (targetTime) => Math.max(0, Math.ceil((targetTime - Date.now()) / 1000));

export const getResendWaitSeconds = (phoneNumber) => {
  const normalizedPhone = normalizePhoneNumber(phoneNumber);
  const savedCode = verificationCodes.get(normalizedPhone);

  if (!savedCode) {
    return 0;
  }

  const nextSendAt = savedCode.sentAt + getResendCooldownMs();

  if (Date.now() >= nextSendAt) {
    return 0;
  }

  return getRemainingSeconds(nextSendAt);
};

export const saveVerificationCode = (phoneNumber, code) => {
  const normalizedPhone = normalizePhoneNumber(phoneNumber);

  verificationCodes.set(normalizedPhone, {
    codeHash: hashVerificationCode(normalizedPhone, code),
    attempts: 0,
    sentAt: Date.now(),
    expiresAt: Date.now() + getTtlMs(),
  });
};

export const verifySavedCode = (phoneNumber, code) => {
  const normalizedPhone = normalizePhoneNumber(phoneNumber);
  const savedCode = verificationCodes.get(normalizedPhone);

  if (!savedCode) {
    return {
      ok: false,
      message: "인증번호를 먼저 요청해주세요.",
    };
  }

  if (Date.now() > savedCode.expiresAt) {
    verificationCodes.delete(normalizedPhone);

    return {
      ok: false,
      message: "인증번호가 만료되었습니다. 다시 요청해주세요.",
    };
  }

  if (savedCode.attempts >= getMaxAttempts()) {
    verificationCodes.delete(normalizedPhone);

    return {
      ok: false,
      message: "인증 시도 횟수를 초과했습니다. 다시 요청해주세요.",
    };
  }

  const inputCodeHash = hashVerificationCode(normalizedPhone, code);

  if (savedCode.codeHash !== inputCodeHash) {
    savedCode.attempts += 1;
    verificationCodes.set(normalizedPhone, savedCode);

    return {
      ok: false,
      message: "인증번호가 일치하지 않습니다.",
    };
  }

  verificationCodes.delete(normalizedPhone);

  return {
    ok: true,
    message: "인증이 완료되었습니다.",
  };
};

export const cleanupExpiredVerificationCodes = () => {
  const now = Date.now();

  verificationCodes.forEach((savedCode, phoneNumber) => {
    if (now > savedCode.expiresAt) {
      verificationCodes.delete(phoneNumber);
    }
  });
};
