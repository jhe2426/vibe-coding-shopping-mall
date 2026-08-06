import { useState } from "react";
import {
  AlertTriangle,
  Bell,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Home,
  Package,
  ShoppingBag,
  Users,
  WalletCards,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

import product01 from "../assets/home-products/product-01.png";
import product02 from "../assets/home-products/product-02.png";
import product03 from "../assets/home-products/product-03.png";
import product04 from "../assets/home-products/product-04.png";
import product05 from "../assets/home-products/product-05.png";
import { clearAuthSession } from "../utils/auth-storage.js";

const stats = [
  {
    id: "members",
    label: "총 회원수",
    value: "1,248",
    trend: "12.5%",
    Icon: Users,
    tone: "blue",
  },
  {
    id: "orders",
    label: "오늘 주문",
    value: "86",
    trend: "8.2%",
    Icon: ShoppingBag,
    tone: "green",
  },
  {
    id: "sales",
    label: "오늘 매출",
    value: "4,651,000원",
    trend: "15.1%",
    Icon: WalletCards,
    tone: "amber",
  },
  {
    id: "defects",
    label: "품절 상품",
    value: "7",
    trend: "2",
    Icon: AlertTriangle,
    tone: "red",
  },
];

const members = [
  { name: "정하은", email: "jeonghaeun@stride.com", phone: "010-1111-2222", joinedAt: "2025-05-12", visits: 2 },
  { name: "김하은", email: "haeun.kim@stride.com", phone: "010-2222-3333", joinedAt: "2025-05-11", visits: 5 },
  { name: "김하율", email: "hayul.kim@stride.com", phone: "010-1234-2222", joinedAt: "2025-05-05", visits: 6 },
  { name: "최린", email: "rin.choi@stride.com", phone: "010-1111-3333", joinedAt: "2025-05-03", visits: 14 },
  { name: "이수형", email: "soohyeong.lee@stride.com", phone: "010-3444-2222", joinedAt: "2025-05-01", visits: 21 },
];

const chartData = [0.9, 2.0, 1.9, 2.6, 3.5, 4.9, 4.0, 3.0, 2.0, 2.3, 3.3, 2.9, 3.7, 4.6, 4.4, 3.5, 3.1, 2.7, 2.1, 2.4, 2.0, 2.8, 3.6, 3.7, 4.4, 3.3, 3.4];
const chartPolyline = chartData
  .map((value, index) => {
    const x = 42 + index * 20;
    const y = 202 - value * 32;

    return `${x},${y}`;
  })
  .join(" ");

const orders = [
  {
    buyer: "정하은",
    product: "슈퍼 로우 프로 - 블랙",
    option: "250 / 100",
    brand: "반스",
    price: "94,000원",
    date: "2025-05-12",
    status: "배송완료",
    statusTone: "blue",
    image: product01,
  },
  {
    buyer: "김하은",
    product: "핸드볼 스페지알",
    option: "245 / 110",
    brand: "아디다스",
    price: "59,000원",
    date: "2025-05-10",
    status: "배송완료",
    statusTone: "blue",
    image: product04,
  },
  {
    buyer: "김하율",
    product: "ML408WB",
    option: "260 / 105",
    brand: "뉴발란스",
    price: "99,000원",
    date: "2025-05-05",
    status: "배송중",
    statusTone: "green",
    image: product03,
  },
  {
    buyer: "최린",
    product: "우먼스 나이키 이니시에이터 NA",
    option: "255 / 95",
    brand: "나이키",
    price: "69,000원",
    date: "2025-05-03",
    status: "배송완료",
    statusTone: "blue",
    image: product05,
  },
  {
    buyer: "이수형",
    product: "타르가 클럽",
    option: "265 / 60",
    brand: "휠라",
    price: "39,000원",
    date: "2025-05-01",
    status: "결제완료",
    statusTone: "gray",
    image: product02,
  },
];

const stocks = [
  { product: "나이키 감마 포스", option: "260", brand: "나이키", count: 8, image: product05 },
  { product: "타르가 클럽", option: "265", brand: "휠라", count: 9, image: product02 },
  { product: "슈퍼 로우 프로 - 블랙", option: "250", brand: "반스", count: 7, image: product01 },
  { product: "핸드볼 스페지알", option: "245", brand: "아디다스", count: 6, image: product04 },
  { product: "우먼스 이니시에이터 NA", option: "255", brand: "나이키", count: 5, image: product03 },
];

function AdminPage() {
  const navigate = useNavigate();
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isProductMenuOpen, setIsProductMenuOpen] = useState(false);

  const handleLogout = () => {
    clearAuthSession();
    setIsProfileMenuOpen(false);
    navigate("/", { replace: true });
  };

  return (
    <div className="admin-page">
      <aside className="admin-sidebar" aria-label="admin navigation">
        <div className="admin-brand">
          <strong>STRIDE ADMIN</strong>
          <span>관리자 모드</span>
        </div>

        <nav className="admin-nav">
          <Link className="admin-nav-link is-active" to="/admin">
            <Home size={20} strokeWidth={1.9} />
            <span>HOME</span>
          </Link>
          <Link className="admin-nav-link" to="/admin">
            <Users size={20} strokeWidth={1.9} />
            <span>회원관리</span>
          </Link>
          <div className="admin-nav-product-group">
            <button
              className="admin-nav-link"
              type="button"
              aria-expanded={isProductMenuOpen}
              onClick={() => setIsProductMenuOpen((isOpen) => !isOpen)}
            >
              <Package size={20} strokeWidth={1.9} />
              <span>상품관리</span>
              <ChevronDown className="admin-nav-expand-icon" size={16} strokeWidth={2} />
            </button>
            {isProductMenuOpen && (
              <div className="admin-nav-submenu">
                <Link to="/admin/products">상품 목록</Link>
                <Link to="/admin/brands">브랜드 관리</Link>
              </div>
            )}
          </div>
          <Link className="admin-nav-link" to="/admin">
            <ClipboardList size={20} strokeWidth={1.9} />
            <span>주문관리</span>
          </Link>
        </nav>
      </aside>

      <div className="admin-shell">
        <header className="admin-topbar">
          <h1>대시보드</h1>

          <div className="admin-topbar-actions">
            <button className="admin-icon-button" type="button" aria-label="알림">
              <Bell size={24} strokeWidth={1.8} />
              <span>3</span>
            </button>

            <div
              className="admin-profile-menu-wrap"
              onBlur={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget)) {
                  setIsProfileMenuOpen(false);
                }
              }}
            >
              <button
                className="admin-profile-button"
                type="button"
                aria-expanded={isProfileMenuOpen}
                aria-haspopup="menu"
                onClick={() => setIsProfileMenuOpen((isOpen) => !isOpen)}
              >
                <span className="admin-profile-avatar">AD</span>
                <span className="admin-profile-label">관리자</span>
                <ChevronDown className="admin-profile-chevron" size={17} strokeWidth={2} />
              </button>

              {isProfileMenuOpen && (
                <div className="admin-profile-menu" role="menu">
                  <Link to="/" role="menuitem" onClick={() => setIsProfileMenuOpen(false)}>
                    메인페이지
                  </Link>
                  <button type="button" role="menuitem" onClick={handleLogout}>
                    로그아웃
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="admin-content">
          <section className="admin-stats" aria-label="dashboard summary">
            {stats.map(({ id, label, value, trend, Icon, tone }) => (
              <article className="admin-stat-card" key={id}>
                <div className={`admin-stat-icon ${tone}`}>
                  <Icon size={30} strokeWidth={1.8} />
                </div>
                <div>
                  <p>{label}</p>
                  <strong>{value}</strong>
                  <span>
                    ▲ {trend}
                    <small>지난 7일 대비</small>
                  </span>
                </div>
              </article>
            ))}
          </section>

          <section className="admin-grid admin-grid-top">
            <article className="admin-panel">
              <PanelHeader title="최근 가입 회원" />
              <div className="admin-table-wrap">
                <table className="admin-table member-table">
                  <thead>
                    <tr>
                      <th>회원정보</th>
                      <th>휴대전화</th>
                      <th>가입일</th>
                      <th>방문횟수</th>
                    </tr>
                  </thead>
                  <tbody>
                    {members.map((member) => (
                      <tr key={member.email}>
                        <td>{member.name} ({member.email})</td>
                        <td>{member.phone}</td>
                        <td>{member.joinedAt}</td>
                        <td>{member.visits}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </article>

            <article className="admin-panel sales-panel">
              <div className="panel-heading">
                <h2>월간 매출 현황</h2>
                <button className="admin-select-button" type="button">
                  2025년 5월
                  <ChevronDown size={15} strokeWidth={2} />
                </button>
              </div>

              <div className="chart-unit">(단위: 원)</div>
              <div className="sales-chart" aria-label="5월 매출액 선 그래프">
                <svg viewBox="0 0 600 260" role="img">
                  <title>5월 일별 매출액 추이</title>
                  <g className="chart-grid">
                    <line x1="42" y1="42" x2="562" y2="42" />
                    <line x1="42" y1="82" x2="562" y2="82" />
                    <line x1="42" y1="122" x2="562" y2="122" />
                    <line x1="42" y1="162" x2="562" y2="162" />
                    <line x1="42" y1="202" x2="562" y2="202" />
                  </g>
                  <g className="chart-axis">
                    <text x="5" y="46">5M</text>
                    <text x="5" y="86">4M</text>
                    <text x="5" y="126">3M</text>
                    <text x="5" y="166">2M</text>
                    <text x="15" y="206">0</text>
                    <text x="42" y="236">5/1</text>
                    <text x="142" y="236">5/6</text>
                    <text x="242" y="236">5/11</text>
                    <text x="342" y="236">5/16</text>
                    <text x="442" y="236">5/21</text>
                    <text x="542" y="236">5/31</text>
                  </g>
                  <polyline className="chart-line" points={chartPolyline} />
                  {chartData.map((value, index) => (
                    <circle
                      className="chart-dot"
                      cx={42 + index * 20}
                      cy={202 - value * 32}
                      r="2.4"
                      key={`${value}-${index}`}
                    />
                  ))}
                </svg>
              </div>
              <div className="chart-legend">
                <span />
                매출액
              </div>
            </article>
          </section>

          <section className="admin-grid admin-grid-bottom">
            <article className="admin-panel">
              <PanelHeader title="최근 주문" />
              <div className="admin-table-wrap">
                <table className="admin-table order-table">
                  <thead>
                    <tr>
                      <th>구매자</th>
                      <th>상품정보</th>
                      <th>브랜드</th>
                      <th>결제금액</th>
                      <th>구매날짜</th>
                      <th>주문상태</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((order) => (
                      <tr key={`${order.buyer}-${order.product}`}>
                        <td>{order.buyer}</td>
                        <td>
                          <div className="order-product">
                            <img src={order.image} alt="" aria-hidden="true" />
                            <div>
                              <strong>{order.product}</strong>
                              <span>{order.option}</span>
                            </div>
                          </div>
                        </td>
                        <td>{order.brand}</td>
                        <td>{order.price}</td>
                        <td>{order.date}</td>
                        <td>
                          <span className={`order-status ${order.statusTone}`}>{order.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </article>

            <article className="admin-panel">
              <PanelHeader title="재고 부족 알림" />
              <div className="stock-list">
                {stocks.map((stock) => (
                  <div className="stock-item" key={`${stock.product}-${stock.option}`}>
                    <img src={stock.image} alt="" aria-hidden="true" />
                    <div>
                      <strong>{stock.product}</strong>
                      <span>
                        {stock.option}
                        <small>{stock.brand}</small>
                      </span>
                    </div>
                    <b>재고 {stock.count}개</b>
                  </div>
                ))}
              </div>
            </article>
          </section>
        </main>
      </div>
    </div>
  );
}

function PanelHeader({ title }) {
  return (
    <div className="panel-heading">
      <h2>{title}</h2>
      <button className="panel-more-button" type="button">
        더보기
        <ChevronRight size={15} strokeWidth={2} />
      </button>
    </div>
  );
}

export default AdminPage;
