import { buildAuthHeaders } from "../utils/auth-storage.js";

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "/api";

const parseJsonResponse = async (response) => {
  try {
    return await response.json();
  } catch {
    return {};
  }
};

// 프론트에 저장된 JWT 토큰으로 현재 로그인한 유저 정보를 서버에서 조회합니다.
export const fetchMyProfile = async () => {
  const response = await fetch(`${apiBaseUrl}/auth/me`, {
    headers: {
      ...buildAuthHeaders(),
    },
  });
  const data = await parseJsonResponse(response);

  if (!response.ok) {
    throw new Error(data.message || "유저 정보를 불러오지 못했습니다.");
  }

  return data.user;
};
