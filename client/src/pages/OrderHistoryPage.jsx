import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ChevronDown, CircleCheck, Clock3, PackageCheck, Truck, XCircle } from "lucide-react";
import { Link, Navigate } from "react-router-dom";

import NavigationBar from "../components/NavigationBar.jsx";
import SiteFooter from "../components/SiteFooter.jsx";
import { buildAuthHeaders, getAuthToken } from "../utils/auth-storage.js";

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "/api";
const formatPrice = (price) => `${Number(price || 0).toLocaleString("ko-KR")}원`;
const getProduct = (item) => (item.product && typeof item.product === "object" ? item.product : null);
const getOrderId = (order) => order.id || order._id || order.orderNumber;
const getProductPathId = (item) => getProduct(item)?.productId || item.productId;

const orderTabs = [
  { id: "ALL", label: "전체" },
  { id: "PROCESSING", label: "처리중" },
  { id: "SHIPPING", label: "배송중" },
  { id: "COMPLETED", label: "완료" },
];

const orderStatusInfo = {
  PAYMENT_PENDING: { label: "결제 확인 중", className: "is-processing", Icon: Clock3, message: "결제 확인을 진행하고 있습니다." },
  PAID: { label: "처리중", className: "is-processing", Icon: Clock3, message: "주문을 확인하고 상품을 준비 중입니다." },
  PREPARING: { label: "처리중", className: "is-processing", Icon: Clock3, message: "상품을 준비하고 있습니다." },
  SHIPPED: { label: "배송중", className: "is-shipping", Icon: Truck, message: "상품이 배송 중입니다." },
  DELIVERED: { label: "완료", className: "is-completed", Icon: CircleCheck, message: "배송이 완료되었습니다." },
  CANCELED: { label: "취소됨", className: "is-canceled", Icon: XCircle, message: "주문이 취소되었습니다." },
};

const paymentMethodLabel = {
  CARD: "카드 결제",
  BANK_TRANSFER: "계좌이체",
  EXTERNAL: "외부 결제",
};

const formatOrderDate = (value) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
};

const matchesTab = (order, tab) => {
  if (tab === "ALL") return true;
  if (tab === "PROCESSING") return ["PAYMENT_PENDING", "PAID", "PREPARING"].includes(order.status);
  if (tab === "SHIPPING") return order.status === "SHIPPED";
  return order.status === "DELIVERED";
};

function OrderHistoryPage() {
  const [activeTab, setActiveTab] = useState("ALL");
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [expandedOrderId, setExpandedOrderId] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const loadOrders = async () => {
      try {
        setIsLoading(true);
        setLoadError("");

        const response = await fetch(`${apiBaseUrl}/orders`, {
          headers: {
            ...buildAuthHeaders(),
          },
        });
        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(data.message || "주문 내역을 불러오지 못했습니다.");
        }

        if (isMounted) {
          setOrders(Array.isArray(data.orders) ? data.orders : []);
        }
      } catch (error) {
        if (isMounted) {
          setLoadError(error.message || "주문 내역을 불러오지 못했습니다.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadOrders();

    return () => {
      isMounted = false;
    };
  }, []);

  const filteredOrders = useMemo(
    () => orders.filter((order) => matchesTab(order, activeTab)),
    [activeTab, orders],
  );

  if (!getAuthToken()) {
    return <Navigate to="/login" state={{ from: "/orders" }} replace />;
  }

  return (
    <div className="order-history-page">
      <NavigationBar />

      <main className="order-history-main">
        <Link className="order-history-back" to="/">
          <ArrowLeft size={18} strokeWidth={2.1} />
          쇼핑 계속하기
        </Link>

        <section className="order-history-heading">
          <h1>주문 내역</h1>
          <p>주문 상태와 배송 정보를 확인할 수 있습니다.</p>
        </section>

        <div className="order-history-tabs" role="tablist" aria-label="주문 상태 필터">
          {orderTabs.map((tab) => (
            <button
              className={activeTab === tab.id ? "is-active" : ""}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <section className="order-history-list" aria-live="polite">
          {isLoading && <p className="order-history-message">주문 내역을 불러오는 중입니다.</p>}
          {!isLoading && loadError && <p className="order-history-message is-error">{loadError}</p>}
          {!isLoading && !loadError && filteredOrders.length === 0 && (
            <section className="order-history-empty">
              <PackageCheck size={34} strokeWidth={1.6} />
              <h2>{activeTab === "ALL" ? "주문 내역이 없습니다." : "해당 상태의 주문이 없습니다."}</h2>
              <Link to="/">상품 둘러보기</Link>
            </section>
          )}

          {!isLoading && !loadError && filteredOrders.map((order) => {
            const orderId = getOrderId(order);
            const statusInfo = orderStatusInfo[order.status] || orderStatusInfo.PAID;
            const StatusIcon = statusInfo.Icon;
            const isExpanded = expandedOrderId === orderId;

            return (
              <article className="order-history-card" key={orderId}>
                <header className="order-history-card-header">
                  <span className={`order-status-icon ${statusInfo.className}`}><StatusIcon size={23} strokeWidth={1.9} /></span>
                  <div>
                    <h2>주문 {order.orderNumber}</h2>
                    <p>주문일: {formatOrderDate(order.createdAt)}</p>
                  </div>
                  <div className="order-history-amount">
                    <span className={`order-status-badge ${statusInfo.className}`}>{statusInfo.label}</span>
                    <strong>{formatPrice(order.totalAmount)}</strong>
                  </div>
                </header>

                <div className={`order-history-products ${order.items.length === 1 ? "is-single" : ""}`}>
                  {order.items.map((item) => {
                    const product = getProduct(item);
                    const productPathId = getProductPathId(item);

                    return (
                      <Link className="order-history-product" to={`/products/${productPathId}`} key={`${item.productId}-${item.size}`}>
                        <img src={product?.cardImages?.defaultImage || item.imageUrl} alt={product?.name || item.productName || "상품 이미지"} />
                        <div>
                          <strong>{product?.name || item.productName || item.productId}</strong>
                          <span>사이즈 {item.size} · 수량 {item.quantity}</span>
                          <b>{formatPrice(item.lineAmount ?? item.unitPrice * item.quantity)}</b>
                        </div>
                      </Link>
                    );
                  })}
                </div>

                <footer className="order-history-card-footer">
                  <p title={statusInfo.message}><StatusIcon size={18} strokeWidth={1.9} />{statusInfo.message}</p>
                  <button
                    type="button"
                    aria-expanded={isExpanded}
                    onClick={() => setExpandedOrderId(isExpanded ? null : orderId)}
                  >
                    {isExpanded ? "상세 닫기" : "주문 상세보기"}
                    <ChevronDown className={isExpanded ? "is-open" : ""} size={18} strokeWidth={2} />
                  </button>
                </footer>

                {isExpanded && (
                  <div className="order-history-details">
                    <dl>
                      <div><dt>결제 수단</dt><dd>{paymentMethodLabel[order.payment?.method] || "외부 결제"}</dd></div>
                      <div><dt>수령인</dt><dd>{order.delivery?.recipientName || "-"} · {order.delivery?.phoneNumber || "-"}</dd></div>
                      <div><dt>배송지</dt><dd>({order.delivery?.postalCode || "-"}) {order.delivery?.address || ""} {order.delivery?.addressDetail || ""}</dd></div>
                      {order.delivery?.deliveryMemo && <div><dt>배송 메모</dt><dd>{order.delivery.deliveryMemo}</dd></div>}
                    </dl>
                  </div>
                )}
              </article>
            );
          })}
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}

export default OrderHistoryPage;
