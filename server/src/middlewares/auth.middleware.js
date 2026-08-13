import jwt from "jsonwebtoken";

// Authorization 헤더의 Bearer 토큰을 검증하고, 토큰 payload를 req.authUser에 담습니다.
export const authenticateToken = (req, res, next) => {
  const authorizationHeader = req.headers.authorization || "";
  const [tokenType, token] = authorizationHeader.split(" ");

  if (tokenType !== "Bearer" || !token) {
    return res.status(401).json({
      message: "로그인이 필요합니다.",
    });
  }

  if (!process.env.JWT_SECRET) {
    return res.status(500).json({
      message: "JWT_SECRET이 설정되지 않았습니다.",
    });
  }

  try {
    req.authUser = jwt.verify(token, process.env.JWT_SECRET);
    return next();
  } catch {
    return res.status(401).json({
      message: "유효하지 않거나 만료된 토큰입니다.",
    });
  }
};

// 공개 API에서도 로그인 사용자를 식별해야 할 때 사용합니다.
export const authenticateOptionalToken = (req, _res, next) => {
  const authorizationHeader = req.headers.authorization || "";
  const [tokenType, token] = authorizationHeader.split(" ");

  if (tokenType !== "Bearer" || !token || !process.env.JWT_SECRET) {
    return next();
  }

  try {
    req.authUser = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    // 공개 조회는 만료된 토큰이 있어도 익명 사용자로 처리합니다.
  }

  return next();
};

// 관리자 전용 조회/관리 API에서 일반 사용자의 접근을 막습니다.
export const requireAdmin = (req, res, next) => {
  if (req.authUser?.userType !== "admin") {
    return res.status(403).json({
      message: "관리자 권한이 필요합니다.",
    });
  }

  return next();
};
