import { Link } from "react-router-dom";
import { Search, ShoppingBag, UserRound } from "lucide-react";

const navItems = ["MEN", "WOMEN", "RUNNING", "COLLECTION"];

function MainPage() {
  return (
    <div className="home-page">
      {/* 메인 페이지 공통 헤더 */}
      <header className="site-header">
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
          <button type="button" aria-label="마이페이지">
            <UserRound size={25} strokeWidth={1.8} />
          </button>
          <button className="cart-button" type="button" aria-label="장바구니">
            <ShoppingBag size={25} strokeWidth={1.8} />
            <span>3</span>
          </button>
        </div>
      </header>

      {/* 추후 메인 디자인을 받으면 이 영역만 교체하면 됩니다. */}
      <main className="home-main">
        <section className="home-intro" aria-labelledby="home-title">
          <p className="eyebrow">EVERY STEP, YOUR STRIDE</p>
          <h1 id="home-title">STRIDE 쇼핑몰 메인 페이지</h1>
          <p>메인 디자인이 정해지기 전까지 사용할 기본 진입 화면입니다.</p>
          <Link className="signup-link-button" to="/signup">
            회원가입
          </Link>
        </section>
      </main>
    </div>
  );
}

export default MainPage;
