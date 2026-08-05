import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Heart, Search, ShoppingBag } from "lucide-react";

import { fetchMyProfile } from "../api/auth.js";
import { AUTH_SESSION_CHANGE_EVENT, clearAuthSession, getAuthToken } from "../utils/auth-storage.js";

const navItems = ["MEN", "WOMEN", "RUNNING", "COLLECTION"];

function NavigationBar() {
  const navigate = useNavigate();
  const [isLoggedIn, setIsLoggedIn] = useState(() => Boolean(getAuthToken()));
  const [currentUser, setCurrentUser] = useState(null);

  // 저장된 JWT 토큰으로 현재 유저 정보를 조회해 관리자/일반 유저 메뉴를 구분합니다.
  useEffect(() => {
    let isMounted = true;

    const loadCurrentUser = async () => {
      const savedToken = getAuthToken();

      if (!savedToken) {
        setIsLoggedIn(false);
        setCurrentUser(null);
        return;
      }

      try {
        const user = await fetchMyProfile();

        if (isMounted) {
          setIsLoggedIn(true);
          setCurrentUser(user);
        }
      } catch {
        clearAuthSession();

        if (isMounted) {
          setIsLoggedIn(false);
          setCurrentUser(null);
        }
      }
    };

    const handleAuthSessionChange = () => {
      loadCurrentUser();
    };

    loadCurrentUser();
    window.addEventListener(AUTH_SESSION_CHANGE_EVENT, handleAuthSessionChange);

    return () => {
      isMounted = false;
      window.removeEventListener(AUTH_SESSION_CHANGE_EVENT, handleAuthSessionChange);
    };
  }, []);

  // 로그아웃 버튼을 누르면 프론트에 저장된 JWT 토큰을 삭제하고 메인 화면으로 이동합니다.
  const handleLogout = () => {
    clearAuthSession();
    setIsLoggedIn(false);
    setCurrentUser(null);
    navigate("/", { replace: true });
  };

  const accountMenuLabel = currentUser?.userType === "admin" ? "관리자페이지" : "마이페이지";
  const accountMenuPath = currentUser?.userType === "admin" ? "/admin" : "/mypage";

  return (
    <header className="site-header-shell">
      <div className="header-user-bar" aria-label="user navigation">
        {isLoggedIn ? (
          <>
            <Link to={accountMenuPath}>{accountMenuLabel}</Link>
            <button type="button" onClick={handleLogout}>
              로그아웃
            </button>
          </>
        ) : (
          <>
            <Link to="/login">로그인</Link>
            <Link to="/signup">회원가입</Link>
          </>
        )}
      </div>

      <div className="site-header">
        <Link className="brand" to="/" aria-label="STRIDE home">
          STRIDE
        </Link>

        <nav className="main-nav" aria-label="primary navigation">
          {navItems.map((item) => (
            <Link to="/" key={item}>
              {item}
            </Link>
          ))}
          <Link className="sale-link" to="/">
            SALE
          </Link>
        </nav>

        <div className="header-actions" aria-label="shop actions">
          <button type="button" aria-label="검색">
            <Search size={25} strokeWidth={1.8} />
          </button>

          <button type="button" aria-label="찜한 상품">
            <Heart size={25} strokeWidth={1.8} />
          </button>

          <button className="cart-button" type="button" aria-label="장바구니">
            <ShoppingBag size={25} strokeWidth={1.8} />
            <span>3</span>
          </button>
        </div>
      </div>
    </header>
  );
}

export default NavigationBar;
