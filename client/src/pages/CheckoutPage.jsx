import { useEffect, useMemo, useRef, useState } from "react";
import { MapPin, ShieldCheck, X } from "lucide-react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";

import CheckoutSteps from "../components/CheckoutSteps.jsx";
import DeliveryAddressManagerModal from "../components/DeliveryAddressManagerModal.jsx";
import NavigationBar from "../components/NavigationBar.jsx";
import SiteFooter from "../components/SiteFooter.jsx";
import { fetchMyProfile } from "../api/auth.js";
import { buildAuthHeaders } from "../utils/auth-storage.js";
import { formatPostcodeAddress, loadKakaoPostcode } from "../utils/kakao-postcode.js";
import { isPaymentDismissal, isUnpaidPaymentError, isUnpaidPaymentResponse } from "../utils/portone-result.js";

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "/api";
const formatPrice = (price) => `${Number(price || 0).toLocaleString("ko-KR")}원`;
const getProduct = (item) => (item.product && typeof item.product === "object" ? item.product : null);
const portOneScriptId = "portone-v1-sdk";
const portOneScriptUrl = "https://cdn.iamport.kr/v1/iamport.js";
const portOneCustomerCode = "imp74537423";
const portOneChannelKey = import.meta.env.VITE_PORTONE_CHANNEL_KEY;

const abandonPendingOrder = async (orderId) => {
  if (!orderId) return;

  const response = await fetch(`${apiBaseUrl}/orders/${encodeURIComponent(orderId)}/abandon`, {
    method: "POST",
    headers: { ...buildAuthHeaders() },
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.message || "주문 상태를 확인하지 못했습니다. 주문 내역을 확인해주세요.");
  }
};

