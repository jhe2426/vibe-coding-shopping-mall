const AUTH_TOKEN_KEY = "strideToken";
const LEGACY_AUTH_USER_KEY = "strideUser";
export const AUTH_SESSION_CHANGE_EVENT = "stride-auth-session-change";

const notifyAuthSessionChange = () => {
  window.dispatchEvent(new Event(AUTH_SESSION_CHANGE_EVENT));
};

// 로그인 성공 시 서버에서 받은 JWT 토큰만 브라우저에 저장합니다.
export const saveAuthSession = ({ token }) => {
  localStorage.setItem(AUTH_TOKEN_KEY, token);
  localStorage.removeItem(LEGACY_AUTH_USER_KEY);
  notifyAuthSessionChange();
};

// 프론트에서 보관 중인 JWT 토큰을 조회합니다.
export const getAuthToken = () => {
  return localStorage.getItem(AUTH_TOKEN_KEY);
};

// 로그아웃 시 프론트에 저장된 JWT 토큰을 삭제합니다.
export const clearAuthSession = () => {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(LEGACY_AUTH_USER_KEY);
  notifyAuthSessionChange();
};

// 이후 보호 API를 호출할 때 Authorization 헤더로 토큰을 보낼 수 있게 준비합니다.
export const buildAuthHeaders = () => {
  const token = getAuthToken();

  if (!token) {
    return {};
  }

  return {
    Authorization: `Bearer ${token}`,
  };
};
