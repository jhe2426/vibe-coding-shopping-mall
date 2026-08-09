import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

import NavigationBar from "../components/NavigationBar.jsx";
import SiteFooter from "../components/SiteFooter.jsx";
import { buildAuthHeaders, getAuthToken } from "../utils/auth-storage.js";
import { clearGuestCart, deleteGuestCartItem, getGuestCart, updateGuestCartItem } from "../utils/guest-cart.js";

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "/api";
const formatPrice = (price) => `${Number(price || 0).toLocaleString("ko-KR")} 원`;

const categoryLabels = {
  SNEAKERS: "스니커즈",
  SPORTS: "스포츠화",
  SANDALS: "샌들",
  DRESS_SHOES: "구두",
  CASUAL: "캐주얼화",
};

const getCartItemId = (item) => item.id || item._id;
const getProduct = (item) => (item.product && typeof item.product === "object" ? item.product : null);

function CartPage() {
  const navigate = useNavigate();
  const [cart, setCart] = useState({ items: [], totalAmount: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [pendingItemId, setPendingItemId] = useState(null);
  const [isClearing, setIsClearing] = useState(false);
  const [quantityInputs, setQuantityInputs] = useState({});
  const [invalidQuantityItemId, setInvalidQuantityItemId] = useState(null);
  const [quantityNotice, setQuantityNotice] = useState(null);
  const [selectedItemIds, setSelectedItemIds] = useState(() => new Set());
  const selectAllCheckboxRef = useRef(null);

  const loadCart = async () => {
    if (!getAuthToken()) {
      const guestCart = getGuestCart();
      setCart(guestCart);
      setSelectedItemIds(new Set(guestCart.items.map(getCartItemId)));
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setLoadError("");

      const response = await fetch(`${apiBaseUrl}/cart`, {
        headers: {
          ...buildAuthHeaders(),
        },
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || "장바구니를 불러오지 못했습니다.");
      }

      const items = Array.isArray(data.items) ? data.items : [];
      setCart({ items, totalAmount: data.totalAmount || 0 });
      setSelectedItemIds(new Set(items.map(getCartItemId)));
    } catch (error) {
      setLoadError(error.message || "장바구니를 불러오지 못했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void Promise.resolve().then(loadCart);
  }, [navigate]);

  useEffect(() => {
    if (!quantityNotice) {
      return undefined;
    }

    const timer = window.setTimeout(() => setQuantityNotice(null), 2600);
    return () => window.clearTimeout(timer);
  }, [quantityNotice]);

  const itemCount = useMemo(() => cart.items.reduce((count, item) => count + item.quantity, 0), [cart.items]);
  const selectedItems = useMemo(
    () => cart.items.filter((item) => selectedItemIds.has(getCartItemId(item))),
    [cart.items, selectedItemIds],
  );
  const selectedTotalAmount = useMemo(
    () => selectedItems.reduce((total, item) => total + (item.unitPrice * item.quantity), 0),
    [selectedItems],
  );
  const isAllItemsSelected = cart.items.length > 0 && selectedItems.length === cart.items.length;
  const hasPartialSelection = selectedItems.length > 0 && !isAllItemsSelected;

  useEffect(() => {
    if (selectAllCheckboxRef.current) {
      selectAllCheckboxRef.current.indeterminate = hasPartialSelection;
    }
  }, [hasPartialSelection]);

  const toggleItemSelection = (itemId) => {
    setSelectedItemIds((currentSelection) => {
      const nextSelection = new Set(currentSelection);

      if (nextSelection.has(itemId)) {
        nextSelection.delete(itemId);
      } else {
        nextSelection.add(itemId);
      }

      return nextSelection;
    });
  };

  const toggleAllItemSelection = () => {
    setSelectedItemIds(isAllItemsSelected ? new Set() : new Set(cart.items.map(getCartItemId)));
  };

  const clearQuantityInputError = (itemId) => {
    setInvalidQuantityItemId((currentItemId) => (currentItemId === itemId ? null : currentItemId));
  };

  const showQuantityInputError = (itemId, message) => {
    setInvalidQuantityItemId(itemId);
    setQuantityNotice({ message });
  };

  const updateQuantity = async (item, quantity) => {
    const itemId = getCartItemId(item);

    if (!getAuthToken()) {
      try {
        const guestCart = updateGuestCartItem(itemId, quantity);
        setCart(guestCart);
        setQuantityInputs((currentInputs) => ({ ...currentInputs, [itemId]: String(quantity) }));
        clearQuantityInputError(itemId);
        window.dispatchEvent(new Event("stride-cart-change"));
      } catch (error) {
        setQuantityInputs((currentInputs) => ({ ...currentInputs, [itemId]: String(item.quantity) }));
        showQuantityInputError(itemId, error.message || "수량을 변경하지 못했습니다.");
      }
      return;
    }

    try {
      setPendingItemId(itemId);
      setLoadError("");

      const response = await fetch(`${apiBaseUrl}/cart/items/${itemId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...buildAuthHeaders(),
        },
        body: JSON.stringify({ quantity }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || "수량을 변경하지 못했습니다.");
      }

      setCart({ items: data.items || [], totalAmount: data.totalAmount || 0 });
      setQuantityInputs((currentInputs) => ({ ...currentInputs, [itemId]: String(quantity) }));
      clearQuantityInputError(itemId);
      window.dispatchEvent(new Event("stride-cart-change"));
    } catch (error) {
      setQuantityInputs((currentInputs) => ({ ...currentInputs, [itemId]: String(item.quantity) }));
      showQuantityInputError(itemId, error.message || "수량을 변경하지 못했습니다.");
    } finally {
      setPendingItemId(null);
    }
  };

  const commitQuantityInput = (item, stockQuantity) => {
    const itemId = getCartItemId(item);
    const value = quantityInputs[itemId] ?? String(item.quantity);
    const quantity = Number(value);

    if (!Number.isInteger(quantity) || quantity < 1 || quantity > stockQuantity) {
      setQuantityInputs((currentInputs) => ({ ...currentInputs, [itemId]: String(item.quantity) }));
      showQuantityInputError(itemId, `수량은 1~${stockQuantity}개 사이로 입력해 주세요.`);
      return;
    }

    if (quantity === item.quantity) {
      setQuantityInputs((currentInputs) => ({ ...currentInputs, [itemId]: String(item.quantity) }));
      clearQuantityInputError(itemId);
      return;
    }

    void updateQuantity(item, quantity);
  };

  const deleteItem = async (item) => {
    const itemId = getCartItemId(item);

    if (!getAuthToken()) {
      const guestCart = deleteGuestCartItem(itemId);
      setCart(guestCart);
      setSelectedItemIds((currentSelection) => {
        const nextSelection = new Set(currentSelection);
        nextSelection.delete(itemId);
        return nextSelection;
      });
      window.dispatchEvent(new Event("stride-cart-change"));
      return;
    }

    try {
      setPendingItemId(itemId);
      setLoadError("");

      const response = await fetch(`${apiBaseUrl}/cart/items/${itemId}`, {
        method: "DELETE",
        headers: {
          ...buildAuthHeaders(),
        },
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || "상품을 삭제하지 못했습니다.");
      }

      setCart({ items: data.items || [], totalAmount: data.totalAmount || 0 });
      setSelectedItemIds((currentSelection) => {
        const nextSelection = new Set(currentSelection);
        nextSelection.delete(itemId);
        return nextSelection;
      });
      window.dispatchEvent(new Event("stride-cart-change"));
    } catch (error) {
      setLoadError(error.message || "상품을 삭제하지 못했습니다.");
    } finally {
      setPendingItemId(null);
    }
  };

  const clearCart = async () => {
    if (!getAuthToken()) {
      setCart(clearGuestCart());
      setSelectedItemIds(new Set());
      window.dispatchEvent(new Event("stride-cart-change"));
      return;
    }

    try {
      setIsClearing(true);
      setLoadError("");

      const response = await fetch(`${apiBaseUrl}/cart`, {
        method: "DELETE",
        headers: {
          ...buildAuthHeaders(),
        },
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || "장바구니를 비우지 못했습니다.");
      }

      setCart({ items: data.items || [], totalAmount: data.totalAmount || 0 });
      setSelectedItemIds(new Set());
      window.dispatchEvent(new Event("stride-cart-change"));
    } catch (error) {
      setLoadError(error.message || "장바구니를 비우지 못했습니다.");
    } finally {
      setIsClearing(false);
    }
  };

  const handleCheckout = () => {
    if (!getAuthToken()) {
      navigate("/login", { state: { from: "/cart" } });
      return;
    }

    navigate("/checkout", {
      state: {
        checkout: {
          items: selectedItems,
          totalAmount: selectedTotalAmount,
        },
      },
    });
  };

  return (
    <div className="cart-page">
      <NavigationBar />

      <main className="cart-main">
        <Link className="cart-continue-link" to="/">
          <ArrowLeft size={17} strokeWidth={1.9} />
          쇼핑 계속하기
        </Link>

        <div className="cart-heading-row">
          <div>
            <h1>장바구니</h1>
            {!isLoading && <p>총 {itemCount}개의 상품이 담겨 있습니다.</p>}
          </div>
          {!isLoading && cart.items.length > 0 && (
            <button className="cart-clear-button" type="button" disabled={isClearing} onClick={clearCart}>
              전체 삭제
            </button>
          )}
        </div>

        {isLoading && <p className="cart-message">장바구니를 불러오는 중입니다.</p>}
        {!isLoading && loadError && <p className="cart-message is-error">{loadError}</p>}

        {!isLoading && !loadError && cart.items.length === 0 && (
          <section className="cart-empty-state">
            <ShoppingBag size={36} strokeWidth={1.6} />
            <h2>장바구니가 비어 있습니다.</h2>
            <Link to="/">상품 둘러보기</Link>
          </section>
        )}

        {!isLoading && !loadError && cart.items.length > 0 && (
          <div className="cart-content-grid">
            <section className="cart-item-list" aria-label="장바구니 상품">
              <div className="cart-selection-header">
                <label>
                  <input
                    ref={selectAllCheckboxRef}
                    checked={isAllItemsSelected}
                    onChange={toggleAllItemSelection}
                    type="checkbox"
                  />
                  <span>전체 선택</span>
                </label>
                <span>{selectedItems.length}개 선택</span>
              </div>
              {cart.items.map((item) => {
                const product = getProduct(item);
                const itemId = getCartItemId(item);
                const stockQuantity = product?.sizes?.find((sizeItem) => sizeItem.size === item.size)?.stockQuantity ?? 99;
                const isPending = pendingItemId === itemId;
                const quantityInput = quantityInputs[itemId] ?? String(item.quantity);
                const isQuantityInputInvalid = invalidQuantityItemId === itemId;
                const isSelected = selectedItemIds.has(itemId);

                return (
                  <article className="cart-item" key={itemId}>
                    <label className="cart-item-select">
                      <input
                        aria-label={`${product?.name || "상품"} 선택`}
                        checked={isSelected}
                        disabled={isPending}
                        onChange={() => toggleItemSelection(itemId)}
                        type="checkbox"
                      />
                    </label>
                    <Link className="cart-item-image" to={`/products/${item.productId}`}>
                      {product?.cardImages?.defaultImage ? <img src={product.cardImages.defaultImage} alt={product.name} /> : <span>상품 이미지</span>}
                    </Link>

                    <div className="cart-item-copy">
                      <Link to={`/products/${item.productId}`}>
                        <h2>{product?.name || item.productId}</h2>
                      </Link>
                      <p>{product ? `${product.targetGender === "WOMEN" ? "여성" : product.targetGender === "MEN" ? "남성" : "공용"} ${categoryLabels[product.category] || "슈즈"}` : "상품 정보"}</p>
                      <dl>
                        <div><dt>사이즈</dt><dd>{item.size}</dd></div>
                      </dl>
                    </div>
                      <div className="cart-item-controls">
                        <div className="cart-quantity-stepper" aria-label={`${product?.name || "상품"} 수량`}>
                          <button type="button" aria-label="수량 줄이기" disabled={isPending || item.quantity <= 1} onClick={() => updateQuantity(item, item.quantity - 1)}>
                            <Minus size={16} strokeWidth={2.2} />
                          </button>
                          <input
                            aria-invalid={isQuantityInputInvalid || undefined}
                            aria-label="수량 직접 입력"
                            disabled={isPending}
                            inputMode="numeric"
                            maxLength={3}
                            onBlur={() => commitQuantityInput(item, stockQuantity)}
                            onChange={(event) => {
                              const nextValue = event.target.value;

                              if (/^\d*$/.test(nextValue)) {
                                setQuantityInputs((currentInputs) => ({ ...currentInputs, [itemId]: nextValue }));
                                clearQuantityInputError(itemId);
                              } else {
                                showQuantityInputError(itemId, "수량은 숫자로 입력해 주세요.");
                              }
                            }}
                            onKeyDown={(event) => {
                              if (event.key === "Enter") {
                                event.preventDefault();
                                event.currentTarget.blur();
                              }
                            }}
                            value={quantityInput}
                          />
                          <button type="button" aria-label="수량 늘리기" disabled={isPending || item.quantity >= stockQuantity} onClick={() => updateQuantity(item, item.quantity + 1)}>
                            <Plus size={16} strokeWidth={2.2} />
                          </button>
                        </div>
                      </div>

                    <strong className="cart-item-price">{formatPrice(item.unitPrice * item.quantity)}</strong>
                    <button className="cart-item-delete-button" type="button" disabled={isPending} onClick={() => deleteItem(item)}>
                      <Trash2 size={17} strokeWidth={1.8} />
                      삭제
                    </button>
                  </article>
                );
              })}
            </section>

            <aside className="cart-order-summary">
              <h2>주문 금액</h2>
              <dl>
                <div><dt>상품 금액</dt><dd>{formatPrice(selectedTotalAmount)}</dd></div>
                <div><dt>배송비</dt><dd>무료</dd></div>
              </dl>
              <div className="cart-summary-total"><span>총 결제 금액</span><strong>{formatPrice(selectedTotalAmount)}</strong></div>
              <button type="button" disabled={selectedItems.length === 0} onClick={handleCheckout}>주문하기</button>
              <ul>
                <li><strong>전 상품 무료 배송</strong><span>영업일 기준 2~4일 내 배송</span></li>
                <li><strong>30일 무료 반품</strong><span>미착용 상품에 한해 가능</span></li>
                <li><strong>안전한 결제</strong><span>개인정보를 안전하게 보호합니다</span></li>
              </ul>
            </aside>
          </div>
        )}
      </main>

      <SiteFooter />
      {quantityNotice && <p className="cart-quantity-toast" role="status">{quantityNotice.message}</p>}
    </div>
  );
}

export default CartPage;
