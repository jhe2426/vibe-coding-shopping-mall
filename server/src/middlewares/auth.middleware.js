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
