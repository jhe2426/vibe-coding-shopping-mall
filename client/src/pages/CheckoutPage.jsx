import { useMemo, useState } from "react";
import { LockKeyhole, ShieldCheck } from "lucide-react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";

import CheckoutSteps from "../components/CheckoutSteps.jsx";
import NavigationBar from "../components/NavigationBar.jsx";
import SiteFooter from "../components/SiteFooter.jsx";

const formatPrice = (price) => `${Number(price || 0).toLocaleString("ko-KR")}원`;
const getProduct = (item) => (item.product && typeof item.product === "object" ? item.product : null);

function CheckoutPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const checkout = location.state?.checkout;
  const [form, setForm] = useState({
    recipientName: "",
    phoneNumber: "",
    postalCode: "",
    address: "",
    addressDetail: "",
    deliveryMemo: "",
  });
  const [formError, setFormError] = useState("");

  const productAmount = useMemo(
    () => checkout?.items?.reduce((total, item) => total + (item.unitPrice * item.quantity), 0) || 0,
    [checkout],
  );

  if (!checkout?.items?.length) {
    return <Navigate to="/cart" replace />;
  }

  const updateField = (event) => {
    const { name, value } = event.target;
    setFormError("");
    setForm((currentForm) => ({ ...currentForm, [name]: value }));
  };

  const submitPayment = (event) => {
    event.preventDefault();

    if (!form.recipientName || !form.phoneNumber || !form.postalCode || !form.address) {
      setFormError("배송 정보를 모두 입력해주세요.");
      return;
    }

    navigate("/order-complete", {
      replace: true,
      state: {
        order: {
          orderNumber: `S${Date.now()}`,
          orderedAt: new Date().toISOString(),
          items: checkout.items,
          totalAmount: productAmount,
          delivery: form,
        },
      },
    });
  };

  return (
    <div className="checkout-page">
      <NavigationBar />
      <main className="checkout-main">
        <CheckoutSteps currentStep={2} />

        <div className="checkout-layout">
          <form className="checkout-form" onSubmit={submitPayment}>
            <h1>주문/결제</h1>

            <section className="checkout-section">
              <h2>1. 배송 정보</h2>
              <div className="checkout-field-grid">
                <label>
                  <span>이름</span>
                  <input name="recipientName" onChange={updateField} placeholder="이름을 입력해주세요" value={form.recipientName} />
                </label>
                <label>
                  <span>연락처</span>
                  <input name="phoneNumber" onChange={updateField} placeholder="- 없이 숫자만 입력해주세요" value={form.phoneNumber} />
                </label>
                <label className="checkout-address-search">
                  <span>우편번호</span>
                  <div>
                    <input name="postalCode" onChange={updateField} placeholder="우편번호를 입력해주세요" value={form.postalCode} />
                    <button type="button">주소 검색</button>
                  </div>
                </label>
                <label>
                  <span>주소</span>
                  <input name="address" onChange={updateField} placeholder="기본주소를 입력해주세요" value={form.address} />
                </label>
                <label>
                  <span>상세 주소</span>
                  <input name="addressDetail" onChange={updateField} placeholder="상세주소를 입력해주세요 (선택사항)" value={form.addressDetail} />
                </label>
                <label>
                  <span>배송 메모</span>
                  <input name="deliveryMemo" onChange={updateField} placeholder="배송 시 요청사항을 입력해주세요 (선택사항)" value={form.deliveryMemo} />
                </label>
              </div>
            </section>

            <section className="checkout-section checkout-payment-notice">
              <h2>2. 결제 안내</h2>
              <div>
                <ShieldCheck size={48} strokeWidth={1.5} />
                <p><strong>결제는 안전한 외부 결제창에서 진행됩니다.</strong><span>고객님의 결제 정보는 STRIDE가 저장하지 않습니다.</span><span>결제 수단 선택은 결제 단계에서 가능합니다.</span></p>
              </div>
            </section>
            {formError && <p className="checkout-form-error" role="alert">{formError}</p>}
          </form>

          <aside className="checkout-summary">
            <div className="checkout-summary-heading"><h2>주문 요약</h2><span>{checkout.items.length}개 상품</span></div>
            <ul className="checkout-summary-items">
              {checkout.items.map((item) => {
                const product = getProduct(item);
                return (
                  <li key={item.id || item._id}>
                    <img src={product?.cardImages?.defaultImage} alt={product?.name || "상품 이미지"} />
                    <div><strong>{product?.name || item.productId}</strong><span>사이즈 {item.size}</span><span>수량 {item.quantity}</span></div>
                    <b>{formatPrice(item.unitPrice * item.quantity)}</b>
                  </li>
                );
              })}
            </ul>
            <dl>
              <div><dt>상품 금액</dt><dd>{formatPrice(productAmount)}</dd></div>
              <div><dt>할인 금액</dt><dd>-0원</dd></div>
              <div><dt>배송비</dt><dd>0원</dd></div>
            </dl>
            <div className="checkout-summary-total"><span>총 결제 금액</span><strong>{formatPrice(productAmount)}</strong></div>
            <button type="button" onClick={submitPayment}>결제하기</button>
            <p><LockKeyhole size={14} /> 안전한 결제를 위해 SSL 암호화가 적용됩니다.</p>
          </aside>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

export default CheckoutPage;
