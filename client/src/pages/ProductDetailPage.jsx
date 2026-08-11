import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ChevronDown, ChevronLeft, ChevronRight, CreditCard, Heart, Lock, Minus, Plus, Ruler, ShoppingBag, Star, X } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { fetchProductLikes, getProductLikeKey, updateProductLikeStatus } from "../api/product-likes.js";
import { fetchMyProfile } from "../api/auth.js";
import NavigationBar from "../components/NavigationBar.jsx";
import { buildAuthHeaders, getAuthToken } from "../utils/auth-storage.js";
import { addGuestCartItem } from "../utils/guest-cart.js";

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "/api";
const formatPrice = (price) => `${Number(price || 0).toLocaleString("ko-KR")} 원`;

const genderLabels = {
  MEN: "Men",
  WOMEN: "Women",
  UNISEX: "Unisex",
};

const categoryLabels = {
  SNEAKERS: "Sneakers",
  SPORTS: "Sports",
  SANDALS: "Sandals",
  DRESS_SHOES: "Dress Shoes",
  CASUAL: "Casual",
};

const genderKoreanLabels = {
  MEN: "남성",
  WOMEN: "여성",
  UNISEX: "공용",
};

const categoryKoreanLabels = {
  SNEAKERS: "스니커즈",
  SPORTS: "스포츠화",
  SANDALS: "샌들",
  DRESS_SHOES: "구두",
  CASUAL: "캐주얼화",
};

const sizeGuide = [240, 245, 250, 255, 260, 265, 270, 275, 280, 285, 290, 295, 300];

const getProductPathId = (product) => product?.productId || product?.id;
const getProductImage = (product, type = "defaultImage") => product?.cardImages?.[type] || product?.cardImages?.defaultImage || "";
const formatQuestionDate = (date) => new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(date));

function ProductDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [products, setProducts] = useState([]);
  const [selectedVariantId, setSelectedVariantId] = useState(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [activeDetailTab, setActiveDetailTab] = useState("info");
  const [selectedSize, setSelectedSize] = useState(null);
  const [selectedQuantity, setSelectedQuantity] = useState(1);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [cartActionError, setCartActionError] = useState("");
  const [likedProductIds, setLikedProductIds] = useState(() => new Set());
  const [pendingLikeProductId, setPendingLikeProductId] = useState(null);
  const [likeActionError, setLikeActionError] = useState("");
  const [isQnaFormOpen, setIsQnaFormOpen] = useState(false);
  const [qnaDraft, setQnaDraft] = useState({ title: "", content: "", isSecret: false });
  const [qnaQuestions, setQnaQuestions] = useState([]);
  const [isLoadingQna, setIsLoadingQna] = useState(false);
  const [qnaLoadError, setQnaLoadError] = useState("");
  const [productReviews, setProductReviews] = useState([]);
  const [isLoadingReviews, setIsLoadingReviews] = useState(false);
  const [reviewLoadError, setReviewLoadError] = useState("");
  const [qnaFormError, setQnaFormError] = useState("");
  const [isSubmittingQna, setIsSubmittingQna] = useState(false);
  const [expandedQuestionId, setExpandedQuestionId] = useState(null);
  const [questionDetails, setQuestionDetails] = useState({});
  const [replyDrafts, setReplyDrafts] = useState({});
  const [replyErrors, setReplyErrors] = useState({});
  const [submittingReplyId, setSubmittingReplyId] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let isMounted = true;

    window.scrollTo(0, 0);

    const loadProductDetail = async () => {
      try {
        setIsLoading(true);
        setLoadError("");
        setActiveImageIndex(0);
        setActiveDetailTab("info");
        setSelectedSize(null);
        setSelectedQuantity(1);

        const [productResponse, productsResponse] = await Promise.all([
          fetch(`${apiBaseUrl}/products/${id}`),
          fetch(`${apiBaseUrl}/products?status=SELLING`),
        ]);

        const productBody = await productResponse.json().catch(() => ({}));
        const productsBody = await productsResponse.json().catch(() => []);

        if (!productResponse.ok) {
          throw new Error(productBody.message || "상품 정보를 불러오지 못했습니다.");
        }

        if (!isMounted) return;

        setProduct(productBody);
        setProducts(
          Array.isArray(productsBody)
            ? productsBody.filter((item) => item.status === "SELLING")
            : [],
        );
        setSelectedVariantId(getProductPathId(productBody));

        const firstAvailableSize = [...(productBody.sizes || [])]
          .sort((first, second) => first.size - second.size)
          .find((sizeItem) => sizeItem.stockQuantity > 0);

        setSelectedSize(firstAvailableSize?.size ?? null);
      } catch (error) {
        if (isMounted) {
          setLoadError(error.message || "상품 정보를 불러오지 못했습니다.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadProductDetail();

    return () => {
      isMounted = false;
    };
  }, [id]);

  useEffect(() => {
    let isMounted = true;

    if (!getAuthToken()) {
      return () => {
        isMounted = false;
      };
    }

    fetchMyProfile()
      .then((profile) => {
        if (isMounted) setIsAdmin(profile.userType === "admin");
      })
      .catch(() => {
        if (isMounted) setIsAdmin(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadLikedProducts = async () => {
      if (!getAuthToken()) {
        if (isMounted) setLikedProductIds(new Set());
        return;
      }

      try {
        const likes = await fetchProductLikes(apiBaseUrl);

        if (isMounted) {
          setLikedProductIds(new Set(likes.map((like) => like.productId).filter(Boolean)));
        }
      } catch {
        if (isMounted) setLikedProductIds(new Set());
      }
    };

    loadLikedProducts();

    return () => {
      isMounted = false;
    };
  }, []);

  const colorVariants = useMemo(() => {
    if (!product) return [];

    return [product, ...products.filter((item) => getProductPathId(item) !== getProductPathId(product))]
      .filter(Boolean)
      .slice(0, 5);
  }, [product, products]);

  const selectedProduct = useMemo(() => (
    colorVariants.find((variant) => String(getProductPathId(variant)) === String(selectedVariantId)) || product
  ), [colorVariants, product, selectedVariantId]);

  useEffect(() => {
    let isMounted = true;
    const productId = getProductPathId(selectedProduct);

    if (!productId) return () => {
      isMounted = false;
    };

    const loadQuestions = async () => {
      try {
        setIsLoadingQna(true);
        setQnaLoadError("");
        setExpandedQuestionId(null);
        setQuestionDetails({});
        setReplyDrafts({});
        setReplyErrors({});

        const response = await fetch(`${apiBaseUrl}/products/${productId}/questions`);
        const data = await response.json().catch(() => []);

        if (!response.ok) {
          throw new Error(data.message || "상품 문의를 불러오지 못했습니다.");
        }

        if (isMounted) setQnaQuestions(Array.isArray(data) ? data : []);
      } catch (error) {
        if (isMounted) setQnaLoadError(error.message || "상품 문의를 불러오지 못했습니다.");
      } finally {
        if (isMounted) setIsLoadingQna(false);
      }
    };

    loadQuestions();

    return () => {
      isMounted = false;
    };
  }, [selectedProduct]);

  useEffect(() => {
    let isMounted = true;
    const productId = getProductPathId(selectedProduct);

    if (!productId) return () => {
      isMounted = false;
    };

    const loadReviews = async () => {
      try {
        setIsLoadingReviews(true);
        setReviewLoadError("");
        setProductReviews([]);

        const response = await fetch(`${apiBaseUrl}/reviews/products/${encodeURIComponent(productId)}`);
        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(data.message || "상품 후기를 불러오지 못했습니다.");
        }

        if (isMounted) setProductReviews(Array.isArray(data.reviews) ? data.reviews : []);
      } catch (error) {
        if (isMounted) setReviewLoadError(error.message || "상품 후기를 불러오지 못했습니다.");
      } finally {
        if (isMounted) setIsLoadingReviews(false);
      }
    };

    loadReviews();

    return () => {
      isMounted = false;
    };
  }, [selectedProduct]);

  const galleryImages = useMemo(() => {
    if (!selectedProduct) return [];

    const cardImages = [
      {
        imageUrl: getProductImage(selectedProduct),
        altText: `${selectedProduct.name} 대표 이미지`,
      },
      {
        imageUrl: getProductImage(selectedProduct, "hoverImage"),
        altText: `${selectedProduct.name} 추가 이미지`,
      },
    ];

    const detailImages = [...(selectedProduct.detailImages || [])]
      .sort((first, second) => first.displayOrder - second.displayOrder)
      .map((image, index) => ({
        imageUrl: image.imageUrl,
        altText: image.altText || `${selectedProduct.name} 상세 이미지 ${index + 1}`,
      }));

    return [...cardImages, ...detailImages].filter((image, index, images) => (
      image.imageUrl && images.findIndex((item) => item.imageUrl === image.imageUrl) === index
    ));
  }, [selectedProduct]);

  const sortedSizes = useMemo(() => [...(selectedProduct?.sizes || [])].sort((first, second) => first.size - second.size), [selectedProduct]);
  const availableSizeMap = useMemo(() => new Map(sortedSizes.map((sizeItem) => [sizeItem.size, sizeItem.stockQuantity])), [sortedSizes]);
  const displayedSizeOptions = useMemo(() => [...new Set([...sizeGuide, ...sortedSizes.map((sizeItem) => sizeItem.size)])].sort((first, second) => first - second), [sortedSizes]);
  const selectedStockQuantity = availableSizeMap.get(selectedSize) ?? 0;
  const relatedProducts = useMemo(() => {
    const currentId = getProductPathId(selectedProduct);

    return products.filter((item) => getProductPathId(item) !== currentId).slice(0, 4);
  }, [products, selectedProduct]);

  const activeImage = galleryImages[activeImageIndex] || galleryImages[0];
  const targetGenderLabel = genderLabels[selectedProduct?.targetGender] || "Men";
  const targetGenderKoreanLabel = genderKoreanLabels[selectedProduct?.targetGender] || "공용";
  const categoryLabel = categoryLabels[selectedProduct?.category] || "Shoes";
  const categoryKoreanLabel = categoryKoreanLabels[selectedProduct?.category] || "슈즈";
  const isSelectedProductSelling = selectedProduct?.status === "SELLING";

  const selectColorVariant = (variant) => {
    const firstAvailableSize = [...(variant.sizes || [])]
      .sort((first, second) => first.size - second.size)
      .find((sizeItem) => sizeItem.stockQuantity > 0);

    setSelectedVariantId(getProductPathId(variant));
    setActiveImageIndex(0);
    setSelectedSize(firstAvailableSize?.size ?? null);
    setSelectedQuantity(1);
  };

  const moveGallery = (direction) => {
    setActiveImageIndex((currentIndex) => {
      if (galleryImages.length === 0) return 0;

      const nextIndex = currentIndex + direction;

      if (nextIndex < 0) return galleryImages.length - 1;

      return nextIndex % galleryImages.length;
    });
  };

  const closeQnaForm = () => {
    setIsQnaFormOpen(false);
    setQnaDraft({ title: "", content: "", isSecret: false });
    setQnaFormError("");
  };

  const openQnaForm = () => {
    if (!getAuthToken()) {
      navigate("/login");
      return;
    }

    setIsQnaFormOpen(true);
  };

  const submitQnaForm = async (event) => {
    event.preventDefault();
    const productId = getProductPathId(selectedProduct);

    try {
      setIsSubmittingQna(true);
      setQnaFormError("");

      const response = await fetch(`${apiBaseUrl}/products/${productId}/questions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...buildAuthHeaders(),
        },
        body: JSON.stringify(qnaDraft),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || "문의 등록에 실패했습니다.");
      }

      setQnaQuestions((questions) => [data, ...questions]);
      closeQnaForm();
    } catch (error) {
      setQnaFormError(error.message || "문의 등록에 실패했습니다.");
    } finally {
      setIsSubmittingQna(false);
    }
  };

  const toggleQuestion = async (question) => {
    if (expandedQuestionId === question.id) {
      setExpandedQuestionId(null);
      return;
    }

    if (!question.isSecret) {
      setExpandedQuestionId(question.id);
      return;
    }

    if (!isAdmin) return;

    try {
      if (!questionDetails[question.id]) {
        const productId = getProductPathId(selectedProduct);
        const response = await fetch(`${apiBaseUrl}/products/${productId}/questions/${question.id}`, {
          headers: {
            ...buildAuthHeaders(),
          },
        });
        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(data.message || "비공개 문의를 불러오지 못했습니다.");
        }

        setQuestionDetails((details) => ({ ...details, [question.id]: data }));
      }

      setExpandedQuestionId(question.id);
    } catch (error) {
      setQnaLoadError(error.message || "비공개 문의를 불러오지 못했습니다.");
    }
  };

  const submitReply = async (event, question) => {
    event.preventDefault();
    const content = String(replyDrafts[question.id] || "").trim();

    if (!content) return;

    try {
      setSubmittingReplyId(question.id);
      setReplyErrors((errors) => ({ ...errors, [question.id]: "" }));

      const productId = getProductPathId(selectedProduct);
      const response = await fetch(`${apiBaseUrl}/products/${productId}/questions/${question.id}/replies`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...buildAuthHeaders(),
        },
        body: JSON.stringify({ content }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || "답글 등록에 실패했습니다.");
      }

      setReplyDrafts((drafts) => ({ ...drafts, [question.id]: "" }));
      setQuestionDetails((details) => ({
        ...details,
        [question.id]: {
          ...(details[question.id] || question),
          replies: [...(details[question.id]?.replies || question.replies || []), data],
        },
      }));

      if (!question.isSecret) {
        setQnaQuestions((questions) => questions.map((item) => (
          item.id === question.id
            ? { ...item, replies: [...(item.replies || []), data] }
            : item
        )));
      }
    } catch (error) {
      setReplyErrors((errors) => ({ ...errors, [question.id]: error.message || "답글 등록에 실패했습니다." }));
    } finally {
      setSubmittingReplyId(null);
    }
  };

  const addToCart = async () => {
    if (!selectedSize || !selectedProduct) return;

    if (!isSelectedProductSelling) {
      setCartActionError("판매 중지된 상품은 장바구니에 담을 수 없습니다.");
      return;
    }

    if (!getAuthToken()) {
      try {
        addGuestCartItem({
          product: selectedProduct,
          size: selectedSize,
          quantity: selectedQuantity,
        });
        window.dispatchEvent(new Event("stride-cart-change"));
        navigate("/cart");
      } catch (error) {
        setCartActionError(error.message || "장바구니에 상품을 담지 못했습니다.");
      }
      return;
    }

    try {
      setIsAddingToCart(true);
      setCartActionError("");

      const response = await fetch(`${apiBaseUrl}/cart/items`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...buildAuthHeaders(),
        },
        body: JSON.stringify({
          productId: getProductPathId(selectedProduct),
          size: selectedSize,
          quantity: selectedQuantity,
        }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || "장바구니에 상품을 담지 못했습니다.");
      }

      window.dispatchEvent(new Event("stride-cart-change"));
      navigate("/cart");
    } catch (error) {
      setCartActionError(error.message || "장바구니에 상품을 담지 못했습니다.");
    } finally {
      setIsAddingToCart(false);
    }
  };

  const buyNow = () => {
    if (!selectedSize || !selectedProduct || !isSelectedProductSelling) return;

    if (!getAuthToken()) {
      navigate("/login", { state: { from: `/products/${id}` } });
      return;
    }

    const unitPrice = Number(selectedProduct.salePrice ?? selectedProduct.regularPrice ?? 0);

    navigate("/checkout", {
      state: {
        checkout: {
          items: [{
            product: selectedProduct,
            productId: getProductPathId(selectedProduct),
            size: selectedSize,
            quantity: selectedQuantity,
            unitPrice,
          }],
          totalAmount: unitPrice * selectedQuantity,
        },
      },
    });
  };

  const toggleProductLike = async (targetProduct) => {
    const productId = getProductLikeKey(targetProduct);

    if (!productId) return;

    if (!getAuthToken()) {
      navigate("/login", { state: { from: `/products/${id}` } });
      return;
    }

    const isLiked = likedProductIds.has(productId);

    if (!isLiked && targetProduct.status !== "SELLING") {
      setLikeActionError("판매 중지된 상품은 찜할 수 없습니다.");
      return;
    }

    try {
      setPendingLikeProductId(productId);
      setLikeActionError("");

      await updateProductLikeStatus(apiBaseUrl, productId, !isLiked);

      setLikedProductIds((currentIds) => {
        const nextIds = new Set(currentIds);

        if (isLiked) {
          nextIds.delete(productId);
        } else {
          nextIds.add(productId);
        }

        return nextIds;
      });
    } catch (error) {
      setLikeActionError(error.message || "찜 상태를 변경하지 못했습니다.");
    } finally {
      setPendingLikeProductId(null);
    }
  };

  return (
    <div className="product-detail-page">
      <NavigationBar />

      <main className="product-detail-main">
        {isLoading && <p className="product-detail-message">상품 정보를 불러오는 중입니다.</p>}
        {!isLoading && loadError && <p className="product-detail-message is-error">{loadError}</p>}
        {!isLoading && !loadError && selectedProduct && (
          <>
            <nav className="product-breadcrumb" aria-label="breadcrumb">
              <button type="button" onClick={() => navigate(-1)}>
                <ArrowLeft size={20} strokeWidth={2.2} />
                뒤로 가기
              </button>
              <Link to="/">홈</Link>
              <span>/</span>
              <Link to="/">{targetGenderLabel}</Link>
              <span>/</span>
              <span>{categoryLabel}</span>
            </nav>

            <section className="product-purchase-section">
              <div className="product-gallery">
                <div className="product-gallery-thumbnails" aria-label="상품 이미지 목록">
                  {galleryImages.slice(0, 5).map((image, index) => (
                    <button
                      className={index === activeImageIndex ? "is-active" : ""}
                      type="button"
                      key={image.imageUrl}
                      aria-label={`${index + 1}번 상품 이미지 보기`}
                      onClick={() => setActiveImageIndex(index)}
                    >
                      <img src={image.imageUrl} alt="" aria-hidden="true" />
                    </button>
                  ))}
                </div>

                <div className="product-gallery-main">
                  {activeImage && <img src={activeImage.imageUrl} alt={activeImage.altText} />}
                  {galleryImages.length > 1 && (
                    <div className="product-gallery-controls">
                      <button type="button" aria-label="이전 상품 이미지" onClick={() => moveGallery(-1)}>
                        <ChevronLeft size={30} strokeWidth={2.4} />
                      </button>
                      <button type="button" aria-label="다음 상품 이미지" onClick={() => moveGallery(1)}>
                        <ChevronRight size={30} strokeWidth={2.4} />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <aside className="product-buy-panel">
                <div className="product-title-block">
                  <h1>{selectedProduct.name}</h1>
                  <p>{targetGenderKoreanLabel} {categoryKoreanLabel}</p>
                  <strong>{formatPrice(selectedProduct.salePrice ?? selectedProduct.regularPrice)}</strong>
                </div>

                <div className="product-color-strip" aria-label="다른 컬러 상품">
                  {colorVariants.map((variant) => (
                    <button
                      className={String(getProductPathId(variant)) === String(selectedVariantId) ? "is-active" : ""}
                      type="button"
                      key={getProductPathId(variant)}
                      aria-label={`${variant.name} 보기`}
                      aria-pressed={String(getProductPathId(variant)) === String(selectedVariantId)}
                      onClick={() => selectColorVariant(variant)}
                    >
                      <img src={getProductImage(variant)} alt="" aria-hidden="true" />
                    </button>
                  ))}
                </div>

                <div className="product-size-heading">
                  <h2>사이즈 선택</h2>
                  <button type="button">
                    <Ruler size={18} strokeWidth={1.8} />
                    사이즈 가이드
                  </button>
                </div>

                <div className="product-size-grid">
                  {displayedSizeOptions.map((size) => {
                    const stockQuantity = availableSizeMap.get(size) ?? 0;
                    const isDisabled = !isSelectedProductSelling || stockQuantity <= 0;

                    return (
                      <button
                        className={`${selectedSize === size ? "is-selected" : ""} ${isDisabled ? "is-disabled" : ""}`}
                        type="button"
                        key={size}
                        disabled={isDisabled}
                        onClick={() => {
                          setSelectedSize(size);
                          setSelectedQuantity(1);
                        }}
                      >
                        {size}
                      </button>
                    );
                  })}
                </div>

                <div className="product-quantity-selector">
                  <h2>수량</h2>
                  <div className="product-quantity-stepper" aria-label="상품 수량 선택">
                    <button
                      type="button"
                      aria-label="수량 줄이기"
                      disabled={!isSelectedProductSelling || selectedQuantity <= 1}
                      onClick={() => setSelectedQuantity((quantity) => Math.max(1, quantity - 1))}
                    >
                      <Minus size={17} strokeWidth={2.2} />
                    </button>
                    <output aria-live="polite">{selectedQuantity}</output>
                    <button
                      type="button"
                      aria-label="수량 늘리기"
                      disabled={!isSelectedProductSelling || !selectedSize || selectedQuantity >= selectedStockQuantity}
                      onClick={() => setSelectedQuantity((quantity) => Math.min(selectedStockQuantity, quantity + 1))}
                    >
                      <Plus size={17} strokeWidth={2.2} />
                    </button>
                  </div>
                </div>

                <div className="product-action-stack">
                  <button className="product-cart-button" type="button" disabled={!isSelectedProductSelling || !selectedSize || isAddingToCart} onClick={addToCart}>
                    {isAddingToCart ? "담는 중" : isSelectedProductSelling ? "장바구니" : "판매 중지 상품"}
                    <ShoppingBag size={20} strokeWidth={2.2} />
                  </button>
                  <button
                    className="product-buy-now-button"
                    type="button"
                    disabled={!isSelectedProductSelling || !selectedSize}
                    onClick={buyNow}
                  >
                    결제하기
                    <CreditCard size={21} strokeWidth={2.2} />
                  </button>
                </div>
                {cartActionError && <p className="product-cart-action-error" role="alert">{cartActionError}</p>}
                {likeActionError && <p className="product-cart-action-error" role="alert">{likeActionError}</p>}

                <div className="product-purchase-notes">
                  <p>주문결제 시 매장 픽업 선택 가능</p>
                  <ul>
                    <li>현재 컬러: {selectedProduct.brand} / {categoryKoreanLabel}</li>
                    <li>스타일 번호: {selectedProduct.productId}</li>
                    <li>국내 배송 · 30일 무료 반품</li>
                  </ul>
                </div>
              </aside>
            </section>

            <section className="product-info-tabs" aria-label="상품 상세 탭">
              <button className={activeDetailTab === "info" ? "is-active" : ""} type="button" onClick={() => setActiveDetailTab("info")}>상품정보</button>
              <button className={activeDetailTab === "reviews" ? "is-active" : ""} type="button" onClick={() => setActiveDetailTab("reviews")}>상품후기 ({productReviews.length})</button>
              <button className={activeDetailTab === "qna" ? "is-active" : ""} type="button" onClick={() => setActiveDetailTab("qna")}>상품 Q&amp;A ({qnaQuestions.length})</button>
            </section>

            {activeDetailTab === "info" && (
              <section className="product-detail-images" aria-label="상품 상세 이미지">
                {galleryImages.slice(2).length > 0
                  ? galleryImages.slice(2).map((image) => <img src={image.imageUrl} alt={image.altText} key={image.imageUrl} />)
                  : galleryImages.map((image) => <img src={image.imageUrl} alt={image.altText} key={image.imageUrl} />)}
              </section>
            )}

            {activeDetailTab === "reviews" && (
              <section className="product-feedback-panel product-review-panel" aria-label="상품후기 목록">
                {isLoadingReviews && <p className="product-review-message">상품 후기를 불러오는 중입니다.</p>}
                {!isLoadingReviews && reviewLoadError && <p className="product-review-message is-error">{reviewLoadError}</p>}
                {!isLoadingReviews && !reviewLoadError && productReviews.length === 0 && <div className="product-review-empty-state"><p>등록된 상품 후기가 없습니다.</p></div>}
                {!isLoadingReviews && !reviewLoadError && productReviews.length > 0 && <ul className="product-review-list">
                  {productReviews.map((review) => (
                    <li className="product-review-item" key={review.id}>
                      <div className="product-review-meta">
                        <span className="product-review-stars" aria-label={`${review.rating}점`}>{Array.from({ length: 5 }, (_, index) => (
                          <Star className={index < review.rating ? "is-filled" : ""} key={index} size={19} strokeWidth={2.2} />
                        ))}</span>
                        <strong>{review.authorName}</strong>
                        <span>사이즈 {review.size}</span>
                      </div>
                      <p>{review.content}</p>
                    </li>
                  ))}
                </ul>}
              </section>
            )}

            {activeDetailTab === "qna" && (
              <section className="product-feedback-panel product-qna-panel" aria-label="상품 Q&A">
                {isLoadingQna && <p className="product-qna-message">상품 문의를 불러오는 중입니다.</p>}
                {!isLoadingQna && qnaLoadError && <p className="product-qna-message is-error">{qnaLoadError}</p>}
                {!isLoadingQna && !qnaLoadError && qnaQuestions.length === 0 && (
                  <div className="product-qna-empty-state">
                    <p>등록된 상품 Q&amp;A가 없습니다.</p>
                  </div>
                )}
                {!isLoadingQna && !qnaLoadError && qnaQuestions.length > 0 && (
                  <ul className="product-qna-list">
                    {qnaQuestions.map((question) => {
                      const isExpanded = expandedQuestionId === question.id;
                      const questionDetail = questionDetails[question.id];
                      const content = questionDetail?.content || question.content;
                      const replies = questionDetail?.replies || question.replies || [];

                      return (
                        <li className={question.isSecret ? "is-secret" : ""} key={question.id}>
                          <button
                            type="button"
                            aria-expanded={isExpanded}
                            aria-disabled={question.isSecret && !isAdmin}
                            onClick={() => toggleQuestion(question)}
                          >
                            <span className="product-qna-item-title">
                              {question.isSecret && <Lock size={16} strokeWidth={2.2} aria-label="비공개 문의" />}
                              {question.title}
                            </span>
                            <span className="product-qna-item-meta">{question.authorName} · {formatQuestionDate(question.createdAt)}</span>
                            <ChevronDown className={isExpanded ? "is-open" : ""} size={19} strokeWidth={1.8} />
                          </button>
                          {isExpanded && content && (
                            <div className="product-qna-item-detail">
                              <p className="product-qna-item-content">{content}</p>
                              {replies.map((reply) => (
                                <div className="product-qna-reply" key={reply.id}>
                                  <strong>관리자 답글</strong>
                                  <span>{formatQuestionDate(reply.createdAt)}</span>
                                  <p>{reply.content}</p>
                                </div>
                              ))}
                              {isAdmin && (
                                <form className="product-qna-reply-form" onSubmit={(event) => submitReply(event, question)}>
                                  <textarea
                                    value={replyDrafts[question.id] || ""}
                                    maxLength={1000}
                                    placeholder="답글을 입력하세요"
                                    onChange={(event) => setReplyDrafts((drafts) => ({ ...drafts, [question.id]: event.target.value }))}
                                  />
                                  <button type="submit" disabled={submittingReplyId === question.id || !String(replyDrafts[question.id] || "").trim()}>
                                    {submittingReplyId === question.id ? "등록 중" : "답글 등록"}
                                  </button>
                                  {replyErrors[question.id] && <p role="alert">{replyErrors[question.id]}</p>}
                                </form>
                              )}
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
                <button type="button" onClick={openQnaForm}>문의하기</button>
              </section>
            )}

            {relatedProducts.length > 0 && (
              <section className="product-related-section" aria-labelledby="product-related-title">
                <h2 id="product-related-title">함께 보면 좋은 상품</h2>
                <div className="product-related-grid">
                  {relatedProducts.map((relatedProduct) => {
                    const relatedProductId = getProductLikeKey(relatedProduct);
                    const isRelatedProductLiked = likedProductIds.has(relatedProductId);

                    return (
                      <article className="product-related-card" key={getProductPathId(relatedProduct)}>
                        <Link className="product-related-link" to={`/products/${getProductPathId(relatedProduct)}`}>
                          <span className="product-related-image-wrap">
                            <img
                              className="product-related-image product-related-image-default"
                              src={getProductImage(relatedProduct)}
                              alt={relatedProduct.name}
                            />
                            <img
                              className="product-related-image product-related-image-hover"
                              src={getProductImage(relatedProduct, "hoverImage")}
                              alt=""
                              aria-hidden="true"
                            />
                          </span>
                          <strong>{formatPrice(relatedProduct.salePrice ?? relatedProduct.regularPrice)}</strong>
                          <h3>{relatedProduct.name}</h3>
                          <p>{relatedProduct.brand}</p>
                          <em>{Math.max(1, (relatedProduct.detailImages || []).length)}개의 다른 컬러</em>
                          <small>New</small>
                        </Link>
                        <button
                          className={isRelatedProductLiked ? "is-liked" : ""}
                          type="button"
                          aria-label={`${relatedProduct.name} ${isRelatedProductLiked ? "찜 해제" : "찜하기"}`}
                          aria-pressed={isRelatedProductLiked}
                          disabled={pendingLikeProductId === relatedProductId}
                          onClick={() => toggleProductLike(relatedProduct)}
                        >
                          <Heart size={27} strokeWidth={2.1} />
                        </button>
                      </article>
                    );
                  })}
                </div>
              </section>
            )}

            {isQnaFormOpen && (
              <div className="product-qna-form-backdrop" role="presentation" onMouseDown={closeQnaForm}>
                <form className="product-qna-form" aria-labelledby="product-qna-form-title" onMouseDown={(event) => event.stopPropagation()} onSubmit={submitQnaForm}>
                  <div className="product-qna-form-header">
                    <h2 id="product-qna-form-title">상품 문의</h2>
                    <button type="button" aria-label="문의 작성 닫기" onClick={closeQnaForm}>
                      <X size={22} strokeWidth={2} />
                    </button>
                  </div>

                  <label>
                    <span>제목</span>
                    <input
                      type="text"
                      value={qnaDraft.title}
                      maxLength={60}
                      placeholder="문의 제목을 입력하세요"
                      onChange={(event) => setQnaDraft((draft) => ({ ...draft, title: event.target.value }))}
                      required
                    />
                  </label>

                  <label>
                    <span>내용</span>
                    <textarea
                      value={qnaDraft.content}
                      maxLength={1000}
                      placeholder="문의 내용을 입력하세요"
                      onChange={(event) => setQnaDraft((draft) => ({ ...draft, content: event.target.value }))}
                      required
                    />
                  </label>

                  <fieldset className="product-qna-visibility">
                    <legend>공개 설정</legend>
                    <label className={!qnaDraft.isSecret ? "is-selected" : ""}>
                      <input
                        type="radio"
                        name="qna-visibility"
                        checked={!qnaDraft.isSecret}
                        onChange={() => setQnaDraft((draft) => ({ ...draft, isSecret: false }))}
                      />
                      공개
                    </label>
                    <label className={qnaDraft.isSecret ? "is-selected" : ""}>
                      <input
                        type="radio"
                        name="qna-visibility"
                        checked={qnaDraft.isSecret}
                        onChange={() => setQnaDraft((draft) => ({ ...draft, isSecret: true }))}
                      />
                      비공개
                    </label>
                  </fieldset>

                  {qnaFormError && <p className="product-qna-form-status" role="alert">{qnaFormError}</p>}

                  <div className="product-qna-form-actions">
                    <button type="button" onClick={closeQnaForm}>취소</button>
                    <button type="submit" disabled={isSubmittingQna || !qnaDraft.title.trim() || !qnaDraft.content.trim()}>{isSubmittingQna ? "등록 중" : "문의 등록"}</button>
                  </div>
                </form>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

export default ProductDetailPage;
