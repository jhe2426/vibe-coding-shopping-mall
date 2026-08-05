import bcrypt from "bcrypt";

const SALT_ROUNDS = 10;

// 회원 비밀번호는 원문을 저장하지 않고 bcrypt 해시 형태로 변환해서 저장합니다.
export const hashPassword = async (password) => {
  return bcrypt.hash(String(password), SALT_ROUNDS);
};
