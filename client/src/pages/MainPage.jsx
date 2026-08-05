import { useEffect, useState } from "react";
import { fetchMyProfile } from "../api/auth.js";
import SiteHeader from "../components/SiteHeader.jsx";
import { AUTH_SESSION_CHANGE_EVENT, clearAuthSession, getAuthToken } from "../utils/auth-storage.js";

function MainPage() {
  const [profile, setProfile] = useState(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(() => Boolean(getAuthToken()));

  // 헤더에서 로그아웃하면 메인 페이지에 남아 있던 유저 정보를 즉시 제거합니다.
  useEffect(() => {
    const handleAuthSessionChange = () => {
      if (!getAuthToken()) {
        setProfile(null);
        setIsCheckingAuth(false);
      }
    };

    window.addEventListener(AUTH_SESSION_CHANGE_EVENT, handleAuthSessionChange);

    return () => {
      window.removeEventListener(AUTH_SESSION_CHANGE_EVENT, handleAuthSessionChange);
    };
  }, []);

  // 저장된 JWT 토큰이 있으면 서버에서 현재 로그인한 유저 정보를 조회합니다.
  useEffect(() => {
    const savedToken = getAuthToken();

    if (!savedToken) {
      return undefined;
    }

    let isMounted = true;

    const loadMyProfile = async () => {
      try {
        const user = await fetchMyProfile();

        if (isMounted) {
          setProfile(user);
        }
      } catch {
        clearAuthSession();

        if (isMounted) {
          setProfile(null);
        }
      } finally {
        if (isMounted) {
          setIsCheckingAuth(false);
        }
      }
    };

    loadMyProfile();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="home-page">
      {/* 메인 페이지 공통 헤더 */}
      <SiteHeader />

      {/* 추후 메인 디자인을 받으면 이 영역만 교체하면 됩니다. */}
      <main className="home-main">
        <section className="home-intro" aria-labelledby="home-title">
          <p className="eyebrow">EVERY STEP, YOUR STRIDE</p>
          <h1 id="home-title">STRIDE 쇼핑몰 메인 페이지</h1>
          <p>
            {isCheckingAuth
              ? "로그인 정보를 확인하는 중입니다."
              : profile
                ? `${profile.name}님 반갑습니다.`
                : "메인 디자인이 정해지기 전까지 사용할 기본 진입 화면입니다."}
          </p>

        </section>
      </main>
    </div>
  );
}

export default MainPage;
