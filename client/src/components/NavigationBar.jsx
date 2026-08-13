import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Heart, Search, ShoppingBag, UserRound } from "lucide-react";

import { WISHLIST_CHANGE_EVENT, fetchProductLikes } from "../api/product-likes.js";
import { fetchMyProfile } from "../api/auth.js";
import { AUTH_SESSION_CHANGE_EVENT, buildAuthHeaders, clearAuthSession, getAuthToken } from "../utils/auth-storage.js";
import { getGuestCartItemCount } from "../utils/guest-cart.js";

const navItems = [
  { label: "MEN", catalog: "men" },
  { label: "WOMEN", catalog: "women" },
  { label: "RUNNING", catalog: "running" },
];
const CART_CHANGE_EVENT = "stride-cart-change";

function NavigationBar() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isLoggedIn, setIsLoggedIn] = useState(() => Boolean(getAuthToken()));
  const [currentUser, setCurrentUser] = useState(null);
  const [cartItemCount, setCartItemCount] = useState(0);
  const [wishlistItemCount, setWishlistItemCount] = useState(0);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);

  // 저장된 JWT 토큰으로 현재 유저 정보를 조회해 관리자/일반 유저 메뉴를 구분합니다.
  useEffect(() => {
    let isMounted = true;

    const loadCartItemCount = async () => {
      if (!getAuthToken()) {
        if (isMounted) setCartItemCount(getGuestCartItemCount());
        return;
      }

      try {
        const response = await fetch("/api/cart", {
          headers: {
            ...buildAuthHeaders(),
          },
        });
        const cart = await response.json().catch(() => ({}));

        if (response.ok && isMounted) {
          setCartItemCount((cart.items || []).reduce((count, item) => count + item.quantity, 0));
        }
      } catch {
        if (isMounted) setCartItemCount(0);
      }
    };

    const loadWishlistItemCount = async () => {
      if (!getAuthToken()) {
        if (isMounted) setWishlistItemCount(0);
        return;
      }

      try {
        const likes = await fetchProductLikes("/api");

        if (isMounted) {
          setWishlistItemCount(likes.length);
        }
      } catch {
        if (isMounted) setWishlistItemCount(0);
      }
    };

    const loadCurrentUser = async () => {
      const savedToken = getAuthToken();

      if (!savedToken) {
        setIsLoggedIn(false);
        setCurrentUser(null);
        setCartItemCount(getGuestCartItemCount());
        return;
      }

      try {
        const user = await fetchMyProfile();

        if (isMounted) {
          setIsLoggedIn(true);
          setCurrentUser(user);
        }
        loadCartItemCount();
        loadWishlistItemCount();
      } catch {
        clearAuthSession();

        if (isMounted) {
          setIsLoggedIn(false);
          setCurrentUser(null);
          setCartItemCount(0);
          setWishlistItemCount(0);
        }
      }
    };

    const handleAuthSessionChange = () => {
      loadCurrentUser();
    };

    const handleCartChange = () => {
      loadCartItemCount();
    };

    const handleWishlistChange = () => {
      loadWishlistItemCount();
    };

    loadCurrentUser();
    window.addEventListener(AUTH_SESSION_CHANGE_EVENT, handleAuthSessionChange);
    window.addEventListener(CART_CHANGE_EVENT, handleCartChange);
    window.addEventListener(WISHLIST_CHANGE_EVENT, handleWishlistChange);

    return () => {
      isMounted = false;
      window.removeEventListener(AUTH_SESSION_CHANGE_EVENT, handleAuthSessionChange);
      window.removeEventListener(CART_CHANGE_EVENT, handleCartChange);
      window.removeEventListener(WISHLIST_CHANGE_EVENT, handleWishlistChange);
    };
  }, []);

  // 로그아웃 버튼을 누르면 프론트에 저장된 JWT 토큰을 삭제하고 메인 화면으로 이동합니다.
  const handleLogout = () => {
    clearAuthSession();
    setIsLoggedIn(false);
    setCurrentUser(null);
    setCartItemCount(0);
    setWishlistItemCount(0);
    setIsAccountMenuOpen(false);
    navigate("/", { replace: true });
  };

  const isAdmin = currentUser?.userType === "admin";

  return (
    <header className="site-header-shell">
      <div className="header-user-bar" aria-label="사용자 메뉴">
        {isLoggedIn ? (
          <>
            {currentUser?.name && <span className="header-user-greeting">반갑습니다, {currentUser.name}님</span>}
            <button className="header-user-logout" type="button" onClick={handleLogout}>로그아웃</button>
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
            <Link className={searchParams.get("catalog") === item.catalog ? "is-active" : ""} to={`/?catalog=${item.catalog}`} key={item.catalog}>
              {item.label}
            </Link>
          ))}
          <Link className={`sale-link ${searchParams.get("catalog") === "sale" ? "is-active" : ""}`} to="/?catalog=sale">
            SALE
          </Link>
        </nav>

        <div className="header-actions" aria-label="shop actions">
          {isLoggedIn && (
            <button type="button" aria-label="검색">
              <Search size={25} strokeWidth={1.8} />
            </button>
          )}

          {isLoggedIn && (
            <button className="wishlist-nav-button" type="button" aria-label="찜한 상품" onClick={() => navigate("/wishlist")}>
              <Heart size={25} strokeWidth={1.8} />
              {wishlistItemCount > 0 && <span>{wishlistItemCount}</span>}
            </button>
          )}

          <button className="cart-button" type="button" aria-label="장바구니" onClick={() => navigate("/cart")}>
            <ShoppingBag size={25} strokeWidth={1.8} />
            {cartItemCount > 0 && <span>{cartItemCount}</span>}
          </button>

          {isLoggedIn && (
            <div
              className="header-account-menu-wrap"
              onBlur={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget)) {
                  setIsAccountMenuOpen(false);
                }
              }}
            >
              <button
                className="header-account-button"
                type="button"
                aria-label="내 계정 메뉴"
                aria-expanded={isAccountMenuOpen}
                aria-haspopup="menu"
                title="내 계정"
                onClick={() => setIsAccountMenuOpen((isOpen) => !isOpen)}
              >
                <UserRound size={25} strokeWidth={1.8} />
              </button>

              {isAccountMenuOpen && (
              <div className="header-account-menu" role="menu">
                <Link to="/mypage" role="menuitem" onClick={() => setIsAccountMenuOpen(false)}>마이페이지</Link>
                {isAdmin && <Link to="/admin" role="menuitem" onClick={() => setIsAccountMenuOpen(false)}>관리자페이지</Link>}
                <button type="button" role="menuitem" onClick={handleLogout}>로그아웃</button>
              </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export default NavigationBar;
