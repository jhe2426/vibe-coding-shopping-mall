import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Heart, Trash2 } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

import { deleteProductLike, fetchProductLikes, getProductLikeKey } from "../api/product-likes.js";
import NavigationBar from "../components/NavigationBar.jsx";
import SiteFooter from "../components/SiteFooter.jsx";
import { buildAuthHeaders, getAuthToken } from "../utils/auth-storage.js";

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "/api";
const formatPrice = (price) => `${Number(price || 0).toLocaleString("ko-KR")} 원`;

const categoryLabels = {
  SNEAKERS: "스니커즈",
  SPORTS: "스포츠화",
  SANDALS: "샌들",
  DRESS_SHOES: "구두",
  CASUAL: "캐주얼화",
};

const getLikeId = (like) => like.id || like._id || like.productId;
const getProduct = (like) => (like.product && typeof like.product === "object" ? like.product : null);
const getCartQuantityKey = (productId, size) => `${productId}:${size}`;
const getSortedSizeItems = (product) => [...(product?.sizes || [])].sort((first, second) => first.size - second.size);
const getRemainingStock = (productId, sizeItem, cartQuantityMap) => (
  sizeItem.stockQuantity - (cartQuantityMap.get(getCartQuantityKey(productId, sizeItem.size)) || 0)
);

