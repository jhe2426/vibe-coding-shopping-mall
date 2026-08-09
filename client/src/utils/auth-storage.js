const AUTH_TOKEN_KEY = "strideToken";
const LEGACY_AUTH_USER_KEY = "strideUser";
export const AUTH_SESSION_CHANGE_EVENT = "stride-auth-session-change";
const AUTH_TOKEN_MAX_AGE_SECONDS = 60 * 60 * 24;

const getCookieAttributes = (maxAge) => {
  const secureAttribute = window.location.protocol === "https:" ? "; Secure" : "";
  return `Path=/; Max-Age=${maxAge}; SameSite=Lax${secureAttribute}`;
};

const getCookieValue = (key) => {
  const cookiePrefix = `${encodeURIComponent(key)}=`;
  const cookie = document.cookie
    .split(";")
    .map((item) => item.trim())
    .find((item) => item.startsWith(cookiePrefix));

  return cookie ? decodeURIComponent(cookie.slice(cookiePrefix.length)) : null;
};

const notifyAuthSessionChange = () => {
  window.dispatchEvent(new Event(AUTH_SESSION_CHANGE_EVENT));
};

// 로그인 성공 시 서버에서 받은 JWT를 하루 동안 유지되는 쿠키에 저장합니다.
export const saveAuthSession = ({ token }) => {
  document.cookie = `${encodeURIComponent(AUTH_TOKEN_KEY)}=${encodeURIComponent(token)}; ${getCookieAttributes(AUTH_TOKEN_MAX_AGE_SECONDS)}`;
  // 이전 버전에서 localStorage에 남아 있을 수 있는 토큰을 로그인 시 정리합니다.
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(LEGACY_AUTH_USER_KEY);
  notifyAuthSessionChange();
};

// 브라우저 쿠키에 저장된 JWT 토큰을 조회합니다.
export const getAuthToken = () => {
  return getCookieValue(AUTH_TOKEN_KEY);
};

// 로그아웃 시 JWT 쿠키를 즉시 만료 처리합니다.
export const clearAuthSession = () => {
  document.cookie = `${encodeURIComponent(AUTH_TOKEN_KEY)}=; ${getCookieAttributes(0)}`;
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
