import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Heart, Search, ShoppingBag } from "lucide-react";

import { clearAuthSession, getAuthToken } from "../utils/auth-storage.js";

const navItems = ["MEN", "WOMEN", "RUNNING", "COLLECTION"];

function SiteHeader() {
  const navigate = useNavigate();
  const [isLoggedIn, setIsLoggedIn] = useState(() => Boolean(getAuthToken()));

  // 로그아웃 버튼을 누르면 프론트에 저장된 JWT 토큰을 삭제하고 메인 화면으로 이동합니다.
  const handleLogout = () => {
    clearAuthSession();
    setIsLoggedIn(false);
    navigate("/", { replace: true });
  };

  return (
    <header className="site-header-shell">
      <div className="header-user-bar" aria-label="user navigation">
        {isLoggedIn ? (
          <>
            <Link to="/login">마이페이지</Link>
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

export default SiteHeader;
