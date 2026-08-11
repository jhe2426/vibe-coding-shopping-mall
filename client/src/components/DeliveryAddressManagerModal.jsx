import { useEffect, useRef, useState } from "react";
import { Pencil, Plus, Trash2, X } from "lucide-react";

import { buildAuthHeaders } from "../utils/auth-storage.js";
import { formatPostcodeAddress, loadKakaoPostcode } from "../utils/kakao-postcode.js";

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "/api";
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

function DeliveryAddressManagerModal({ isOpen, onClose, onAddressSelect, onAddressesChange }) {
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
  const postcodeContainerRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return undefined;

    let isMounted = true;

    const loadDeliveryAddresses = async () => {
      setIsAddressListLoading(true);
      setIsAddressFormOpen(false);
      setAddressError("");
      setEditingAddressId("");

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

        if (isMounted) {
          setDeliveryAddresses(Array.isArray(data.deliveryAddresses) ? data.deliveryAddresses : []);
        }
      } catch (error) {
        if (isMounted) {
          setAddressError(error.message || "저장된 배송지를 불러오지 못했습니다.");
        }
      } finally {
        if (isMounted) {
          setIsAddressListLoading(false);
        }
      }
    };

    loadDeliveryAddresses();

    return () => {
      isMounted = false;
    };
  }, [isOpen]);

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

  if (!isOpen) return null;

  const closeAddressModal = () => {
    if (isSavingAddress || deletingAddressId) return;

    setIsAddressFormOpen(false);
    setIsPostcodeModalOpen(false);
    setAddressError("");
    setEditingAddressId("");
    onClose?.();
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

  const searchDeliveryAddress = async () => {
    try {
      await loadKakaoPostcode();
      setPostcodeOnSelect(() => ({ postalCode, address }) => {
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
      setIsPostcodeModalOpen(true);
    } catch (error) {
      setAddressError(error.message || "주소 검색 서비스를 불러오지 못했습니다.");
    }
  };

  const saveDeliveryAddress = async (event) => {
    event.preventDefault();
    const nextErrors = validateDeliveryAddressForm(deliveryAddressForm);
    const isEditing = Boolean(editingAddressId);

    setDeliveryAddressErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) return;

    try {
      setIsSavingAddress(true);
      setAddressError("");

      const response = await fetch(
        isEditing
          ? `${apiBaseUrl}/auth/me/delivery-addresses/${editingAddressId}`
          : `${apiBaseUrl}/auth/me/delivery-addresses`,
        {
          method: isEditing ? "PATCH" : "POST",
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
        throw new Error(data.message || `배송지를 ${isEditing ? "수정" : "등록"}하지 못했습니다.`);
      }

      const nextAddresses = Array.isArray(data.deliveryAddresses) ? data.deliveryAddresses : [];
      setDeliveryAddresses(nextAddresses);
      onAddressesChange?.(nextAddresses);
      setDeliveryAddressForm(emptyDeliveryAddress);
      setDeliveryAddressErrors({});
      setEditingAddressId("");
      setIsAddressFormOpen(false);
    } catch (error) {
      setAddressError(error.message || `배송지를 ${isEditing ? "수정" : "등록"}하지 못했습니다.`);
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

      const nextAddresses = Array.isArray(data.deliveryAddresses) ? data.deliveryAddresses : [];
      setDeliveryAddresses(nextAddresses);
      onAddressesChange?.(nextAddresses);
    } catch (error) {
      setAddressError(error.message || "배송지를 삭제하지 못했습니다.");
    } finally {
      setDeletingAddressId("");
    }
  };

  const editDeliveryAddress = (deliveryAddress) => {
    setEditingAddressId(deliveryAddress.id || deliveryAddress._id);
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

  const selectDeliveryAddress = (deliveryAddress) => {
    onAddressSelect?.(deliveryAddress);
    closeAddressModal();
  };

  return (
    <>
      {isPostcodeModalOpen && (
        <div className="postcode-modal-layer" role="presentation">
          <button className="postcode-modal-backdrop" type="button" aria-label="주소 검색 닫기" onClick={() => setIsPostcodeModalOpen(false)} />
          <section className="postcode-modal" aria-labelledby="postcode-modal-title" aria-modal="true" role="dialog">
            <header>
              <h2 id="postcode-modal-title">주소 검색</h2>
              <button type="button" aria-label="주소 검색 닫기" title="닫기" onClick={() => setIsPostcodeModalOpen(false)}>
                <X size={22} strokeWidth={1.8} />
              </button>
            </header>
            <div className="postcode-modal-content" ref={postcodeContainerRef} />
          </section>
        </div>
      )}

      <div className="delivery-address-modal-layer" role="presentation">
        <button className="delivery-address-modal-backdrop" type="button" aria-label="주소 관리 닫기" onClick={closeAddressModal} />
        <section className="delivery-address-modal" aria-labelledby="delivery-address-modal-title" aria-modal="true" role="dialog">
          <header>
            <div>
              <h2 id="delivery-address-modal-title">내 주소</h2>
              <p>{onAddressSelect ? "배송지를 선택하거나 새 주소를 등록하세요." : "배송지를 수정하거나 기본 배송지를 변경하세요."}</p>
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
                  setDeliveryAddressForm({ ...emptyDeliveryAddress, isDefault: deliveryAddresses.length === 0 });
                  setEditingAddressId("");
                  setAddressError("");
                  setDeliveryAddressErrors({});
                  setIsAddressFormOpen(true);
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
                    const addressContents = <>
                      <span className="delivery-address-item-heading">
                        <strong>{deliveryAddress.label || "배송지"}</strong>
                        {deliveryAddress.isDefault && <em>기본</em>}
                      </span>
                      <span>{deliveryAddress.recipientName} · {formatPhoneNumber(deliveryAddress.phoneNumber)}</span>
                      <span>[{deliveryAddress.postalCode}] {deliveryAddress.address} {deliveryAddress.addressDetail}</span>
                    </>;

                    return (
                      <article className="delivery-address-item" key={addressId}>
                        {onAddressSelect ? (
                          <button className="delivery-address-select-button" type="button" disabled={isDeleting} onClick={() => selectDeliveryAddress(deliveryAddress)}>
                            {addressContents}
                          </button>
                        ) : (
                          <div className="delivery-address-info">{addressContents}</div>
                        )}
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
    </>
  );
}

export default DeliveryAddressManagerModal;
