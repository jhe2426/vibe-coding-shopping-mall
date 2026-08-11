import { useEffect, useMemo, useState } from "react";
import {
  Bell,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Home,
  Package,
  PackageCheck,
  Search,
  ShoppingCart,
  Truck,
  Users,
} from "lucide-react";
import { Link, Navigate, useNavigate } from "react-router-dom";

import { fetchMyProfile } from "../api/auth.js";
import { buildAuthHeaders, clearAuthSession, getAuthToken } from "../utils/auth-storage.js";

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "/api";
const numberFormatter = new Intl.NumberFormat("ko-KR");
const dateTimeFormatter = new Intl.DateTimeFormat("ko-KR", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});
const orderStatusOptions = [
  { value: "ALL", label: "전체" },
  { value: "PAID", label: "결제 완료" },
  { value: "PREPARING", label: "준비 중" },
  { value: "SHIPPED", label: "배송 중" },
  { value: "DELIVERED", label: "배송 완료" },
  { value: "CANCELED", label: "취소" },
];
const searchOptions = [
  { value: "orderNumber", label: "주문번호" },
  { value: "buyerName", label: "구매자명" },
  { value: "buyerEmail", label: "구매자 이메일" },
];
const orderStatusInfo = {
  PAYMENT_PENDING: { label: "결제 대기", tone: "pending" },
  PAID: { label: "결제 완료", tone: "paid" },
  PREPARING: { label: "준비 중", tone: "preparing" },
  SHIPPED: { label: "배송 중", tone: "shipping" },
  DELIVERED: { label: "배송 완료", tone: "delivered" },
  CANCELED: { label: "취소", tone: "canceled" },
};
const paymentMethodLabel = {
  CARD: "카드",
  BANK_TRANSFER: "계좌이체",
  EXTERNAL: "외부 결제",
};

const formatPrice = (value) => `${numberFormatter.format(Number(value || 0))}원`;
const formatDateTime = (value) => {
  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? "-" : dateTimeFormatter.format(date);
};
const getPageNumbers = (currentPage, totalPages) => {
  const startPage = Math.max(1, Math.min(currentPage - 2, totalPages - 4));
  const endPage = Math.min(totalPages, startPage + 4);

  return Array.from({ length: endPage - startPage + 1 }, (_value, index) => startPage + index);
};

