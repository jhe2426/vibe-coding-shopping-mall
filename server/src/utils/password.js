import bcrypt from "bcrypt";

const SALT_ROUNDS = 10;

// 회원 비밀번호는 원문을 저장하지 않고 bcrypt 해시 형태로 변환해서 저장합니다.
export const hashPassword = async (password) => {
  return bcrypt.hash(String(password), SALT_ROUNDS);
};

// 로그인 시 입력한 비밀번호와 DB에 저장된 bcrypt 해시가 일치하는지 확인합니다.
export const comparePassword = async (password, hashedPassword) => {
  return bcrypt.compare(String(password), String(hashedPassword || ""));
};
