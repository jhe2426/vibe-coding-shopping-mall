import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Bell,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  Clock3,
  Home,
  Package,
  Save,
  ShoppingBag,
  Truck,
  Users,
  XCircle,
} from "lucide-react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";

import { fetchMyProfile } from "../../api/auth.js";
import { buildAuthHeaders, clearAuthSession, getAuthToken } from "../../utils/auth-storage.js";

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
const orderStatusInfo = {
  PAYMENT_PENDING: { label: "주문 생성", detail: "결제를 확인하고 있습니다.", Icon: Clock3, tone: "pending" },
  PAID: { label: "결제 완료", detail: "결제가 완료되었습니다.", Icon: CheckCircle2, tone: "paid" },
  PREPARING: { label: "상품 준비", detail: "상품을 준비하고 있습니다.", Icon: ShoppingBag, tone: "preparing" },
  SHIPPED: { label: "배송 중", detail: "상품이 배송 중입니다.", Icon: Truck, tone: "shipping" },
  DELIVERED: { label: "배송 완료", detail: "주문 처리가 완료되었습니다.", Icon: CheckCircle2, tone: "delivered" },
  CANCELED: { label: "주문 취소", detail: "주문이 취소되었습니다.", Icon: Clock3, tone: "canceled" },
};
const paymentMethodLabel = {
  CARD: "카드 결제",
  BANK_TRANSFER: "계좌이체",
  EXTERNAL: "외부 결제",
};

const formatPrice = (value) => `${numberFormatter.format(Number(value || 0))}원`;
const formatDateTime = (value) => {
  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? "-" : dateTimeFormatter.format(date);
};