function WishlistPage() {
  const navigate = useNavigate();
  const [likes, setLikes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [cartItems, setCartItems] = useState([]);
  const [pendingProductId, setPendingProductId] = useState(null);
  const [isClearing, setIsClearing] = useState(false);
  const [selectedLikeIds, setSelectedLikeIds] = useState(() => new Set());
  const [selectedSizes, setSelectedSizes] = useState({});
  const [isAddingSelected, setIsAddingSelected] = useState(false);
  const selectAllCheckboxRef = useRef(null);

  useEffect(() => {
    let isMounted = true;

    const loadWishlist = async () => {
      if (!getAuthToken()) {
        navigate("/login", { state: { from: "/wishlist" }, replace: true });
        return;
      }

      try {
        setIsLoading(true);
        setLoadError("");

        const [data, cartResponse] = await Promise.all([
          fetchProductLikes(apiBaseUrl),
          fetch(`${apiBaseUrl}/cart`, {
            headers: {
              ...buildAuthHeaders(),
            },
          }),
        ]);
        const cartData = await cartResponse.json().catch(() => ({}));

        if (!cartResponse.ok) {
          throw new Error(cartData.message || "장바구니 정보를 불러오지 못했습니다.");
        }

        const nextCartItems = Array.isArray(cartData.items) ? cartData.items : [];

        if (isMounted) {
          setLikes(data);
          setCartItems(nextCartItems);
          setSelectedLikeIds(new Set());
          setSelectedSizes({});
        }
      } catch (error) {
        if (isMounted) {
          setLoadError(error.message || "찜한 상품을 불러오지 못했습니다.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadWishlist();

    return () => {
      isMounted = false;
    };
  }, [navigate]);

  const cartQuantityMap = useMemo(() => (
    new Map(cartItems.map((item) => [
      getCartQuantityKey(item.productId, item.size),
      item.quantity,
    ]))
  ), [cartItems]);
  const wishlistItemStatusMap = useMemo(() => (
    new Map(likes.map((like) => {
      const product = getProduct(like);
      const likeId = getLikeId(like);
      const productId = like.productId || getProductLikeKey(product);
      const selectedSize = Number(selectedSizes[likeId] || 0);
      const availableSizeItems = productId
        ? getSortedSizeItems(product).filter((sizeItem) => getRemainingStock(productId, sizeItem, cartQuantityMap) > 0)
        : [];
      const selectedSizeItem = availableSizeItems.find((sizeItem) => sizeItem.size === selectedSize);

      return [
        likeId,
        {
          availableSizeItems,
          canAdd: Boolean(selectedSizeItem),
          hasAvailableStock: availableSizeItems.length > 0,
          size: selectedSizeItem?.size,
        },
      ];
    }))
  ), [cartQuantityMap, likes, selectedSizes]);
  const selectedLikes = useMemo(
    () => likes.filter((like) => selectedLikeIds.has(getLikeId(like))),
    [likes, selectedLikeIds],
  );
  const canAddSelectedItems = selectedLikes.length > 0 && selectedLikes.every(
    (like) => wishlistItemStatusMap.get(getLikeId(like))?.canAdd,
  );
  const cartValidationMessage = useMemo(() => {
    if (selectedLikes.length === 0 || canAddSelectedItems) return "";

    const unavailableCount = selectedLikes.filter(
      (like) => !wishlistItemStatusMap.get(getLikeId(like))?.hasAvailableStock,
    ).length;

    if (unavailableCount > 0) {
      return `선택한 상품 중 ${unavailableCount}개는 재고가 부족합니다.`;
    }

    const sizeRequiredCount = selectedLikes.filter(
      (like) => !wishlistItemStatusMap.get(getLikeId(like))?.canAdd,
    ).length;

    return `선택한 ${sizeRequiredCount}개 상품의 사이즈를 선택해 주세요.`;
  }, [canAddSelectedItems, selectedLikes, wishlistItemStatusMap]);
  const selectedTotalAmount = useMemo(() => (
    selectedLikes.reduce((total, like) => {
      const product = getProduct(like);
      return total + Number(product?.salePrice ?? product?.regularPrice ?? 0);
    }, 0)
  ), [selectedLikes]);
  const isAllItemsSelected = likes.length > 0 && selectedLikes.length === likes.length;
  const hasPartialSelection = selectedLikes.length > 0 && !isAllItemsSelected;

  useEffect(() => {
    if (selectAllCheckboxRef.current) {
      selectAllCheckboxRef.current.indeterminate = hasPartialSelection;
    }
  }, [hasPartialSelection]);

  const toggleLikeSelection = (likeId) => {
    setSelectedLikeIds((currentSelection) => {
      const nextSelection = new Set(currentSelection);

      if (nextSelection.has(likeId)) {
        nextSelection.delete(likeId);
      } else {
        nextSelection.add(likeId);
      }

      return nextSelection;
    });
  };

  const toggleAllLikeSelection = () => {
    setSelectedLikeIds(isAllItemsSelected ? new Set() : new Set(likes.map(getLikeId)));
  };

  const removeWishlistItem = async (like) => {
    const productId = like.productId || getProductLikeKey(getProduct(like));
    const likeId = getLikeId(like);

    if (!productId) return;

    try {
      setPendingProductId(productId);
      setLoadError("");

      await deleteProductLike(apiBaseUrl, productId);

      setLikes((currentLikes) => currentLikes.filter((item) => item.productId !== productId));
      setSelectedLikeIds((currentSelection) => {
        const nextSelection = new Set(currentSelection);
        nextSelection.delete(likeId);
        return nextSelection;
      });
      setSelectedSizes((currentSizes) => {
        const nextSizes = { ...currentSizes };
        delete nextSizes[likeId];
        return nextSizes;
      });
    } catch (error) {
      setLoadError(error.message || "찜한 상품을 삭제하지 못했습니다.");
    } finally {
      setPendingProductId(null);
    }
  };

  const clearWishlist = async () => {
    try {
      setIsClearing(true);
      setLoadError("");

      await Promise.all(likes.map((like) => deleteProductLike(apiBaseUrl, like.productId)));
      setLikes([]);
      setSelectedLikeIds(new Set());
      setSelectedSizes({});
    } catch (error) {
      setLoadError(error.message || "찜한 상품을 비우지 못했습니다.");
    } finally {
      setIsClearing(false);
    }
  };

  const addSelectedItemsToCart = async () => {
    if (!canAddSelectedItems) return;

    try {
      setIsAddingSelected(true);
      setLoadError("");

      for (const like of selectedLikes) {
        const product = getProduct(like);
        const productId = like.productId || getProductLikeKey(product);
        const size = wishlistItemStatusMap.get(getLikeId(like))?.size;

        if (!productId || !size) {
          throw new Error(`${product?.name || "선택한 상품"}의 사이즈를 선택해 주세요.`);
        }

        const response = await fetch(`${apiBaseUrl}/cart/items`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...buildAuthHeaders(),
          },
          body: JSON.stringify({
            productId,
            size,
            quantity: 1,
          }),
        });
        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(data.message || `${product?.name || "상품"}을 장바구니에 담지 못했습니다.`);
        }
      }

      window.dispatchEvent(new Event("stride-cart-change"));
      navigate("/cart");
    } catch (error) {
      setLoadError(error.message || "선택한 상품을 장바구니에 담지 못했습니다.");
    } finally {
      setIsAddingSelected(false);
    }
  };

  return (
    <div className="cart-page wishlist-page">
      <NavigationBar />

      <main className="cart-main wishlist-main">
        <Link className="cart-continue-link" to="/">
          <ArrowLeft size={17} strokeWidth={1.9} />
          쇼핑 계속하기
        </Link>

        <div className="cart-heading-row wishlist-heading-row">
          <div>
            <h1>찜한 상품</h1>
            {!isLoading && <p>관심 있는 상품 {likes.length}개를 모아두었습니다.</p>}
          </div>
          {!isLoading && likes.length > 0 && (
            <button className="cart-clear-button" type="button" disabled={isClearing} onClick={clearWishlist}>
              전체 삭제
            </button>
          )}
        </div>

        {isLoading && <p className="cart-message">찜한 상품을 불러오는 중입니다.</p>}
        {!isLoading && loadError && <p className="cart-message is-error">{loadError}</p>}

        {!isLoading && !loadError && likes.length === 0 && (
          <section className="cart-empty-state wishlist-empty-state">
            <Heart size={38} strokeWidth={1.6} />
            <h2>아직 찜한 상품이 없습니다.</h2>
            <Link to="/">상품 둘러보기</Link>
          </section>
        )}

        {!isLoading && !loadError && likes.length > 0 && (
          <div className="cart-content-grid wishlist-content-grid">
            <section className="cart-item-list wishlist-item-list" aria-label="찜한 상품">
              <div className="cart-selection-header wishlist-list-header">
                <label>
                  <input
                    ref={selectAllCheckboxRef}
                    checked={isAllItemsSelected}
                    disabled={likes.length === 0}
                    onChange={toggleAllLikeSelection}
                    type="checkbox"
                  />
                  <span>전체 선택</span>
                </label>
                <span>{selectedLikes.length}개 선택</span>
              </div>

              {likes.map((like) => {
                const product = getProduct(like);
                const productId = like.productId || getProductLikeKey(product);
                const likeId = getLikeId(like);
                const itemStatus = wishlistItemStatusMap.get(likeId);
                const selectedSize = selectedSizes[likeId] || "";
                const hasAvailableStock = Boolean(itemStatus?.hasAvailableStock);
                const isPending = pendingProductId === productId;
                const isSelected = selectedLikeIds.has(likeId);

                return (
                  <article className={`cart-item wishlist-item ${hasAvailableStock ? "" : "is-unavailable"} ${hasAvailableStock && !selectedSize ? "is-size-required" : ""}`} key={likeId}>
                    <label className="cart-item-select wishlist-item-select">
                      <input
                        aria-label={`${product?.name || "상품"} 선택`}
                        checked={isSelected}
                        disabled={isPending || isAddingSelected}
                        onChange={() => toggleLikeSelection(likeId)}
                        type="checkbox"
                      />
                    </label>

                    <Link className="cart-item-image wishlist-item-image" to={`/products/${productId}`}>
                      {product?.cardImages?.defaultImage ? <img src={product.cardImages.defaultImage} alt={product.name} /> : <span>상품 이미지</span>}
                    </Link>

                    <div className="cart-item-copy wishlist-item-copy">
                      <Link to={`/products/${productId}`}>
                        <h2>{product?.name || productId}</h2>
                      </Link>
                      <p>{product ? `${product.targetGender === "WOMEN" ? "여성" : product.targetGender === "MEN" ? "남성" : "공용"} ${categoryLabels[product.category] || "슈즈"}` : "상품 정보"}</p>
                      <dl>
                        <div><dt>브랜드</dt><dd>{product?.brand || "STRIDE"}</dd></div>
                      </dl>
                      {!hasAvailableStock && <p className="wishlist-stock-message">재고 수량 부족</p>}
                      {hasAvailableStock && !selectedSize && <p className="wishlist-size-message">사이즈 선택 필요</p>}
                    </div>

                    <div className="cart-item-controls wishlist-item-controls">
                      <label className="wishlist-size-field">
                        <span>사이즈</span>
                        <select
                          value={selectedSize}
                          disabled={!hasAvailableStock || isAddingSelected}
                          onChange={(event) => {
                            const nextSize = event.target.value;

                            setSelectedSizes((currentSizes) => ({
                              ...currentSizes,
                              [likeId]: nextSize,
                            }));
                          }}
                        >
                          <option value="">선택</option>
                          {(itemStatus?.availableSizeItems || []).map((sizeItem) => (
                            <option value={sizeItem.size} key={sizeItem.size}>
                              {sizeItem.size}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>

                    <strong className="cart-item-price wishlist-item-price">{formatPrice(product?.salePrice ?? product?.regularPrice)}</strong>
                    <button className="cart-item-delete-button wishlist-item-delete-button" type="button" disabled={isPending} onClick={() => removeWishlistItem(like)}>
                      <Trash2 size={17} strokeWidth={1.8} />
                      삭제
                    </button>
                  </article>
                );
              })}
            </section>

            <aside className="cart-order-summary wishlist-summary">
              <h2>찜 목록</h2>
              <dl>
                <div><dt>찜한 상품</dt><dd>{likes.length}개</dd></div>
                <div><dt>선택한 상품</dt><dd>{selectedLikes.length}개</dd></div>
              </dl>
              <div className="cart-summary-total"><span>선택 상품 합계</span><strong>{formatPrice(selectedTotalAmount)}</strong></div>
              <button type="button" disabled={!canAddSelectedItems || isAddingSelected} onClick={addSelectedItemsToCart}>
                {isAddingSelected ? "담는 중" : "장바구니 담기"}
              </button>
              {cartValidationMessage && <p className="wishlist-cart-validation" role="status">{cartValidationMessage}</p>}
              <ul>
                <li><strong>하트로 빠르게 저장</strong><span>마음에 드는 상품을 한곳에 모아보세요</span></li>
                <li><strong>선택 상품 한 번에 담기</strong><span>재고가 있는 기본 사이즈로 1개씩 담습니다</span></li>
                <li><strong>수량은 장바구니에서</strong><span>담은 뒤 원하는 수량으로 조절할 수 있습니다</span></li>
              </ul>
            </aside>
          </div>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}

export default WishlistPage;