function AdminOrderManagementPage() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [isProfileLoading, setIsProfileLoading] = useState(() => Boolean(getAuthToken()));
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isProductMenuOpen, setIsProductMenuOpen] = useState(false);
  const [searchType, setSearchType] = useState("orderNumber");
  const [keywordInput, setKeywordInput] = useState("");
  const [keyword, setKeyword] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [orderData, setOrderData] = useState(null);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let isMounted = true;

    const loadProfile = async () => {
      try {
        const user = await fetchMyProfile();

        if (isMounted) setProfile(user);
      } catch {
        if (isMounted) setProfile(null);
      } finally {
        if (isMounted) setIsProfileLoading(false);
      }
    };

    if (getAuthToken()) loadProfile();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (profile?.userType !== "admin") return undefined;

    let isMounted = true;

    const loadOrders = async () => {
      try {
        setIsLoadingOrders(true);
        setLoadError("");

        const params = new URLSearchParams({
          searchType,
          page: String(currentPage),
          limit: "10",
        });

        if (keyword) params.set("keyword", keyword);
        if (statusFilter !== "ALL") params.set("status", statusFilter);
        if (startDate) params.set("startDate", startDate);
        if (endDate) params.set("endDate", endDate);

        const response = await fetch(`${apiBaseUrl}/admin/orders?${params.toString()}`, {
          headers: {
            ...buildAuthHeaders(),
          },
        });
        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(data.message || "주문 정보를 불러오지 못했습니다.");
        }

        if (isMounted) setOrderData(data);
      } catch (error) {
        if (isMounted) setLoadError(error.message || "주문 정보를 불러오지 못했습니다.");
      } finally {
        if (isMounted) setIsLoadingOrders(false);
      }
    };

    loadOrders();

    return () => {
      isMounted = false;
    };
  }, [currentPage, endDate, keyword, profile, searchType, startDate, statusFilter]);

  const pagination = orderData?.pagination || {
    page: 1,
    totalCount: 0,
    totalPages: 1,
  };
  const pageNumbers = useMemo(
    () => getPageNumbers(pagination.page, pagination.totalPages),
    [pagination.page, pagination.totalPages],
  );
  const selectedSearchOption = searchOptions.find((option) => option.value === searchType);
  const profileName = profile?.name || "관리자";
  const profileAvatar = profileName.slice(0, 2).toUpperCase();

  const handleLogout = () => {
    clearAuthSession();
    setIsProfileMenuOpen(false);
    navigate("/", { replace: true });
  };

  const handleSearch = (event) => {
    event.preventDefault();
    setCurrentPage(1);
    setKeyword(keywordInput.trim());
  };

  const updateStatusFilter = (nextStatus) => {
    setCurrentPage(1);
    setStatusFilter(nextStatus);
  };

  const updateDateFilter = (setter, value) => {
    setCurrentPage(1);
    setter(value);
  };

  const resetFilters = () => {
    setSearchType("orderNumber");
    setKeywordInput("");
    setKeyword("");
    setStatusFilter("ALL");
    setStartDate("");
    setEndDate("");
    setCurrentPage(1);
  };

  if (!getAuthToken()) {
    return <Navigate to="/login" state={{ from: "/admin/orders" }} replace />;
  }

  if (!isProfileLoading && (!profile || profile.userType !== "admin")) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="admin-page">
      <aside className="admin-sidebar" aria-label="admin navigation">
        <div className="admin-brand">
          <strong>STRIDE ADMIN</strong>
          <span>관리자 모드</span>
        </div>
        <nav className="admin-nav">
          <Link className="admin-nav-link" to="/admin"><Home size={20} strokeWidth={1.9} /><span>HOME</span></Link>
          <Link className="admin-nav-link" to="/admin/members"><Users size={20} strokeWidth={1.9} /><span>회원관리</span></Link>
          <div className="admin-nav-product-group">
            <button className="admin-nav-link" type="button" aria-expanded={isProductMenuOpen} onClick={() => setIsProductMenuOpen((isOpen) => !isOpen)}>
              <Package size={20} strokeWidth={1.9} /><span>상품관리</span><ChevronDown className="admin-nav-expand-icon" size={16} strokeWidth={2} />
            </button>
            {isProductMenuOpen && <div className="admin-nav-submenu"><Link to="/admin/products">상품 목록</Link><Link to="/admin/products/low-stock">재고 부족</Link><Link to="/admin/brands">브랜드 관리</Link></div>}
          </div>
          <Link className="admin-nav-link is-active" to="/admin/orders"><ClipboardList size={20} strokeWidth={1.9} /><span>주문관리</span></Link>
        </nav>
      </aside>

      <div className="admin-shell">
        <header className="admin-topbar">
          <h1>주문 관리</h1>
          <div className="admin-topbar-actions">
            <button className="admin-icon-button" type="button" aria-label="알림"><Bell size={24} strokeWidth={1.8} /></button>
            <div className="admin-profile-menu-wrap" onBlur={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget)) setIsProfileMenuOpen(false);
            }}>
              <button className="admin-profile-button" type="button" aria-expanded={isProfileMenuOpen} aria-haspopup="menu" onClick={() => setIsProfileMenuOpen((isOpen) => !isOpen)}>
                <span className="admin-profile-avatar">{profileAvatar}</span><span className="admin-profile-label">{profileName}</span><ChevronDown className="admin-profile-chevron" size={17} strokeWidth={2} />
              </button>
              {isProfileMenuOpen && <div className="admin-profile-menu" role="menu">
                <Link to="/mypage" role="menuitem" onClick={() => setIsProfileMenuOpen(false)}>마이페이지</Link>
                <Link to="/" role="menuitem" onClick={() => setIsProfileMenuOpen(false)}>메인페이지</Link>
                <button type="button" role="menuitem" onClick={handleLogout}>로그아웃</button>
              </div>}
            </div>
          </div>
        </header>

        <main className="admin-content admin-order-management-content">
          {isProfileLoading && <p className="admin-dashboard-message">관리자 정보를 확인하는 중입니다.</p>}
          {!isProfileLoading && profile?.userType === "admin" && (
            <>
              <section className="admin-order-summary" aria-label="주문 현황">
                <article className="admin-order-summary-card"><div className="admin-order-summary-icon green"><ShoppingCart size={29} strokeWidth={1.8} /></div><div><p>오늘 주문</p><strong>{numberFormatter.format(orderData?.summary?.todayOrderCount || 0)}건</strong><span>결제 완료 주문 기준</span></div></article>
                <article className="admin-order-summary-card"><div className="admin-order-summary-icon amber"><PackageCheck size={29} strokeWidth={1.8} /></div><div><p>배송 준비</p><strong>{numberFormatter.format(orderData?.summary?.preparingOrderCount || 0)}건</strong><span>결제 완료 및 준비 중</span></div></article>
                <article className="admin-order-summary-card"><div className="admin-order-summary-icon blue"><Truck size={29} strokeWidth={1.8} /></div><div><p>배송 중</p><strong>{numberFormatter.format(orderData?.summary?.shippedOrderCount || 0)}건</strong><span>현재 배송 진행 주문</span></div></article>
              </section>

              <section className="admin-order-filter-panel" aria-label="주문 검색 및 필터">
                <form onSubmit={handleSearch}>
                  <label className="admin-order-search-type"><span>검색 기준</span><select value={searchType} onChange={(event) => { setSearchType(event.target.value); setCurrentPage(1); }}>{searchOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select><ChevronDown size={16} strokeWidth={2} /></label>
                  <label className="admin-order-search-input"><span className="sr-only">주문 검색어</span><input type="search" value={keywordInput} placeholder={`${selectedSearchOption?.label || "검색어"}를 입력해주세요.`} onChange={(event) => setKeywordInput(event.target.value)} /></label>
                  <div className="admin-order-search-actions"><button className="is-search" type="submit"><Search size={17} strokeWidth={2} />검색</button><button className="is-reset" type="button" onClick={resetFilters}>초기화</button></div>
                  <div className="admin-order-date-filter"><label><span>시작일</span><input type="date" value={startDate} max={endDate || undefined} onChange={(event) => updateDateFilter(setStartDate, event.target.value)} /></label><span>~</span><label><span>종료일</span><input type="date" value={endDate} min={startDate || undefined} onChange={(event) => updateDateFilter(setEndDate, event.target.value)} /></label></div>
                </form>
                <div className="admin-order-status-tabs" role="tablist" aria-label="주문 상태 필터">
                  {orderStatusOptions.map((option) => <button className={statusFilter === option.value ? "is-selected" : ""} type="button" role="tab" aria-selected={statusFilter === option.value} key={option.value} onClick={() => updateStatusFilter(option.value)}>{option.label}</button>)}
                </div>
              </section>

              <section className="admin-order-list-panel" aria-label="주문 목록">
                <div className="admin-order-list-heading"><h2>주문 목록</h2><span>총 {numberFormatter.format(pagination.totalCount)}건</span></div>
                <div className="admin-order-table-wrap">
                  <table className="admin-order-table">
                    <thead><tr><th>주문번호</th><th>구매자</th><th>상품정보</th><th>수량</th><th>결제금액</th><th>결제수단</th><th>주문일시</th><th>주문상태</th><th>관리</th></tr></thead>
                    <tbody>
                      {isLoadingOrders ? <tr><td className="admin-order-empty" colSpan="9">주문 정보를 불러오는 중입니다.</td></tr> : loadError ? <tr><td className="admin-order-empty is-error" colSpan="9">{loadError}</td></tr> : orderData?.orders?.length === 0 ? <tr><td className="admin-order-empty" colSpan="9">검색 결과가 없습니다.</td></tr> : orderData?.orders?.map((order) => {
                        const statusInfo = orderStatusInfo[order.status] || orderStatusInfo.PAYMENT_PENDING;
                        const productDescription = `${order.product?.size || "-"} / ${order.product?.brand || "-"}`;

                        return <tr key={order.id}>
                          <td className="admin-order-number">{order.orderNumber}</td>
                          <td><div className="admin-order-buyer"><strong>{order.buyerName}</strong><span>{order.buyerEmail || "-"}</span></div></td>
                          <td><div className="admin-order-product"><img src={order.product?.imageUrl} alt="" aria-hidden="true" /><div><strong>{order.product?.name || "상품 정보 없음"}{order.additionalItemCount > 0 && <small> 외 {order.additionalItemCount}건</small>}</strong><span>{productDescription}</span></div></div></td>
                          <td>{numberFormatter.format(order.totalQuantity)}개</td>
                          <td>{formatPrice(order.totalAmount)}</td>
                          <td>{paymentMethodLabel[order.paymentMethod] || "외부 결제"}</td>
                          <td>{formatDateTime(order.createdAt)}</td>
                          <td><span className={`admin-order-status ${statusInfo.tone}`}>{statusInfo.label}</span></td>
                          <td><Link className="admin-order-detail-link" to={`/admin/orders/${order.id}`}>상세</Link></td>
                        </tr>;
                      })}
                    </tbody>
                  </table>
                </div>
                {!isLoadingOrders && !loadError && pagination.totalCount > 0 && <nav className="admin-order-pagination" aria-label="주문 목록 페이지"><button type="button" disabled={pagination.page <= 1} onClick={() => setCurrentPage(pagination.page - 1)} aria-label="이전 페이지"><ChevronLeft size={17} strokeWidth={2} /></button>{pageNumbers.map((page) => <button className={page === pagination.page ? "is-current" : ""} type="button" key={page} onClick={() => setCurrentPage(page)}>{page}</button>)}<button type="button" disabled={pagination.page >= pagination.totalPages} onClick={() => setCurrentPage(pagination.page + 1)} aria-label="다음 페이지"><ChevronRight size={17} strokeWidth={2} /></button></nav>}
              </section>
            </>
          )}
        </main>
      </div>
    </div>
  );
}

export default AdminOrderManagementPage;