function AdminOrderDetailPage() {
  const navigate = useNavigate();
  const { orderId } = useParams();
  const [profile, setProfile] = useState(null);
  const [isProfileLoading, setIsProfileLoading] = useState(() => Boolean(getAuthToken()));
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isProductMenuOpen, setIsProductMenuOpen] = useState(false);
  const [order, setOrder] = useState(null);
  const [isLoadingOrder, setIsLoadingOrder] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [isSavingStatus, setIsSavingStatus] = useState(false);
  const [adminMemoInput, setAdminMemoInput] = useState("");
  const [isSavingMemo, setIsSavingMemo] = useState(false);
  const [isCancelingOrder, setIsCancelingOrder] = useState(false);
  const normalizedAdminMemo = adminMemoInput.trim();
  const canSaveAdminMemo = Boolean(normalizedAdminMemo)
    && normalizedAdminMemo !== String(order?.adminMemo || "").trim();

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
    if (profile?.userType !== "admin" || !orderId) return undefined;

    let isMounted = true;

    const loadOrder = async () => {
      try {
        setIsLoadingOrder(true);
        setLoadError("");
        const response = await fetch(`${apiBaseUrl}/admin/orders/${orderId}`, { headers: { ...buildAuthHeaders() } });
        const data = await response.json().catch(() => ({}));

        if (!response.ok) throw new Error(data.message || "주문 정보를 불러오지 못했습니다.");

        if (isMounted) {
          setOrder(data.order);
          setSelectedStatus(data.order?.status || "");
          setAdminMemoInput(data.order?.adminMemo || "");
        }
      } catch (error) {
        if (isMounted) setLoadError(error.message || "주문 정보를 불러오지 못했습니다.");
      } finally {
        if (isMounted) setIsLoadingOrder(false);
      }
    };

    loadOrder();

    return () => {
      isMounted = false;
    };
  }, [orderId, profile]);

  const handleLogout = () => {
    clearAuthSession();
    setIsProfileMenuOpen(false);
    navigate("/", { replace: true });
  };

  const saveStatus = async () => {
    if (!order || selectedStatus === order.status) return;

    try {
      setIsSavingStatus(true);
      const response = await fetch(`${apiBaseUrl}/admin/orders/${order.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...buildAuthHeaders() },
        body: JSON.stringify({ status: selectedStatus }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) throw new Error(data.message || "주문 상태를 저장하지 못했습니다.");

      setOrder(data.order);
      setSelectedStatus(data.order.status);
      window.alert("주문 상태를 저장했습니다.");
    } catch (error) {
      window.alert(error.message || "주문 상태를 저장하지 못했습니다.");
    } finally {
      setIsSavingStatus(false);
    }
  };

  const cancelOrder = async () => {
    if (!order) return;

    const shouldCancel = window.confirm("정말 주문을 취소하시겠습니까?\n결제 취소 후에는 되돌릴 수 없습니다.");

    if (!shouldCancel) return;

    try {
      setIsCancelingOrder(true);
      const response = await fetch(`${apiBaseUrl}/admin/orders/${order.id}/cancel`, {
        method: "POST",
        headers: { ...buildAuthHeaders() },
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) throw new Error(data.message || "주문을 취소하지 못했습니다.");

      setOrder(data.order);
      setSelectedStatus(data.order.status);
      window.alert(data.warning || "결제와 주문을 취소했습니다.");
    } catch (error) {
      window.alert(error.message || "주문을 취소하지 못했습니다.");
    } finally {
      setIsCancelingOrder(false);
    }
  };

  const saveAdminMemo = async (event) => {
    event.preventDefault();

    if (!order) return;

    const adminMemo = adminMemoInput.trim();

    if (!adminMemo) {
      window.alert("관리자 메모를 입력해주세요.");
      return;
    }

    try {
      setIsSavingMemo(true);
      const response = await fetch(`${apiBaseUrl}/admin/orders/${order.id}/memo`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...buildAuthHeaders() },
        body: JSON.stringify({ adminMemo }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) throw new Error(data.message || "관리자 메모를 저장하지 못했습니다.");

      setOrder(data.order);
      setAdminMemoInput(data.order.adminMemo || "");
      window.alert("관리자 메모를 저장했습니다.");
    } catch (error) {
      window.alert(error.message || "관리자 메모를 저장하지 못했습니다.");
    } finally {
      setIsSavingMemo(false);
    }
  };

  if (!getAuthToken()) return <Navigate to="/login" state={{ from: `/admin/orders/${orderId}` }} replace />;
  if (!isProfileLoading && (!profile || profile.userType !== "admin")) return <Navigate to="/" replace />;

  const profileName = profile?.name || "관리자";
  const profileAvatar = profileName.slice(0, 2).toUpperCase();
  const currentStatusInfo = orderStatusInfo[order?.status] || orderStatusInfo.PAYMENT_PENDING;
  const statusOptions = order?.allowedNextStatuses || [];
  const canCancelOrder = ["PAID", "PREPARING"].includes(order?.status)
    && order?.payment?.status === "PAID";

  return (
    <div className="admin-page">
      <aside className="admin-sidebar" aria-label="admin navigation">
        <div className="admin-brand"><strong>STRIDE ADMIN</strong><span>관리자 모드</span></div>
        <nav className="admin-nav">
          <Link className="admin-nav-link" to="/admin"><Home size={20} strokeWidth={1.9} /><span>HOME</span></Link>
          <Link className="admin-nav-link" to="/admin/members"><Users size={20} strokeWidth={1.9} /><span>회원관리</span></Link>
          <div className="admin-nav-product-group"><button className="admin-nav-link" type="button" aria-expanded={isProductMenuOpen} onClick={() => setIsProductMenuOpen((isOpen) => !isOpen)}><Package size={20} strokeWidth={1.9} /><span>상품관리</span><ChevronDown className="admin-nav-expand-icon" size={16} strokeWidth={2} /></button>{isProductMenuOpen && <div className="admin-nav-submenu"><Link to="/admin/products">상품 목록</Link><Link to="/admin/products/low-stock">재고 부족</Link><Link to="/admin/brands">브랜드 관리</Link></div>}</div>
          <Link className="admin-nav-link is-active" to="/admin/orders"><ClipboardList size={20} strokeWidth={1.9} /><span>주문관리</span></Link>
        </nav>
      </aside>

      <div className="admin-shell">
        <header className="admin-topbar">
          <div className="admin-order-detail-title"><button type="button" aria-label="주문 목록으로" title="주문 목록으로" onClick={() => navigate("/admin/orders")}><ArrowLeft size={24} strokeWidth={2.1} /></button><h1>주문 상세</h1></div>
          <div className="admin-topbar-actions"><button className="admin-icon-button" type="button" aria-label="알림"><Bell size={24} strokeWidth={1.8} /></button><div className="admin-profile-menu-wrap" onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setIsProfileMenuOpen(false); }}><button className="admin-profile-button" type="button" aria-expanded={isProfileMenuOpen} aria-haspopup="menu" onClick={() => setIsProfileMenuOpen((isOpen) => !isOpen)}><span className="admin-profile-avatar">{profileAvatar}</span><span className="admin-profile-label">{profileName}</span><ChevronDown className="admin-profile-chevron" size={17} strokeWidth={2} /></button>{isProfileMenuOpen && <div className="admin-profile-menu" role="menu"><Link to="/mypage" role="menuitem" onClick={() => setIsProfileMenuOpen(false)}>마이페이지</Link><Link to="/" role="menuitem" onClick={() => setIsProfileMenuOpen(false)}>메인페이지</Link><button type="button" role="menuitem" onClick={handleLogout}>로그아웃</button></div>}</div></div>
        </header>

        <main className="admin-content admin-order-detail-content">
          {(isProfileLoading || isLoadingOrder) && <p className="admin-dashboard-message">주문 정보를 불러오는 중입니다.</p>}
          {!isProfileLoading && loadError && <p className="admin-dashboard-message is-error">{loadError}</p>}
          {!isProfileLoading && !isLoadingOrder && !loadError && order && <div className="admin-order-detail-layout">
            <div className="admin-order-detail-main-column">
              <section className="admin-order-detail-card"><div className="admin-order-detail-card-heading"><h2>주문 상품</h2><span>{order.items.length}개 상품</span></div><div className="admin-order-detail-products">{order.items.map((item) => <article key={`${item.productId}-${item.size}`}><img src={item.imageUrl} alt="" aria-hidden="true" /><div><strong>{item.productName}</strong><span>{item.brand} · {item.productId}</span></div><p>{item.size}</p><p>{item.quantity}개</p><b>{formatPrice(item.lineAmount)}</b></article>)}</div><div className="admin-order-product-total"><span>상품 합계</span><strong>{formatPrice(order.productAmount)}</strong></div></section>
              <section className="admin-order-detail-card"><div className="admin-order-detail-card-heading"><h2>주문 처리 이력</h2></div><ol className="admin-order-history">{order.statusHistory.map((history, index) => { const historyInfo = orderStatusInfo[history.status] || orderStatusInfo.PAYMENT_PENDING; const Icon = historyInfo.Icon; const isCurrent = index === order.statusHistory.length - 1; return <li className={`${historyInfo.tone}${isCurrent ? " is-current" : ""}`} key={`${history.status}-${history.changedAt}-${index}`}><span><Icon size={16} strokeWidth={2.1} /></span><div><strong>{historyInfo.label}</strong><time>{formatDateTime(history.changedAt)}</time><p>{historyInfo.detail}</p></div></li>; })}</ol></section>
              <section className="admin-order-detail-card admin-order-memo-card"><div className="admin-order-detail-card-heading"><h2>메모 / 고객 요청사항</h2></div><div className="admin-order-memo-grid"><div className="admin-order-customer-request"><h3>고객 요청사항</h3><p>{order.customerRequest || "등록된 고객 요청사항이 없습니다."}</p></div><form onSubmit={saveAdminMemo}><label><span>관리자 메모</span><textarea value={adminMemoInput} maxLength="1000" placeholder="관리자만 볼 수 있는 메모를 입력해주세요." onChange={(event) => setAdminMemoInput(event.target.value)} /></label><div><small>{adminMemoInput.length}/1000</small><button type="submit" disabled={isSavingMemo || !canSaveAdminMemo}>{isSavingMemo ? "저장 중" : "메모 저장"}</button></div></form></div></section>
            </div>

            <aside className="admin-order-detail-side-card">
              <section><h2>주문 정보</h2><dl><div><dt>주문번호</dt><dd>{order.orderNumber}</dd></div><div><dt>주문일시</dt><dd>{formatDateTime(order.createdAt)}</dd></div></dl></section>
              <section><h2>주문 상태</h2><div className="admin-order-status-control"><label><span className="sr-only">주문 상태</span><select value={selectedStatus} disabled={statusOptions.length < 2} onChange={(event) => setSelectedStatus(event.target.value)}>{statusOptions.map((status) => <option key={status} value={status}>{orderStatusInfo[status]?.label || status}</option>)}</select><ChevronDown size={16} strokeWidth={2} /></label><button type="button" disabled={selectedStatus === order.status || isSavingStatus} onClick={saveStatus}><Save size={16} strokeWidth={2} />{isSavingStatus ? "저장 중" : "상태 저장"}</button></div><span className={`admin-order-current-status ${currentStatusInfo.tone}`}>{currentStatusInfo.label}</span></section>
              <section><h2>결제 정보</h2><dl className="admin-order-payment-list"><div><dt>상품 금액</dt><dd>{formatPrice(order.productAmount)}</dd></div><div><dt>할인 금액</dt><dd className={order.discountAmount > 0 ? "is-discount" : ""}>{order.discountAmount > 0 ? `-${formatPrice(order.discountAmount)}` : formatPrice(0)}</dd></div><div><dt>배송비</dt><dd>{formatPrice(order.deliveryFee)}</dd></div><div className="is-total"><dt>결제 금액</dt><dd>{formatPrice(order.totalAmount)}</dd></div><div><dt>결제 수단</dt><dd>{paymentMethodLabel[order.payment.method] || "외부 결제"}</dd></div><div><dt>결제 상태</dt><dd>{order.payment.status === "PAID" ? "결제 완료" : order.payment.status === "CANCELED" ? "결제 취소" : "결제 대기"}</dd></div></dl></section>
              <section><h2>구매자 정보</h2><dl><div><dt>이름</dt><dd>{order.buyer.name}</dd></div><div><dt>연락처</dt><dd>{order.buyer.phoneNumber || "-"}</dd></div><div><dt>이메일</dt><dd>{order.buyer.email || "-"}</dd></div></dl></section>
              <section><h2>배송지 정보</h2><dl><div><dt>받는 사람</dt><dd>{order.delivery.recipientName || "-"}</dd></div><div><dt>연락처</dt><dd>{order.delivery.phoneNumber || "-"}</dd></div><div><dt>우편번호</dt><dd>{order.delivery.postalCode || "-"}</dd></div><div><dt>주소</dt><dd>{[order.delivery.address, order.delivery.addressDetail].filter(Boolean).join(" ") || "-"}</dd></div></dl></section>
              {canCancelOrder && <div className="admin-order-cancel-action"><button type="button" disabled={isCancelingOrder} onClick={cancelOrder}><XCircle size={17} strokeWidth={2} />{isCancelingOrder ? "취소 처리 중" : "주문 취소"}</button></div>}
            </aside>
          </div>}
        </main>
      </div>
    </div>
  );
}

export default AdminOrderDetailPage;
