import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ChevronDown, CircleCheck, Clock3, PackageCheck, ShoppingBag, Star, Truck, X, XCircle } from "lucide-react";
import { Link, Navigate, useNavigate } from "react-router-dom";

import NavigationBar from "../components/NavigationBar.jsx";
import SiteFooter from "../components/SiteFooter.jsx";
import { buildAuthHeaders, getAuthToken } from "../utils/auth-storage.js";
import { getVisibleOrders } from "../utils/visible-orders.js";

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "/api";
const formatPrice = (price) => `${Number(price || 0).toLocaleString("ko-KR")}원`;
const getProduct = (item) => (item.product && typeof item.product === "object" ? item.product : null);
const getOrderId = (order) => order.id || order._id || order.orderNumber;
const getProductPathId = (item) => getProduct(item)?.productId || item.productId;
const getReviewKey = (orderId, productId, size) => `${orderId}:${productId}:${size}`;

const orderTabs = [
  { id: "ALL", label: "전체" },
  { id: "PROCESSING", label: "처리중" },
  { id: "SHIPPING", label: "배송중" },
  { id: "COMPLETED", label: "완료" },
  { id: "CANCELED", label: "취소" },
];

const orderStatusInfo = {
  PAYMENT_PENDING: { label: "결제 확인 중", className: "is-processing", Icon: Clock3, message: "결제 확인을 진행하고 있습니다." },
  PAID: { label: "처리중", className: "is-processing", Icon: Clock3, message: "주문을 확인하고 상품을 준비 중입니다." },
  PREPARING: { label: "처리중", className: "is-processing", Icon: Clock3, message: "상품을 준비하고 있습니다." },
  SHIPPED: { label: "배송중", className: "is-shipping", Icon: Truck, message: "상품이 배송 중입니다." },
  DELIVERED: { label: "완료", className: "is-completed", Icon: CircleCheck, message: "배송이 완료되었습니다." },
  CANCELED: { label: "주문 취소", className: "is-canceled", Icon: XCircle, message: "주문이 취소되었습니다." },
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
  if (tab === "PROCESSING") return ["PAID", "PREPARING"].includes(order.status);
  if (tab === "SHIPPING") return order.status === "SHIPPED";
  if (tab === "COMPLETED") return order.status === "DELIVERED";
  return order.status === "CANCELED";
};

function OrderHistoryPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("ALL");
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [expandedOrderId, setExpandedOrderId] = useState(null);
  const [cancelingOrderId, setCancelingOrderId] = useState(null);
  const [repurchasingOrderId, setRepurchasingOrderId] = useState(null);
  const [reviewedItemKeys, setReviewedItemKeys] = useState(() => new Set());
  const [reviewTarget, setReviewTarget] = useState(null);
  const [reviewDraft, setReviewDraft] = useState({ rating: 0, content: "" });
  const [reviewFormError, setReviewFormError] = useState("");
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadOrders = async () => {
      try {
        setIsLoading(true);
        setLoadError("");

        const [ordersResponse, reviewsResponse] = await Promise.all([
          fetch(`${apiBaseUrl}/orders`, { headers: { ...buildAuthHeaders() } }),
          fetch(`${apiBaseUrl}/reviews/mine`, { headers: { ...buildAuthHeaders() } }),
        ]);
        const [ordersData, reviewsData] = await Promise.all([
          ordersResponse.json().catch(() => ({})),
          reviewsResponse.json().catch(() => ({})),
        ]);

        if (!ordersResponse.ok) {
          throw new Error(ordersData.message || "주문 내역을 불러오지 못했습니다.");
        }

        if (!reviewsResponse.ok) {
          throw new Error(reviewsData.message || "리뷰 작성 정보를 불러오지 못했습니다.");
        }

        if (isMounted) {
          setOrders(getVisibleOrders(ordersData.orders));
          setReviewedItemKeys(new Set(
            (Array.isArray(reviewsData.reviews) ? reviewsData.reviews : []).map((review) => (
              getReviewKey(review.orderId, review.productId, review.size)
            )),
          ));
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

  const closeReviewForm = () => {
    setReviewTarget(null);
    setReviewDraft({ rating: 0, content: "" });
    setReviewFormError("");
  };

  const openReviewForm = (order, item) => {
    setReviewTarget({ orderId: getOrderId(order), item });
    setReviewDraft({ rating: 0, content: "" });
    setReviewFormError("");
  };

  const submitReview = async (event) => {
    event.preventDefault();

    if (!reviewTarget) return;

    const content = reviewDraft.content.trim();

    if (!reviewDraft.rating || !content) return;

    try {
      setIsSubmittingReview(true);
      setReviewFormError("");
      const response = await fetch(`${apiBaseUrl}/reviews`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...buildAuthHeaders(),
        },
        body: JSON.stringify({
          orderId: reviewTarget.orderId,
          productId: getProductPathId(reviewTarget.item),
          size: reviewTarget.item.size,
          rating: reviewDraft.rating,
          content,
        }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) throw new Error(data.message || "리뷰를 등록하지 못했습니다.");

      setReviewedItemKeys((currentKeys) => new Set([
        ...currentKeys,
        getReviewKey(reviewTarget.orderId, getProductPathId(reviewTarget.item), reviewTarget.item.size),
      ]));
      closeReviewForm();
      window.alert("리뷰를 등록했습니다.");
    } catch (error) {
      setReviewFormError(error.message || "리뷰를 등록하지 못했습니다.");
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const repurchaseOrder = async (order) => {
    const orderId = getOrderId(order);

    try {
      setRepurchasingOrderId(orderId);
      const failedMessages = [];
      let addedItemCount = 0;

      for (const item of order.items || []) {
        const response = await fetch(`${apiBaseUrl}/cart/items`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...buildAuthHeaders(),
          },
          body: JSON.stringify({
            productId: getProductPathId(item),
            size: item.size,
            quantity: item.quantity,
          }),
        });
        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          failedMessages.push(data.message || `${item.productName}을 장바구니에 담지 못했습니다.`);
        } else {
          addedItemCount += 1;
        }
      }

      if (addedItemCount === 0) {
        throw new Error(failedMessages[0] || "주문 상품을 장바구니에 담지 못했습니다.");
      }

      window.dispatchEvent(new Event("stride-cart-change"));
      if (failedMessages.length > 0) {
        window.alert(`${addedItemCount}개 상품을 장바구니에 담았습니다.\n${failedMessages[0]}`);
      }
      navigate("/cart");
    } catch (error) {
      window.alert(error.message || "주문 상품을 장바구니에 담지 못했습니다.");
    } finally {
      setRepurchasingOrderId(null);
    }
  };

  const cancelOrder = async (order) => {
    const orderId = getOrderId(order);

    if (!orderId || !window.confirm("주문 전체와 결제를 취소할까요? 취소된 결제는 되돌릴 수 없습니다.")) return;

    try {
      setCancelingOrderId(orderId);
      const response = await fetch(`${apiBaseUrl}/orders/${encodeURIComponent(orderId)}/cancel`, {
        method: "POST",
        headers: {
          ...buildAuthHeaders(),
        },
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) throw new Error(data.message || "주문을 취소하지 못했습니다.");

      setOrders((currentOrders) => currentOrders.map((currentOrder) => (
        getOrderId(currentOrder) === orderId ? data.order : currentOrder
      )));
      window.alert(data.warning || "주문 취소와 환불이 완료되었습니다.");
    } catch (error) {
      window.alert(error.message || "주문을 취소하지 못했습니다.");
    } finally {
      setCancelingOrderId(null);
    }
  };

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
            const canCancelOrder = ["PAID", "PREPARING"].includes(order.status);
            const isCanceling = cancelingOrderId === orderId;
            const isCompleted = order.status === "DELIVERED";
            const pendingReviewItem = isCompleted
              ? order.items.find((item) => !reviewedItemKeys.has(
                getReviewKey(orderId, getProductPathId(item), item.size),
              ))
              : null;
            const isRepurchasing = repurchasingOrderId === orderId;

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
                  <div className="order-history-card-actions">
                    {canCancelOrder && (
                      <button className="order-history-cancel-button" type="button" disabled={isCanceling} onClick={() => cancelOrder(order)}>
                        {isCanceling ? "취소 처리 중" : "주문 취소"}
                      </button>
                    )}
                    {isCompleted && (
                      <button className="order-history-repurchase-button" type="button" disabled={isRepurchasing} onClick={() => repurchaseOrder(order)}>
                        <ShoppingBag size={15} strokeWidth={2} />
                        {isRepurchasing ? "담는 중" : "재구매"}
                      </button>
                    )}
                    {isCompleted && (
                      <button className="order-history-review-button" type="button" disabled={!pendingReviewItem} onClick={() => openReviewForm(order, pendingReviewItem)}>
                        <Star size={15} strokeWidth={2} />
                        {pendingReviewItem ? "리뷰 작성" : "작성 완료"}
                      </button>
                    )}
                    <button
                      className="order-history-detail-button"
                      type="button"
                      aria-expanded={isExpanded}
                      onClick={() => setExpandedOrderId(isExpanded ? null : orderId)}
                    >
                      {isExpanded ? "상세 닫기" : "주문 상세보기"}
                      <ChevronDown className={isExpanded ? "is-open" : ""} size={18} strokeWidth={2} />
                    </button>
                  </div>
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

      {reviewTarget && (
        <div className="review-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) closeReviewForm(); }}>
          <form className="review-modal" aria-labelledby="review-modal-title" aria-modal="true" role="dialog" onSubmit={submitReview}>
            <header>
              <div><p>PRODUCT REVIEW</p><h2 id="review-modal-title">리뷰 작성</h2></div>
              <button type="button" aria-label="리뷰 작성 닫기" title="닫기" onClick={closeReviewForm}><X size={20} strokeWidth={2} /></button>
            </header>
            <div className="review-modal-product">
              <img src={getProduct(reviewTarget.item)?.cardImages?.defaultImage || reviewTarget.item.imageUrl} alt="" aria-hidden="true" />
              <div><strong>{getProduct(reviewTarget.item)?.name || reviewTarget.item.productName}</strong><span>사이즈 {reviewTarget.item.size}</span></div>
            </div>
            <fieldset className="review-rating-picker">
              <legend>별점</legend>
              <div>{[1, 2, 3, 4, 5].map((rating) => <button type="button" aria-label={`${rating}점`} aria-pressed={reviewDraft.rating === rating} className={rating <= reviewDraft.rating ? "is-selected" : ""} key={rating} title={`${rating}점`} onClick={() => setReviewDraft((draft) => ({ ...draft, rating }))}><Star size={29} strokeWidth={1.9} /></button>)}</div>
            </fieldset>
            <label className="review-content-field"><span>리뷰 내용</span><textarea value={reviewDraft.content} maxLength="1000" placeholder="상품을 사용해 본 후기를 작성해주세요." onChange={(event) => setReviewDraft((draft) => ({ ...draft, content: event.target.value }))} /></label>
            <div className="review-modal-meta"><small>{reviewDraft.content.length}/1000</small>{reviewFormError && <p role="alert">{reviewFormError}</p>}</div>
            <footer><button type="button" onClick={closeReviewForm}>취소</button><button type="submit" disabled={isSubmittingReview || !reviewDraft.rating || !reviewDraft.content.trim()}>{isSubmittingReview ? "등록 중" : "리뷰 등록"}</button></footer>
          </form>
        </div>
      )}

      <SiteFooter />
    </div>
  );
}

export default OrderHistoryPage;