const loadPortOne = () => new Promise((resolve, reject) => {
  if (window.IMP) {
    resolve();
    return;
  }

  const existingScript = document.getElementById(portOneScriptId);

  if (existingScript) {
    existingScript.addEventListener("load", resolve, { once: true });
    existingScript.addEventListener("error", () => reject(new Error("결제 모듈을 불러오지 못했습니다.")), { once: true });
    return;
  }

  const script = document.createElement("script");
  script.id = portOneScriptId;
  script.src = portOneScriptUrl;
  script.async = true;
  script.onload = resolve;
  script.onerror = () => reject(new Error("결제 모듈을 불러오지 못했습니다."));
  document.head.append(script);
});

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
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [isPostcodeModalOpen, setIsPostcodeModalOpen] = useState(false);
  const [isPaymentRequesting, setIsPaymentRequesting] = useState(false);
  const [paymentIssue, setPaymentIssue] = useState("");
  const [buyer, setBuyer] = useState(null);
  const postcodeContainerRef = useRef(null);

  const productAmount = useMemo(
    () => checkout?.items?.reduce((total, item) => total + (item.unitPrice * item.quantity), 0) || 0,
    [checkout],
  );

  useEffect(() => {
    if (!isPostcodeModalOpen || !postcodeContainerRef.current || !window.kakao?.Postcode) {
      return undefined;
    }

    const postcodeContainer = postcodeContainerRef.current;
    const postcode = new window.kakao.Postcode({
      oncomplete: (data) => {
        const { postalCode, address } = formatPostcodeAddress(data);

        setForm((currentForm) => ({ ...currentForm, postalCode, address }));
        setIsPostcodeModalOpen(false);
      },
    });

    postcode.embed(postcodeContainer);

    return () => {
      postcodeContainer.replaceChildren();
    };
  }, [isPostcodeModalOpen]);

  useEffect(() => {
    let isMounted = true;

    const loadDefaultDeliveryAddress = async () => {
      try {
        const response = await fetch(`${apiBaseUrl}/auth/me/delivery-addresses`, {
          headers: {
            ...buildAuthHeaders(),
          },
        });
        const data = await response.json().catch(() => ({}));

        if (!response.ok || !isMounted) return;

        const defaultDeliveryAddress = (data.deliveryAddresses || []).find((deliveryAddress) => deliveryAddress.isDefault);

        if (!defaultDeliveryAddress) return;

        setForm((currentForm) => {
          const hasEnteredDeliveryInfo = [
            currentForm.recipientName,
            currentForm.phoneNumber,
            currentForm.postalCode,
            currentForm.address,
            currentForm.addressDetail,
          ].some(Boolean);

          if (hasEnteredDeliveryInfo) return currentForm;

          return {
            ...currentForm,
            recipientName: defaultDeliveryAddress.recipientName,
            phoneNumber: defaultDeliveryAddress.phoneNumber,
            postalCode: defaultDeliveryAddress.postalCode,
            address: defaultDeliveryAddress.address,
            addressDetail: defaultDeliveryAddress.addressDetail || "",
          };
        });
      } catch {
        // 기본 배송지를 불러오지 못해도 주문 정보는 직접 입력할 수 있습니다.
      }
    };

    loadDefaultDeliveryAddress();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadBuyer = async () => {
      try {
        const user = await fetchMyProfile();

        if (isMounted) {
          setBuyer(user);
        }
      } catch {
        // 결제 요청 시 배송 정보로 보완할 수 있도록 별도 오류는 표시하지 않습니다.
      }
    };

    loadBuyer();

    return () => {
      isMounted = false;
    };
  }, []);

  if (!checkout?.items?.length) {
    return <Navigate to="/cart" replace />;
  }

  const updateField = (event) => {
    const { name, value } = event.target;
    setForm((currentForm) => ({ ...currentForm, [name]: value }));
  };

  const openAddressModal = () => setIsAddressModalOpen(true);

  const searchCheckoutAddress = async () => {
    try {
      await loadKakaoPostcode();
      setIsPostcodeModalOpen(true);
    } catch (error) {
      window.alert(error.message || "주소 검색 서비스를 불러오지 못했습니다.");
    }
  };

  const selectDeliveryAddress = (deliveryAddress) => {
    setForm((currentForm) => ({
      ...currentForm,
      recipientName: deliveryAddress.recipientName,
      phoneNumber: deliveryAddress.phoneNumber,
      postalCode: deliveryAddress.postalCode,
      address: deliveryAddress.address,
      addressDetail: deliveryAddress.addressDetail || "",
    }));
    setIsAddressModalOpen(false);
  };

  const submitPayment = async (event) => {
    event.preventDefault();
    let pendingOrderId = null;

    if (!form.recipientName || !form.phoneNumber || !form.postalCode || !form.address) {
      window.alert("배송 정보를 모두 입력해주세요.");
      return;
    }

    if (!portOneChannelKey) {
      window.alert("결제 설정을 확인해주세요.");
      return;
    }

    try {
      setIsPaymentRequesting(true);
      setPaymentIssue("");
      await loadPortOne();

      const IMP = window.IMP;

      if (!IMP) {
        throw new Error("결제 모듈을 불러오지 못했습니다.");
      }

      IMP.init(portOneCustomerCode);

      const orderResponse = await fetch(`${apiBaseUrl}/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...buildAuthHeaders(),
        },
        body: JSON.stringify({
          items: checkout.items.map((item) => ({
            productId: item.productId,
            size: item.size,
            quantity: item.quantity,
          })),
          delivery: form,
        }),
      });
      const orderData = await orderResponse.json().catch(() => ({}));

      if (!orderResponse.ok || !orderData.order) {
        throw new Error(orderData.message || "주문을 준비하지 못했습니다.");
      }

      const merchantUid = orderData.order.orderNumber;
      pendingOrderId = orderData.order.id || orderData.order._id || merchantUid;
      const finishUnpaidPayment = async (message = "") => {
        try {
          await abandonPendingOrder(pendingOrderId);
          if (message && !isPaymentDismissal(message)) {
            setPaymentIssue(message);
          }
        } catch (error) {
          setPaymentIssue(error.message || "주문 상태를 확인하지 못했습니다. 주문 내역을 확인해주세요.");
        } finally {
          setIsPaymentRequesting(false);
        }
      };
      const productName = checkout.items.length === 1
        ? getProduct(checkout.items[0])?.name || "STRIDE 상품"
        : `${getProduct(checkout.items[0])?.name || "STRIDE 상품"} 외 ${checkout.items.length - 1}건`;

      IMP.request_pay(
        {
          channelKey: portOneChannelKey,
          pay_method: "card",
          merchant_uid: merchantUid,
          name: productName,
          amount: orderData.order.totalAmount,
          buyer_name: form.recipientName,
          buyer_email: buyer?.userId || "",
          buyer_tel: buyer?.phoneNumber || form.phoneNumber.replace(/\D/g, ""),
        },
        async (response) => {
          if (isUnpaidPaymentResponse(response)) {
            await finishUnpaidPayment(response?.error_msg);
            return;
          }

          if (response.merchant_uid && response.merchant_uid !== merchantUid) {
            window.alert("결제를 완료하지 못했습니다.");
            setIsPaymentRequesting(false);
            return;
          }

          try {
            const completeResponse = await fetch(`${apiBaseUrl}/orders/payment-complete`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                ...buildAuthHeaders(),
              },
              body: JSON.stringify({
                impUid: response.imp_uid,
                merchantUid,
                items: checkout.items.map((item) => ({
                  productId: item.productId,
                  size: item.size,
                  quantity: item.quantity,
                })),
                delivery: form,
              }),
            });
            const completeData = await completeResponse.json().catch(() => ({}));

            if (!completeResponse.ok) {
              if (isUnpaidPaymentError(completeResponse.status, completeData)) {
                await finishUnpaidPayment(response?.error_msg);
                return;
              }
              throw new Error(completeData.message || "주문을 저장하지 못했습니다.");
            }

            await Promise.all(checkout.items.map((item) => {
              const cartItemId = item.id || item._id;

              if (!cartItemId) return Promise.resolve();

              return fetch(`${apiBaseUrl}/cart/items/${cartItemId}`, {
                method: "DELETE",
                headers: {
                  ...buildAuthHeaders(),
                },
              });
            }));
            window.dispatchEvent(new Event("stride-cart-change"));
            navigate("/order-complete", { replace: true, state: { order: completeData.order } });
          } catch {
            window.alert("주문 처리에 실패했습니다. 결제 내역을 확인해주세요.");
            setIsPaymentRequesting(false);
          }
        },
      );
    } catch (error) {
      try {
        await abandonPendingOrder(pendingOrderId);
        window.alert(error.message || "결제창을 열지 못했습니다. 잠시 후 다시 시도해주세요.");
      } catch (cleanupError) {
        window.alert(cleanupError.message);
      }
      setIsPaymentRequesting(false);
    }
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
              <div className="checkout-section-heading">
                <h2>1. 배송 정보</h2>
                <button className="checkout-address-book-button" type="button" onClick={openAddressModal}>
                  <MapPin size={16} strokeWidth={2} />
                  내 주소
                </button>
              </div>
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
                    <button type="button" onClick={searchCheckoutAddress}>주소 검색</button>
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
            <button type="button" disabled={isPaymentRequesting} onClick={submitPayment}>{isPaymentRequesting ? "결제 처리 중" : "결제하기"}</button>
            {paymentIssue && <p className="checkout-payment-issue" role="alert">{paymentIssue}</p>}
          </aside>
        </div>
      </main>
      <SiteFooter />
      {isPostcodeModalOpen && (
        <div className="postcode-modal-layer" role="presentation">
          <button className="postcode-modal-backdrop" type="button" aria-label="주소 검색 닫기" onClick={() => setIsPostcodeModalOpen(false)} />
          <section className="postcode-modal" aria-labelledby="checkout-postcode-modal-title" aria-modal="true" role="dialog">
            <header>
              <h2 id="checkout-postcode-modal-title">주소 검색</h2>
              <button type="button" aria-label="주소 검색 닫기" title="닫기" onClick={() => setIsPostcodeModalOpen(false)}>
                <X size={22} strokeWidth={1.8} />
              </button>
            </header>
            <div className="postcode-modal-content" ref={postcodeContainerRef} />
          </section>
        </div>
      )}
      <DeliveryAddressManagerModal
        isOpen={isAddressModalOpen}
        onAddressSelect={selectDeliveryAddress}
        onClose={() => setIsAddressModalOpen(false)}
      />
    </div>
  );
}

export default CheckoutPage;
