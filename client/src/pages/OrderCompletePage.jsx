import { Check } from "lucide-react";
import { Navigate, useLocation } from "react-router-dom";

import CheckoutSteps from "../components/CheckoutSteps.jsx";
import NavigationBar from "../components/NavigationBar.jsx";
import SiteFooter from "../components/SiteFooter.jsx";

const formatPrice = (price) => `${Number(price || 0).toLocaleString("ko-KR")}원`;
const formatOrderDate = (value) => new Intl.DateTimeFormat("ko-KR", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
}).format(new Date(value));
const getProduct = (item) => (item.product && typeof item.product === "object" ? item.product : null);
const paymentMethodLabel = {
  CARD: "카드 결제",
  BANK_TRANSFER: "계좌이체",
  EXTERNAL: "외부 결제",
};

function OrderCompletePage() {
  const location = useLocation();
  const order = location.state?.order;

  if (!order?.items?.length) {
    return <Navigate to="/cart" replace />;
  }

  return (
    <div className="order-complete-page">
      <NavigationBar />
      <main className="order-complete-main">
        <CheckoutSteps currentStep={3} />
        <section className="order-complete-hero">
          <span><Check size={34} strokeWidth={1.8} /></span>
          <h1>주문이 완료되었습니다</h1>
          <p>소중한 구매 감사합니다.<br />주문 내역은 마이페이지에서 확인하실 수 있습니다.</p>
        </section>

        <section className="order-complete-card">
          <div className="order-complete-details">
            <dl>
              <div><dt>주문번호</dt><dd>{order.orderNumber}</dd></div>
              <div><dt>주문일시</dt><dd>{formatOrderDate(order.createdAt || order.orderedAt)}</dd></div>
              <div><dt>결제 수단</dt><dd>{paymentMethodLabel[order.payment?.method] || "외부 결제"}</dd></div>
              <div><dt>배송지</dt><dd>{order.delivery.recipientName} | {order.delivery.phoneNumber}<br />({order.delivery.postalCode}) {order.delivery.address} {order.delivery.addressDetail}</dd></div>
            </dl>
            <div className="order-complete-total"><span>총 결제 금액</span><strong>{formatPrice(order.totalAmount)}</strong></div>
          </div>
          <div className="order-complete-items">
            <h2>주문 상품 ({order.items.length}개)</h2>
            {order.items.map((item) => {
              const product = getProduct(item);
              return (
                <article key={item.id || item._id}>
                  <img src={product?.cardImages?.defaultImage || item.imageUrl} alt={product?.name || item.productName || "상품 이미지"} />
                  <div><strong>{product?.name || item.productName || item.productId}</strong><span>사이즈 {item.size}</span></div>
                  <span>수량 {item.quantity}</span>
                  <b>{formatPrice(item.unitPrice * item.quantity)}</b>
                </article>
              );
            })}
          </div>
        </section>
        <div className="order-complete-actions"><a href="/">메인으로 이동</a><button type="button">주문 내역 확인</button></div>
      </main>
      <SiteFooter />
    </div>
  );
}

export default OrderCompletePage;
