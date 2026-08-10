import { useEffect, useMemo, useRef, useState } from "react";
import { MapPin, Pencil, Plus, ShieldCheck, Trash2, X } from "lucide-react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";

import CheckoutSteps from "../components/CheckoutSteps.jsx";
import NavigationBar from "../components/NavigationBar.jsx";
import SiteFooter from "../components/SiteFooter.jsx";
import { fetchMyProfile } from "../api/auth.js";
import { buildAuthHeaders } from "../utils/auth-storage.js";

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "/api";
const formatPrice = (price) => `${Number(price || 0).toLocaleString("ko-KR")}원`;
const getProduct = (item) => (item.product && typeof item.product === "object" ? item.product : null);
const emptyDeliveryAddress = {
  label: "",
  recipientName: "",
  phoneNumber: "",
  postalCode: "",
  address: "",
  addressDetail: "",
  isDefault: false,
};
const koreanNamePattern = /^[가-힣]{2,20}$/;
const deliveryAddressLabelPattern = /^[가-힣A-Za-z0-9][가-힣A-Za-z0-9\s]{0,29}$/;
const postalCodePattern = /^\d{5}$/;
const daumPostcodeScriptId = "kakao-postcode-script";
const daumPostcodeScriptUrl = "https://t1.kakaocdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js";
const portOneScriptId = "portone-v1-sdk";
const portOneScriptUrl = "https://cdn.iamport.kr/v1/iamport.js";
const portOneCustomerCode = "imp74537423";
const portOneChannelKey = import.meta.env.VITE_PORTONE_CHANNEL_KEY;

const normalizeHangul = (value) => String(value || "").normalize("NFC");

const formatPhoneNumber = (value) => {
  const numbersOnly = String(value || "").replace(/\D/g, "").slice(0, 11);

  if (numbersOnly.length <= 3) return numbersOnly;
  if (numbersOnly.length <= 7) return `${numbersOnly.slice(0, 3)}-${numbersOnly.slice(3)}`;

  return `${numbersOnly.slice(0, 3)}-${numbersOnly.slice(3, 7)}-${numbersOnly.slice(7)}`;
};

const validateDeliveryAddressField = (fieldName, value) => {
  const normalizedValue = normalizeHangul(value).trim();

  if (fieldName === "label") {
    if (!normalizedValue) return "";
    return deliveryAddressLabelPattern.test(normalizedValue)
      ? ""
      : "배송지 이름은 한글 완성형, 영문, 숫자만 입력해주세요.";
  }

  if (fieldName === "recipientName") {
    if (!normalizedValue) return "수령인 이름을 입력해주세요.";
    return koreanNamePattern.test(normalizedValue) ? "" : "이름은 한글 2자 이상으로 입력해주세요.";
  }

  if (fieldName === "phoneNumber") {
    const phoneNumber = normalizedValue.replace(/\D/g, "");

    if (!phoneNumber) return "연락처를 입력해주세요.";
    if (!phoneNumber.startsWith("010")) return "휴대폰 번호는 010으로 시작해야 합니다.";
    return phoneNumber.length === 11 ? "" : "휴대폰 번호 11자리를 입력해주세요.";
  }

  if (fieldName === "postalCode") {
    if (!normalizedValue) return "우편번호를 입력해주세요.";
    return postalCodePattern.test(normalizedValue) ? "" : "우편번호 5자리를 입력해주세요.";
  }

  if (fieldName === "address") {
    if (!normalizedValue) return "기본 주소를 입력해주세요.";
    return normalizedValue.length >= 5 ? "" : "기본 주소를 정확히 입력해주세요.";
  }

  if (fieldName === "addressDetail") {
    return normalizedValue.length > 100 ? "상세 주소는 100자 이내로 입력해주세요." : "";
  }

  return "";
};

const validateDeliveryAddressForm = (deliveryAddress) => (
  ["label", "recipientName", "phoneNumber", "postalCode", "address", "addressDetail"].reduce((errors, fieldName) => {
    const error = validateDeliveryAddressField(fieldName, deliveryAddress[fieldName]);

    if (error) errors[fieldName] = error;
    return errors;
  }, {})
);

