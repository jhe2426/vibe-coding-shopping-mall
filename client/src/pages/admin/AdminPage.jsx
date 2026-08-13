import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Bell,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Home,
  Package,
  PanelsTopLeft,
  ShoppingBag,
  Users,
  WalletCards,
} from "lucide-react";
import { Link, Navigate, useNavigate } from "react-router-dom";

import { fetchMyProfile } from "../../api/auth.js";
import { buildAuthHeaders, clearAuthSession, getAuthToken } from "../../utils/auth-storage.js";

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "/api";
const numberFormatter = new Intl.NumberFormat("ko-KR");
const dateFormatter = new Intl.DateTimeFormat("ko-KR", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
const orderStatus = {
  PAYMENT_PENDING: { label: "결제 대기", tone: "gray" },
  PAID: { label: "결제 완료", tone: "gray" },
  PREPARING: { label: "상품 준비중", tone: "amber" },
  SHIPPED: { label: "배송중", tone: "green" },
  DELIVERED: { label: "배송완료", tone: "blue" },
  CANCELED: { label: "주문 취소", tone: "red" },
};

const formatPrice = (value) => `${numberFormatter.format(Number(value || 0))}원`;
const formatDate = (value) => {
  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? "-" : dateFormatter.format(date);
};
const formatPhoneNumber = (value) => {
  const phoneNumber = String(value || "").replace(/\D/g, "");

  if (phoneNumber.length !== 11) return value || "-";
  return `${phoneNumber.slice(0, 3)}-${phoneNumber.slice(3, 7)}-${phoneNumber.slice(7)}`;
};
const formatAxisValue = (value) => {
  if (value >= 100_000_000) return `${Number((value / 100_000_000).toFixed(1))}억`;
  if (value >= 10_000) return `${Number((value / 10_000).toFixed(1))}만`;
  return numberFormatter.format(value);
};

function AdminPage() {
  const navigate = useNavigate();
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isProductMenuOpen, setIsProductMenuOpen] = useState(false);
  const [isContentMenuOpen, setIsContentMenuOpen] = useState(false);
  const [profile, setProfile] = useState(null);
  const [dashboard, setDashboard] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [hoveredSale, setHoveredSale] = useState(null);

  useEffect(() => {
    if (!getAuthToken()) return undefined;

    let isMounted = true;

    const loadDashboard = async () => {
      try {
        setIsLoading(true);
        setLoadError("");

        const user = await fetchMyProfile();

        if (!isMounted) return;

        setProfile(user);

        if (user.userType !== "admin") return;

        const response = await fetch(`${apiBaseUrl}/admin/dashboard`, {
          headers: {
            ...buildAuthHeaders(),
          },
        });
        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(data.message || "대시보드 정보를 불러오지 못했습니다.");
        }

        if (isMounted) {
          setDashboard(data);
        }
      } catch (error) {
        if (isMounted) {
          setLoadError(error.message || "대시보드 정보를 불러오지 못했습니다.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadDashboard();

    return () => {
      isMounted = false;
    };
  }, []);

  const chart = useMemo(() => {
    const values = dashboard?.monthlySales?.dailySales || [];
    const highestAmount = Math.max(...values.map((item) => Number(item.amount || 0)), 0);
    const axisStep = 500_000;
    const minimumUpperBound = axisStep * 4;
    const upperBound = Math.max(
      minimumUpperBound,
      Math.ceil(highestAmount / minimumUpperBound) * minimumUpperBound,
    );
    const graphWidth = 520;
    const graphHeight = 160;
    const xStart = 42;
    const yBaseline = 202;
    const lastIndex = Math.max(values.length - 1, 1);
    const hoverWidth = graphWidth / Math.max(values.length, 1);
    const points = values.map((item, index) => ({
      ...item,
      x: xStart + ((graphWidth * index) / lastIndex),
      y: yBaseline - ((Number(item.amount || 0) / upperBound) * graphHeight),
    }));
    const tickIndexes = [...new Set([0, 5, 10, 15, 20, values.length - 1].filter((index) => index >= 0 && index < values.length))];

    return {
      points,
      linePoints: points.map((item) => `${item.x},${item.y}`).join(" "),
      yAxis: [upperBound, upperBound * 0.75, upperBound * 0.5, upperBound * 0.25, 0],
      tickIndexes,
      hoverWidth,
    };
  }, [dashboard]);

  const chartTooltip = hoveredSale
    ? {
      x: Math.min(Math.max(hoveredSale.x - 82, 46), 424),
      y: Math.max(hoveredSale.y - 40, 10),
    }
    : null;

  const stats = useMemo(() => {
    if (!dashboard) return [];

    return [
      {
        id: "members",
        label: "총 회원수",
        value: numberFormatter.format(dashboard.summary.totalMemberCount),
        trend: dashboard.summary.trends.members,
        Icon: Users,
        tone: "blue",
      },
      {
        id: "orders",
        label: "오늘 주문",
        value: numberFormatter.format(dashboard.summary.todayOrderCount),
        trend: dashboard.summary.trends.orders,
        Icon: ShoppingBag,
        tone: "green",
      },
      {
        id: "sales",
        label: "오늘 매출",
        value: formatPrice(dashboard.summary.todaySalesAmount),
        trend: dashboard.summary.trends.sales,
        Icon: WalletCards,
        tone: "amber",
      },
      {
        id: "sold-out",
        label: "품절 상품",
        value: numberFormatter.format(dashboard.summary.soldOutProductCount),
        trend: dashboard.summary.trends.soldOut,
        Icon: AlertTriangle,
        tone: "red",
      },
    ];
  }, [dashboard]);

  const handleLogout = () => {
    clearAuthSession();
    setIsProfileMenuOpen(false);
    navigate("/", { replace: true });
  };

  if (!getAuthToken()) {
    return <Navigate to="/login" state={{ from: "/admin" }} replace />;
  }

  if (profile && profile.userType !== "admin") {
    return <Navigate to="/" replace />;
  }

  const monthLabel = dashboard?.monthlySales
    ? `${dashboard.monthlySales.year}년 ${dashboard.monthlySales.month}월`
    : "월간 매출";
  const profileName = profile?.name || "관리자";
  const profileAvatar = profileName.slice(0, 2).toUpperCase();
  const displayedMembers = dashboard?.recentMembers.slice(0, 5) || [];
  const displayedOrders = dashboard?.recentOrders.slice(0, 5) || [];
  const displayedLowStockItems = dashboard?.lowStockItems.slice(0, 5) || [];

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
          <Link className="admin-nav-link" to="/admin/members">
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
                <Link to="/admin/products/low-stock">재고 부족</Link>
                <Link to="/admin/brands">브랜드 관리</Link>
              </div>
            )}
          </div>
          <div className="admin-nav-product-group">
            <button
              className="admin-nav-link"
              type="button"
              aria-expanded={isContentMenuOpen}
              onClick={() => setIsContentMenuOpen((isOpen) => !isOpen)}
            >
              <PanelsTopLeft size={20} strokeWidth={1.9} />
              <span>콘텐츠 관리</span>
              <ChevronDown className="admin-nav-expand-icon" size={16} strokeWidth={2} />
            </button>
            {isContentMenuOpen && (
              <div className="admin-nav-submenu">
                <Link to="/admin/banners">메인 배너 관리</Link>
              </div>
            )}
          </div>
          <Link className="admin-nav-link" to="/admin/orders">
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
                <span className="admin-profile-avatar">{profileAvatar}</span>
                <span className="admin-profile-label">{profileName}</span>
                <ChevronDown className="admin-profile-chevron" size={17} strokeWidth={2} />
              </button>

              {isProfileMenuOpen && (
                <div className="admin-profile-menu" role="menu">
                  <Link to="/mypage" role="menuitem" onClick={() => setIsProfileMenuOpen(false)}>마이페이지</Link>
                  <Link to="/" role="menuitem" onClick={() => setIsProfileMenuOpen(false)}>메인페이지</Link>
                  <button type="button" role="menuitem" onClick={handleLogout}>로그아웃</button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="admin-content">
          {isLoading && <p className="admin-dashboard-message">대시보드 정보를 불러오는 중입니다.</p>}
          {!isLoading && loadError && <p className="admin-dashboard-message is-error">{loadError}</p>}

          {!isLoading && !loadError && dashboard && (
            <>
              <section className="admin-stats" aria-label="dashboard summary">
                {stats.map(({ id, label, value, trend, Icon, tone }) => (
                  <article className="admin-stat-card" key={id}>
                    <div className={`admin-stat-icon ${tone}`}><Icon size={30} strokeWidth={1.8} /></div>
                    <div>
                      <p>{label}</p>
                      <strong>{value}</strong>
                      <span className={`is-${trend.direction}`}>
                        {trend.direction === "up" && "▲ "}
                        {trend.direction === "down" && "▼ "}
                        {trend.label}
                        {trend.description && <small>{trend.description}</small>}
                      </span>
                    </div>
                  </article>
                ))}
              </section>

              <section className="admin-grid admin-grid-top">
                <article className="admin-panel">
                  <PanelHeader
                    title="최근 가입 회원"
                    actionLabel="더보기"
                    onActionClick={() => navigate("/admin/members")}
                  />
                  <div className="admin-table-wrap">
                    <table className="admin-table member-table">
                      <thead><tr><th>회원정보</th><th>휴대전화</th><th>가입일</th><th>저장 배송지</th></tr></thead>
                      <tbody>
                        {dashboard.recentMembers.length === 0 ? (
                          <EmptyTableRow columns={4} message="최근 가입한 회원이 없습니다." />
                        ) : displayedMembers.map((member) => (
                          <tr key={member.id}>
                            <td>{member.name} ({member.email})</td>
                            <td>{formatPhoneNumber(member.phoneNumber)}</td>
                            <td>{formatDate(member.createdAt)}</td>
                            <td>{member.deliveryAddressCount}개</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </article>

                <article className="admin-panel sales-panel">
                  <div className="panel-heading"><h2>월간 매출 현황</h2><span className="admin-period-label">{monthLabel}</span></div>
                  <div className="chart-unit">(단위: 원)</div>
                  <div className="sales-chart" aria-label={`${monthLabel} 일별 매출액 선 그래프`}>
                    <svg viewBox="0 0 600 260" role="img" onMouseLeave={() => setHoveredSale(null)}>
                      <title>{monthLabel} 일별 매출액 추이</title>
                      <g className="chart-grid">
                        {[42, 82, 122, 162, 202].map((y) => <line x1="42" y1={y} x2="562" y2={y} key={y} />)}
                      </g>
                      <g className="chart-axis">
                        {chart.yAxis.map((value, index) => <text x="5" y={46 + (index * 40)} key={`${value}-${index}`}>{formatAxisValue(value)}</text>)}
                        {chart.tickIndexes.map((index) => (
                          <text x={chart.points[index].x} y="236" textAnchor="middle" key={index}>
                            {dashboard.monthlySales.month}/{chart.points[index].day}
                          </text>
                        ))}
                      </g>
                      {chart.linePoints && <polyline className="chart-line" points={chart.linePoints} />}
                      <g className="chart-hit-targets" aria-hidden="true">
                        {chart.points.map((point, index) => {
                          const leftEdge = index === 0 ? point.x : point.x - (chart.hoverWidth / 2);
                          const rightEdge = index === chart.points.length - 1
                            ? point.x
                            : point.x + (chart.hoverWidth / 2);

                          return (
                            <rect
                              fill="transparent"
                              height="160"
                              key={`hit-${point.day}`}
                              onMouseEnter={() => setHoveredSale(point)}
                              x={leftEdge}
                              y="42"
                              width={Math.max(rightEdge - leftEdge, 1)}
                            />
                          );
                        })}
                      </g>
                      {chart.points.map((point) => (
                        <circle
                          aria-label={`${dashboard.monthlySales.month}/${point.day} 매출 ${formatPrice(point.amount)}`}
                          className="chart-dot"
                          cx={point.x}
                          cy={point.y}
                          key={point.day}
                          onBlur={() => setHoveredSale(null)}
                          onFocus={() => setHoveredSale(point)}
                          onMouseEnter={() => setHoveredSale(point)}
                          r="3.2"
                          tabIndex="0"
                        />
                      ))}
                      {hoveredSale && chartTooltip && (
                        <g className="chart-tooltip" pointerEvents="none" transform={`translate(${chartTooltip.x} ${chartTooltip.y})`}>
                          <rect height="29" rx="5" width="164" />
                          <text textAnchor="middle" x="82" y="19">
                            {dashboard.monthlySales.month}/{hoveredSale.day} · {formatPrice(hoveredSale.amount)}
                          </text>
                        </g>
                      )}
                    </svg>
                  </div>
                  <div className="chart-legend"><span />매출액</div>
                </article>
              </section>

              <section className="admin-grid admin-grid-bottom">
                <article className="admin-panel">
                  <PanelHeader
                    title="최근 주문"
                    actionLabel="더보기"
                    onActionClick={() => navigate("/admin/orders")}
                  />
                  <div className="admin-table-wrap">
                    <table className="admin-table order-table">
                      <thead><tr><th>구매자</th><th>상품정보</th><th>브랜드</th><th>결제금액</th><th>구매날짜</th><th>주문상태</th></tr></thead>
                      <tbody>
                        {dashboard.recentOrders.length === 0 ? (
                          <EmptyTableRow columns={6} message="최근 주문이 없습니다." />
                        ) : displayedOrders.map((order) => {
                          const statusInfo = orderStatus[order.status] || orderStatus.PAID;

                          return (
                            <tr key={order.id}>
                              <td>{order.buyerName}</td>
                              <td>
                                <div className="order-product">
                                  <img src={order.imageUrl} alt="" aria-hidden="true" />
                                  <div><strong>{order.productName}</strong><span>{order.size || "-"} / {order.quantity}개</span></div>
                                </div>
                              </td>
                              <td>{order.brand}</td>
                              <td>{formatPrice(order.totalAmount)}</td>
                              <td>{formatDate(order.createdAt)}</td>
                              <td><span className={`order-status ${statusInfo.tone}`}>{statusInfo.label}</span></td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </article>

                <article className="admin-panel">
                  <PanelHeader
                    title="재고 부족 알림"
                    actionLabel="더보기"
                    onActionClick={() => navigate("/admin/products/low-stock")}
                  />
                  <div className="stock-list">
                    {dashboard.lowStockItems.length === 0 ? (
                      <p className="admin-stock-empty">재고 부족 상품이 없습니다.</p>
                    ) : displayedLowStockItems.map((stock) => (
                      <div className="stock-item" key={`${stock.productId}-${stock.size}`}>
                        <img src={stock.imageUrl} alt="" aria-hidden="true" />
                        <div><strong>{stock.name}</strong><span>{stock.size}<small>{stock.brand}</small></span></div>
                        <b>재고 {stock.stockQuantity}개</b>
                      </div>
                    ))}
                  </div>
                </article>
              </section>
            </>
          )}
        </main>
      </div>
    </div>
  );
}

function PanelHeader({ title, isExpanded = false, hasMore = false, onMoreClick, onActionClick, actionLabel }) {
  const handleActionClick = onActionClick || onMoreClick;
  const hasAction = Boolean(actionLabel || handleActionClick);
  const label = actionLabel || (isExpanded ? "접기" : "더보기");

  return (
    <div className="panel-heading">
      <h2>{title}</h2>
      {hasAction && (
        <button className="panel-more-button" type="button" disabled={!actionLabel && !hasMore} onClick={handleActionClick}>
          {label}
          <ChevronRight className={isExpanded ? "is-expanded" : ""} size={15} strokeWidth={2} />
        </button>
      )}
    </div>
  );
}

function EmptyTableRow({ columns, message }) {
  return <tr><td className="admin-table-empty" colSpan={columns}>{message}</td></tr>;
}

export default AdminPage;