const formatPostcodeAddress = (data) => {
  let address = data.userSelectedType === "R" ? data.roadAddress : data.jibunAddress;

  if (data.userSelectedType === "R") {
    const extraAddressParts = [
      data.bname && /[동로가]$/u.test(data.bname) ? data.bname : "",
      data.buildingName && data.apartment === "Y" ? data.buildingName : "",
    ].filter(Boolean);

    if (extraAddressParts.length > 0) {
      address += ` (${extraAddressParts.join(", ")})`;
    }
  }

  return {
    postalCode: data.zonecode,
    address,
  };
};

const loadKakaoPostcode = () => new Promise((resolve, reject) => {
  if (window.kakao?.Postcode) {
    resolve();
    return;
  }

  const existingScript = document.getElementById(daumPostcodeScriptId);

  if (existingScript) {
    existingScript.addEventListener("load", resolve, { once: true });
    existingScript.addEventListener("error", () => reject(new Error("주소 검색 서비스를 불러오지 못했습니다.")), { once: true });
    return;
  }

  const script = document.createElement("script");
  script.id = daumPostcodeScriptId;
  script.src = daumPostcodeScriptUrl;
  script.async = true;
  script.onload = resolve;
  script.onerror = () => reject(new Error("주소 검색 서비스를 불러오지 못했습니다."));
  document.head.append(script);
});

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
  const [isAddressListLoading, setIsAddressListLoading] = useState(false);
  const [isAddressFormOpen, setIsAddressFormOpen] = useState(false);
  const [deliveryAddresses, setDeliveryAddresses] = useState([]);
  const [deliveryAddressForm, setDeliveryAddressForm] = useState(emptyDeliveryAddress);
  const [deliveryAddressErrors, setDeliveryAddressErrors] = useState({});
  const [editingAddressId, setEditingAddressId] = useState("");
  const [addressError, setAddressError] = useState("");
  const [isSavingAddress, setIsSavingAddress] = useState(false);
  const [deletingAddressId, setDeletingAddressId] = useState("");
  const [isPostcodeModalOpen, setIsPostcodeModalOpen] = useState(false);
  const [postcodeOnSelect, setPostcodeOnSelect] = useState(null);
  const [isPaymentRequesting, setIsPaymentRequesting] = useState(false);
  const [buyer, setBuyer] = useState(null);
  const postcodeContainerRef = useRef(null);

  const productAmount = useMemo(
    () => checkout?.items?.reduce((total, item) => total + (item.unitPrice * item.quantity), 0) || 0,
    [checkout],
  );

  useEffect(() => {
    if (!isPostcodeModalOpen || !postcodeOnSelect || !postcodeContainerRef.current || !window.kakao?.Postcode) {
      return undefined;
    }

    const postcodeContainer = postcodeContainerRef.current;
    const postcode = new window.kakao.Postcode({
      oncomplete: (data) => {
        postcodeOnSelect(formatPostcodeAddress(data));
        setIsPostcodeModalOpen(false);
        setPostcodeOnSelect(null);
      },
    });

    postcode.embed(postcodeContainer);

    return () => {
      postcodeContainer.replaceChildren();
    };
  }, [isPostcodeModalOpen, postcodeOnSelect]);

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

  const openAddressModal = async () => {
    setIsAddressModalOpen(true);
    setIsAddressFormOpen(false);
    setAddressError("");
    setIsAddressListLoading(true);

    try {
      const response = await fetch(`${apiBaseUrl}/auth/me/delivery-addresses`, {
        headers: {
          ...buildAuthHeaders(),
        },
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || "저장된 배송지를 불러오지 못했습니다.");
      }

      setDeliveryAddresses(Array.isArray(data.deliveryAddresses) ? data.deliveryAddresses : []);
    } catch (error) {
      setAddressError(error.message || "저장된 배송지를 불러오지 못했습니다.");
    } finally {
      setIsAddressListLoading(false);
    }
  };

  const closeAddressModal = () => {
    if (isSavingAddress || deletingAddressId) return;

    setIsAddressModalOpen(false);
    setIsAddressFormOpen(false);
    setAddressError("");
    setEditingAddressId("");
  };

  const updateDeliveryAddressField = (event) => {
    const { name, value, checked, type } = event.target;
    const nextValue = name === "phoneNumber"
      ? formatPhoneNumber(value)
      : name === "postalCode"
        ? value.replace(/\D/g, "").slice(0, 5)
        : normalizeHangul(value);

    setAddressError("");
    setDeliveryAddressForm((currentForm) => ({
      ...currentForm,
      [name]: type === "checkbox" ? checked : nextValue,
    }));
    setDeliveryAddressErrors((currentErrors) => {
      if (!currentErrors[name]) return currentErrors;

      const nextErrors = { ...currentErrors };
      const error = validateDeliveryAddressField(name, nextValue);

      if (error) {
        nextErrors[name] = error;
      } else {
        delete nextErrors[name];
      }

      return nextErrors;
    });
  };

  const validateDeliveryAddressInput = (event) => {
    const { name, value } = event.target;
    const error = validateDeliveryAddressField(name, value);

    setDeliveryAddressErrors((currentErrors) => {
      const nextErrors = { ...currentErrors };

      if (error) {
        nextErrors[name] = error;
      } else {
        delete nextErrors[name];
      }

      return nextErrors;
    });
  };

  const openPostcodeSearch = async (onSelectAddress) => {
    try {
      await loadKakaoPostcode();
      setPostcodeOnSelect(() => onSelectAddress);
      setIsPostcodeModalOpen(true);
    } catch (error) {
      setAddressError(error.message || "주소 검색 서비스를 불러오지 못했습니다.");
    }
  };

  const closePostcodeModal = () => {
    setIsPostcodeModalOpen(false);
    setPostcodeOnSelect(null);
  };

  const searchCheckoutAddress = () => {
    openPostcodeSearch(({ postalCode, address }) => {
      setForm((currentForm) => ({
        ...currentForm,
        postalCode,
        address,
      }));
    });
  };

  const searchDeliveryAddress = () => {
    openPostcodeSearch(({ postalCode, address }) => {
      setDeliveryAddressForm((currentForm) => ({
        ...currentForm,
        postalCode,
        address,
      }));
      setDeliveryAddressErrors((currentErrors) => {
        const nextErrors = { ...currentErrors };
        delete nextErrors.postalCode;
        delete nextErrors.address;
        return nextErrors;
      });
    });
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

  const saveDeliveryAddress = async (event) => {
    event.preventDefault();
    const nextErrors = validateDeliveryAddressForm(deliveryAddressForm);
    setDeliveryAddressErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    try {
      setIsSavingAddress(true);
      setAddressError("");

      const response = await fetch(
        editingAddressId
          ? `${apiBaseUrl}/auth/me/delivery-addresses/${editingAddressId}`
          : `${apiBaseUrl}/auth/me/delivery-addresses`,
        {
          method: editingAddressId ? "PATCH" : "POST",
          headers: {
            "Content-Type": "application/json",
            ...buildAuthHeaders(),
          },
          body: JSON.stringify({
            ...deliveryAddressForm,
            label: normalizeHangul(deliveryAddressForm.label).trim(),
            recipientName: normalizeHangul(deliveryAddressForm.recipientName).trim(),
            phoneNumber: deliveryAddressForm.phoneNumber.replace(/\D/g, ""),
            postalCode: deliveryAddressForm.postalCode.trim(),
            address: deliveryAddressForm.address.trim(),
            addressDetail: deliveryAddressForm.addressDetail.trim(),
          }),
        },
      );
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || `배송지를 ${editingAddressId ? "수정" : "등록"}하지 못했습니다.`);
      }

      setDeliveryAddresses(data.deliveryAddresses || []);
      setDeliveryAddressForm(emptyDeliveryAddress);
      setDeliveryAddressErrors({});
      setEditingAddressId("");
      setIsAddressFormOpen(false);
    } catch (error) {
      setAddressError(error.message || `배송지를 ${editingAddressId ? "수정" : "등록"}하지 못했습니다.`);
    } finally {
      setIsSavingAddress(false);
    }
  };

  const deleteDeliveryAddress = async (addressId) => {
    if (!window.confirm("이 배송지를 삭제할까요?")) return;

    try {
      setDeletingAddressId(addressId);
      setAddressError("");

      const response = await fetch(`${apiBaseUrl}/auth/me/delivery-addresses/${addressId}`, {
        method: "DELETE",
        headers: {
          ...buildAuthHeaders(),
        },
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || "배송지를 삭제하지 못했습니다.");
      }

      setDeliveryAddresses(data.deliveryAddresses || []);
    } catch (error) {
      setAddressError(error.message || "배송지를 삭제하지 못했습니다.");
    } finally {
      setDeletingAddressId("");
    }
  };

  const editDeliveryAddress = (deliveryAddress) => {
    const addressId = deliveryAddress.id || deliveryAddress._id;

    setEditingAddressId(addressId);
    setDeliveryAddressForm({
      label: deliveryAddress.label || "",
      recipientName: deliveryAddress.recipientName || "",
      phoneNumber: formatPhoneNumber(deliveryAddress.phoneNumber),
      postalCode: deliveryAddress.postalCode || "",
      address: deliveryAddress.address || "",
      addressDetail: deliveryAddress.addressDetail || "",
      isDefault: Boolean(deliveryAddress.isDefault),
    });
    setDeliveryAddressErrors({});
    setAddressError("");
    setIsAddressFormOpen(true);
  };

  const submitPayment = async (event) => {
    event.preventDefault();

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
          if (response.error_code) {
            window.alert("결제가 취소되었습니다.");
            setIsPaymentRequesting(false);
            return;
          }

          if (!response.imp_uid) {
            window.alert("결제가 취소되었습니다.");
            setIsPaymentRequesting(false);
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
    } catch {
      window.alert("결제창을 열지 못했습니다. 잠시 후 다시 시도해주세요.");
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
          </aside>
        </div>
      </main>
      <SiteFooter />
      {isPostcodeModalOpen && (
        <div className="postcode-modal-layer" role="presentation">
          <button className="postcode-modal-backdrop" type="button" aria-label="주소 검색 닫기" onClick={closePostcodeModal} />
          <section className="postcode-modal" aria-labelledby="postcode-modal-title" aria-modal="true" role="dialog">
            <header>
              <h2 id="postcode-modal-title">주소 검색</h2>
              <button type="button" aria-label="주소 검색 닫기" title="닫기" onClick={closePostcodeModal}>
                <X size={22} strokeWidth={1.8} />
              </button>
            </header>
            <div className="postcode-modal-content" ref={postcodeContainerRef} />
          </section>
        </div>
      )}
      {isAddressModalOpen && (
        <div className="delivery-address-modal-layer" role="presentation">
          <button className="delivery-address-modal-backdrop" type="button" aria-label="주소 관리 닫기" onClick={closeAddressModal} />
          <section className="delivery-address-modal" aria-labelledby="delivery-address-modal-title" aria-modal="true" role="dialog">
            <header>
              <div>
                <h2 id="delivery-address-modal-title">내 주소</h2>
                <p>배송지를 선택하거나 새 주소를 등록하세요.</p>
              </div>
              <button className="delivery-address-close-button" type="button" aria-label="주소 관리 닫기" title="닫기" onClick={closeAddressModal}>
                <X size={22} strokeWidth={1.8} />
              </button>
            </header>

            {addressError && <p className="delivery-address-error" role="alert">{addressError}</p>}

            {isAddressListLoading && <p className="delivery-address-empty">저장된 배송지를 불러오는 중입니다.</p>}

            {!isAddressListLoading && !isAddressFormOpen && (
              <div className="delivery-address-list-view">
                <button
                  className="delivery-address-add-button"
                  type="button"
                  onClick={() => {
                    setDeliveryAddressForm({
                      ...emptyDeliveryAddress,
                      isDefault: deliveryAddresses.length === 0,
                    });
                    setEditingAddressId("");
                    setIsAddressFormOpen(true);
                    setAddressError("");
                    setDeliveryAddressErrors({});
                  }}
                >
                  <Plus size={18} strokeWidth={2} />
                  새 배송지 등록
                </button>

                {deliveryAddresses.length === 0 ? (
                  <p className="delivery-address-empty">저장된 배송지가 없습니다.</p>
                ) : (
                  <div className="delivery-address-list">
                    {deliveryAddresses.map((deliveryAddress) => {
                      const addressId = deliveryAddress.id || deliveryAddress._id;
                      const isDeleting = deletingAddressId === addressId;

                      return (
                        <article className="delivery-address-item" key={addressId}>
                          <button className="delivery-address-select-button" type="button" disabled={isDeleting} onClick={() => selectDeliveryAddress(deliveryAddress)}>
                            <span className="delivery-address-item-heading">
                              <strong>{deliveryAddress.label || "배송지"}</strong>
                              {deliveryAddress.isDefault && <em>기본</em>}
                            </span>
                            <span>{deliveryAddress.recipientName} · {deliveryAddress.phoneNumber}</span>
                            <span>[{deliveryAddress.postalCode}] {deliveryAddress.address} {deliveryAddress.addressDetail}</span>
                          </button>
                          <span className="delivery-address-actions">
                            <button type="button" aria-label={`${deliveryAddress.label || "배송지"} 수정`} title="배송지 수정" disabled={isDeleting} onClick={() => editDeliveryAddress(deliveryAddress)}>
                              <Pencil size={16} strokeWidth={1.8} />
                            </button>
                            <button type="button" aria-label={`${deliveryAddress.label || "배송지"} 삭제`} title="배송지 삭제" disabled={isDeleting} onClick={() => deleteDeliveryAddress(addressId)}>
                              <Trash2 size={17} strokeWidth={1.8} />
                            </button>
                          </span>
                        </article>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {!isAddressListLoading && isAddressFormOpen && (
              <form className="delivery-address-form" onSubmit={saveDeliveryAddress}>
                <label>
                  <span>배송지 이름</span>
                  <input aria-invalid={Boolean(deliveryAddressErrors.label)} name="label" maxLength="30" onBlur={validateDeliveryAddressInput} onChange={updateDeliveryAddressField} placeholder="예: 집, 회사" value={deliveryAddressForm.label} />
                  {deliveryAddressErrors.label && <small>{deliveryAddressErrors.label}</small>}
                </label>
                <label>
                  <span>수령인</span>
                  <input aria-invalid={Boolean(deliveryAddressErrors.recipientName)} name="recipientName" onBlur={validateDeliveryAddressInput} onChange={updateDeliveryAddressField} placeholder="이름을 입력해주세요" value={deliveryAddressForm.recipientName} />
                  {deliveryAddressErrors.recipientName && <small>{deliveryAddressErrors.recipientName}</small>}
                </label>
                <label>
                  <span>연락처</span>
                  <input aria-invalid={Boolean(deliveryAddressErrors.phoneNumber)} inputMode="tel" maxLength="13" name="phoneNumber" onBlur={validateDeliveryAddressInput} onChange={updateDeliveryAddressField} placeholder="- 없이 숫자만 입력해주세요" value={deliveryAddressForm.phoneNumber} />
                  {deliveryAddressErrors.phoneNumber && <small>{deliveryAddressErrors.phoneNumber}</small>}
                </label>
                <label className="delivery-address-postal-field">
                  <span>우편번호</span>
                  <div>
                    <input aria-invalid={Boolean(deliveryAddressErrors.postalCode)} inputMode="numeric" maxLength="5" name="postalCode" onBlur={validateDeliveryAddressInput} onChange={updateDeliveryAddressField} placeholder="우편번호를 입력해주세요" value={deliveryAddressForm.postalCode} />
                    <button type="button" onClick={searchDeliveryAddress}>주소 검색</button>
                  </div>
                  {deliveryAddressErrors.postalCode && <small>{deliveryAddressErrors.postalCode}</small>}
                </label>
                <label>
                  <span>기본 주소</span>
                  <input aria-invalid={Boolean(deliveryAddressErrors.address)} name="address" onBlur={validateDeliveryAddressInput} onChange={updateDeliveryAddressField} placeholder="기본주소를 입력해주세요" value={deliveryAddressForm.address} />
                  {deliveryAddressErrors.address && <small>{deliveryAddressErrors.address}</small>}
                </label>
                <label>
                  <span>상세 주소</span>
                  <input aria-invalid={Boolean(deliveryAddressErrors.addressDetail)} maxLength="100" name="addressDetail" onBlur={validateDeliveryAddressInput} onChange={updateDeliveryAddressField} placeholder="상세주소를 입력해주세요 (선택사항)" value={deliveryAddressForm.addressDetail} />
                  {deliveryAddressErrors.addressDetail && <small>{deliveryAddressErrors.addressDetail}</small>}
                </label>
                <label className="delivery-address-default-field">
                  <input checked={deliveryAddressForm.isDefault} name="isDefault" onChange={updateDeliveryAddressField} type="checkbox" />
                  <span>기본 배송지로 저장</span>
                </label>
                <div className="delivery-address-form-actions">
                  <button type="button" disabled={isSavingAddress} onClick={() => {
                    setIsAddressFormOpen(false);
                    setDeliveryAddressErrors({});
                    setEditingAddressId("");
                  }}>취소</button>
                  <button type="submit" disabled={isSavingAddress}>{isSavingAddress ? "저장 중" : editingAddressId ? "배송지 수정" : "배송지 등록"}</button>
                </div>
              </form>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

export default CheckoutPage;
