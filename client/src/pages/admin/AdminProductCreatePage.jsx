import { useEffect, useRef, useState } from "react";
import {
  Bell,
  ChevronDown,
  ClipboardList,
  ImagePlus,
  Home,
  Package,
  Plus,
  Users,
  X,
} from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { buildAuthHeaders, clearAuthSession } from "../../utils/auth-storage.js";

const initialSizes = [{ id: "size-option-0", size: "", quantity: "" }];

const cloudinaryCloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const cloudinaryUploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "/api";
const MAX_RECOMMENDED_PRODUCTS = 8;

const toNumber = (value) => Number(String(value).replace(/[^0-9.-]/g, ""));

const calculateDiscountedSalePrice = (regularPrice, discountRate) => {
  if (String(discountRate).trim() === "") return null;

  const parsedRegularPrice = toNumber(regularPrice);
  const parsedDiscountRate = Number(discountRate);

  if (!Number.isFinite(parsedRegularPrice) || parsedRegularPrice < 0 || !Number.isFinite(parsedDiscountRate)) {
    return null;
  }

  const normalizedRate = Math.min(100, Math.max(0, parsedDiscountRate));
  return Math.round(parsedRegularPrice * (1 - (normalizedRate / 100)));
};

const saleStatusByLabel = {
  판매중: "SELLING",
  비공개: "HIDDEN",
  판매중지: "STOPPED",
};

const saleStatusLabelByValue = {
  SELLING: "판매중",
  HIDDEN: "비공개",
  STOPPED: "판매중지",
};

const categoryLabels = {
  SNEAKERS: "스니커즈",
  SPORTS: "스포츠",
  SANDALS: "샌들",
  DRESS_SHOES: "구두",
  CASUAL: "캐주얼",
};

function SectionTitle({ number, children }) {
  return (
    <h2 className="admin-product-form-title">
      <span>{number}</span>
      {children}
    </h2>
  );
}

function SelectField({ children, className = "", ...props }) {
  return (
    <span className={`admin-create-select ${className}`}>
      <select {...props}>{children}</select>
      <ChevronDown size={15} strokeWidth={2} />
    </span>
  );
}

function AdminProductCreatePage() {
  const navigate = useNavigate();
  const { id: productIdParam } = useParams();
  const isEditMode = Boolean(productIdParam);
  const nextSizeOptionId = useRef(initialSizes.length);
  const isBrandSavePendingRef = useRef(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isProductMenuOpen, setIsProductMenuOpen] = useState(true);
  const [defaultImage, setDefaultImage] = useState("");
  const [hoverImage, setHoverImage] = useState("");
  const [extraImages, setExtraImages] = useState([]);
  const [draggingExtraImageIndex, setDraggingExtraImageIndex] = useState(null);
  const [dragOverExtraImageIndex, setDragOverExtraImageIndex] = useState(null);
  const [sizes, setSizes] = useState(initialSizes);
  const [status, setStatus] = useState("판매중");
  const [isRecommended, setIsRecommended] = useState(false);
  const [recommendedProductCount, setRecommendedProductCount] = useState(0);
  const [isLoadingRecommendedProducts, setIsLoadingRecommendedProducts] = useState(true);
  const [hasRecommendedProductCountError, setHasRecommendedProductCountError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingProduct, setIsLoadingProduct] = useState(isEditMode);
  const [productLoadError, setProductLoadError] = useState("");
  const [brands, setBrands] = useState([]);
  const [selectedBrand, setSelectedBrand] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [targetGender, setTargetGender] = useState("");
  const [productCode, setProductCode] = useState("");
  const [productName, setProductName] = useState("");
  const [salePrice, setSalePrice] = useState("");
  const [regularPrice, setRegularPrice] = useState("");
  const [discountRate, setDiscountRate] = useState("");
  const [newBrand, setNewBrand] = useState("");
  const [isSavingBrand, setIsSavingBrand] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadBrands = async () => {
      try {
        const response = await fetch(`${apiBaseUrl}/brands`);

        if (!response.ok) {
          throw new Error("브랜드 목록을 불러오지 못했습니다.");
        }

        const brandList = await response.json();

        if (isMounted) {
          setBrands(brandList);
        }
      } catch (error) {
        if (isMounted) {
          window.alert(error.message || "브랜드 목록을 불러오지 못했습니다.");
        }
      }
    };

    loadBrands();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadRecommendedProductCount = async () => {
      try {
        setIsLoadingRecommendedProducts(true);
        setHasRecommendedProductCountError(false);
        const response = await fetch(`${apiBaseUrl}/products?isRecommended=true`);
        const products = await response.json().catch(() => []);

        if (!response.ok || !Array.isArray(products)) {
          throw new Error("추천 상품 수를 불러오지 못했습니다.");
        }

        if (isMounted) setRecommendedProductCount(products.length);
      } catch {
        if (isMounted) setHasRecommendedProductCountError(true);
      } finally {
        if (isMounted) setIsLoadingRecommendedProducts(false);
      }
    };

    loadRecommendedProductCount();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!isEditMode) return undefined;

    let isMounted = true;

    const loadProduct = async () => {
      try {
        setIsLoadingProduct(true);
        setProductLoadError("");
        const response = await fetch(`${apiBaseUrl}/products/${productIdParam}`);
        const product = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(product.message || "상품 정보를 불러오지 못했습니다.");
        }

        if (!isMounted) return;

        const productSizes = (product.sizes || []).map((size, index) => ({
          id: `size-option-${index}`,
          size: String(size.size),
          quantity: String(size.stockQuantity),
        }));

        setProductCode(product.productId || "");
        setProductName(product.name || "");
        setSelectedBrand(product.brand || "");
        setSelectedCategory(product.category || "");
        setTargetGender(product.targetGender || "");
        setSalePrice(product.salePrice ?? "");
        setRegularPrice(product.regularPrice ?? "");
        const currentDiscountRate = (1 - (Number(product.salePrice) / Number(product.regularPrice))) * 100;
        setDiscountRate(
          product.salePrice !== null && product.salePrice !== undefined && Number(product.regularPrice) > 0
            ? String(Number(currentDiscountRate.toFixed(2)))
            : "",
        );
        setDefaultImage(product.cardImages?.defaultImage || "");
        setHoverImage(product.cardImages?.hoverImage || "");
        setExtraImages(
          [...(product.detailImages || [])]
            .sort((first, second) => first.displayOrder - second.displayOrder)
            .map((image) => image.imageUrl),
        );
        setSizes(productSizes.length > 0 ? productSizes : initialSizes);
        nextSizeOptionId.current = productSizes.length;
        setStatus(saleStatusLabelByValue[product.status] || "판매중");
        setIsRecommended(Boolean(product.isRecommended));
      } catch (error) {
        if (isMounted) {
          setProductLoadError(error.message || "상품 정보를 불러오지 못했습니다.");
        }
      } finally {
        if (isMounted) {
          setIsLoadingProduct(false);
        }
      }
    };

    loadProduct();

    return () => {
      isMounted = false;
    };
  }, [isEditMode, productIdParam]);

  const handleLogout = () => {
    clearAuthSession();
    setIsProfileMenuOpen(false);
    navigate("/", { replace: true });
  };

  const handleDiscountRateChange = (nextDiscountRate) => {
    setDiscountRate(nextDiscountRate);
    const discountedPrice = calculateDiscountedSalePrice(regularPrice, nextDiscountRate);

    if (discountedPrice !== null) {
      setSalePrice(String(discountedPrice));
    }
  };

  const handleRegularPriceChange = (nextRegularPrice) => {
    setRegularPrice(nextRegularPrice);
    const discountedPrice = calculateDiscountedSalePrice(nextRegularPrice, discountRate);

    if (discountedPrice !== null) {
      setSalePrice(String(discountedPrice));
    }
  };

  const openCloudinaryWidget = (onUpload, maxFiles = 1) => {
    if (!cloudinaryCloudName || !cloudinaryUploadPreset) {
      window.alert("Cloudinary cloud name과 unsigned upload preset을 설정해주세요.");
      return;
    }

    if (!window.cloudinary) {
      window.alert("Cloudinary 업로드 위젯을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.");
      return;
    }

    const widget = window.cloudinary.createUploadWidget(
      {
        cloudName: cloudinaryCloudName,
        uploadPreset: cloudinaryUploadPreset,
        sources: ["local", "url", "camera"],
        multiple: maxFiles > 1,
        maxFiles,
        resourceType: "image",
        clientAllowedFormats: ["png", "jpg", "jpeg", "webp"],
        showAdvancedOptions: false,
      },
      (error, result) => {
        if (error) return;

        if (result?.event === "success" && result.info?.secure_url) {
          onUpload(result.info.secure_url);
        }
      },
    );

    widget.open();
  };

  const updateSize = (index, field, value) => {
    setSizes((currentSizes) =>
      currentSizes.map((item, itemIndex) => (itemIndex === index ? { ...item, [field]: value } : item)),
    );
  };

  const reorderExtraImages = (fromIndex, toIndex) => {
    if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0) return;

    setExtraImages((images) => {
      const reorderedImages = [...images];
      const [movedImage] = reorderedImages.splice(fromIndex, 1);
      reorderedImages.splice(toIndex, 0, movedImage);

      return reorderedImages;
    });
  };

  const handleBrandSave = async () => {
    if (isBrandSavePendingRef.current) {
      return;
    }

    const brandName = newBrand.trim();

    if (!brandName) {
      window.alert("브랜드 이름을 입력해주세요.");
      return;
    }

    try {
      isBrandSavePendingRef.current = true;
      setIsSavingBrand(true);

      const response = await fetch(`${apiBaseUrl}/brands`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...buildAuthHeaders(),
        },
        body: JSON.stringify({ name: brandName }),
      });
      const responseBody = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(responseBody.message || "브랜드 저장에 실패했습니다.");
      }

      setBrands((currentBrands) => [...currentBrands, responseBody].sort((left, right) => left.name.localeCompare(right.name, "ko-KR")));
      setSelectedBrand(responseBody.name);
      setSelectedCategory("");
      setNewBrand("");
    } catch (error) {
      window.alert(error.message || "브랜드 저장에 실패했습니다.");
    } finally {
      isBrandSavePendingRef.current = false;
      setIsSavingBrand(false);
    }
  };

  const selectedBrandCategories = brands.find((brand) => brand.name === selectedBrand)?.categories || [];
  const isRecommendationSelectionDisabled = !isRecommended && (
    isLoadingRecommendedProducts
    || hasRecommendedProductCountError
    || recommendedProductCount >= MAX_RECOMMENDED_PRODUCTS
  );
  const recommendationGuide = hasRecommendedProductCountError
    ? "추천 상품 현황을 확인하지 못해 선택할 수 없습니다. 잠시 후 다시 시도해주세요."
    : isLoadingRecommendedProducts
      ? "추천 상품 현황을 확인하고 있습니다."
      : recommendedProductCount >= MAX_RECOMMENDED_PRODUCTS && !isRecommended
        ? `추천 상품은 최대 ${MAX_RECOMMENDED_PRODUCTS}개까지 등록할 수 있습니다.`
        : `현재 추천 상품 ${recommendedProductCount}개 / 최대 ${MAX_RECOMMENDED_PRODUCTS}개`;

  const handleRecommendationChange = (event) => {
    if (event.target.checked && isRecommendationSelectionDisabled) return;

    setIsRecommended(event.target.checked);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const getValue = (name) => String(formData.get(name) ?? "").trim();
    const validSizes = sizes
      .filter((item) => item.size.trim() && item.quantity.trim())
      .map((item) => ({
        size: toNumber(item.size),
        stockQuantity: toNumber(item.quantity),
      }))
      .filter((item) => Number.isFinite(item.size) && Number.isFinite(item.stockQuantity));

    if (!defaultImage || !hoverImage) {
      window.alert("기본 이미지와 호버 이미지를 모두 등록해주세요.");
      return;
    }

    if (validSizes.length === 0) {
      window.alert("사이즈와 재고 수량을 한 개 이상 입력해주세요.");
      return;
    }

    if (!selectedBrand || !selectedCategory) {
      window.alert("브랜드와 해당 브랜드의 카테고리를 선택해주세요.");
      return;
    }

    const requestedProductId = getValue("productId");
    const productId = isEditMode
      ? productCode
      : requestedProductId || `PRD-${crypto.randomUUID().replaceAll("-", "").slice(0, 16).toUpperCase()}`;
    const regularPriceValue = toNumber(getValue("regularPrice"));
    const salePriceValue = toNumber(getValue("salePrice"));

    const productPayload = {
      productId,
      name: getValue("name"),
      brand: getValue("brand"),
      regularPrice: regularPriceValue,
      salePrice: getValue("salePrice") === "" ? null : salePriceValue,
      targetGender: getValue("targetGender"),
      category: getValue("category"),
      isRecommended,
      cardImages: {
        defaultImage,
        hoverImage,
      },
      sizes: validSizes,
      detailImages: extraImages.map((imageUrl, index) => ({
        imageUrl,
        altText: `${getValue("name")} 상세 이미지 ${index + 1}`,
        displayOrder: index + 1,
      })),
      status: saleStatusByLabel[status],
    };

    try {
      setIsSubmitting(true);

      const response = await fetch(isEditMode ? `${apiBaseUrl}/products/${productIdParam}` : `${apiBaseUrl}/products`, {
        method: isEditMode ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          ...buildAuthHeaders(),
        },
        body: JSON.stringify(productPayload),
      });
      const responseBody = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(responseBody.message || `상품 ${isEditMode ? "수정" : "등록"}에 실패했습니다.`);
      }

      navigate("/admin/products");
    } catch (error) {
      window.alert(error.message || `상품 ${isEditMode ? "수정" : "등록"}에 실패했습니다.`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="admin-page">
      <aside className="admin-sidebar" aria-label="admin navigation">
        <div className="admin-brand">
          <strong>STRIDE ADMIN</strong>
          <span>관리자 모드</span>
        </div>

        <nav className="admin-nav">
          <Link className="admin-nav-link" to="/admin">
            <Home size={20} strokeWidth={1.9} />
            <span>HOME</span>
          </Link>
          <Link className="admin-nav-link" to="/admin/members">
            <Users size={20} strokeWidth={1.9} />
            <span>회원관리</span>
          </Link>
          <div className="admin-nav-product-group">
            <button
              className="admin-nav-link is-active"
              type="button"
              aria-expanded={isProductMenuOpen}
              onClick={() => setIsProductMenuOpen((isOpen) => !isOpen)}
            >
              <Package size={20} strokeWidth={1.9} />
              <span>상품관리</span>
              <ChevronDown className="admin-nav-expand-icon" size={16} strokeWidth={2} />
            </button>
            {isProductMenuOpen && (
              <div className="admin-nav-submenu">
                <Link className="is-active" to="/admin/products">상품 목록</Link>
                <Link to="/admin/products/low-stock">재고 부족</Link>
                <Link to="/admin/brands">브랜드 관리</Link>
              </div>
            )}
          </div>
          <Link className="admin-nav-link" to="/admin/orders">
            <ClipboardList size={20} strokeWidth={1.9} />
            <span>주문관리</span>
          </Link>
        </nav>
      </aside>

      <div className="admin-shell admin-create-shell">
        <header className="admin-topbar">
          <h1>{isEditMode ? "상품 수정" : "상품 등록"}</h1>
          <div className="admin-topbar-actions">
            <button className="admin-icon-button" type="button" aria-label="알림">
              <Bell size={24} strokeWidth={1.8} />
              <span>3</span>
            </button>
            <div
              className="admin-profile-menu-wrap"
              onBlur={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget)) setIsProfileMenuOpen(false);
              }}
            >
              <button
                className="admin-profile-button"
                type="button"
                aria-expanded={isProfileMenuOpen}
                aria-haspopup="menu"
                onClick={() => setIsProfileMenuOpen((isOpen) => !isOpen)}
              >
                <span className="admin-profile-avatar">AD</span>
                <span className="admin-profile-label">관리자</span>
                <ChevronDown className="admin-profile-chevron" size={17} strokeWidth={2} />
              </button>
              {isProfileMenuOpen && (
                <div className="admin-profile-menu" role="menu">
                  <Link to="/" role="menuitem" onClick={() => setIsProfileMenuOpen(false)}>
                    메인페이지
                  </Link>
                  <button type="button" role="menuitem" onClick={handleLogout}>
                    로그아웃
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <form className="admin-create-product-form" onSubmit={handleSubmit}>
          {isEditMode && isLoadingProduct && <p className="admin-product-edit-message">상품 정보를 불러오는 중입니다.</p>}
          {isEditMode && productLoadError && <p className="admin-product-edit-message is-error">{productLoadError}</p>}
          <main className="admin-create-content">
            <div className="admin-create-column">
              <section className="admin-create-card">
                <SectionTitle number="1">기본 정보</SectionTitle>
                <div className="admin-create-basic-grid">
                  <div className="admin-create-field admin-brand-field">
                    <span>브랜드 <b>*</b></span>
                    <div className="admin-brand-control-row">
                      <SelectField
                        className="admin-brand-select"
                        name="brand"
                        value={selectedBrand}
                        onChange={(event) => {
                          setSelectedBrand(event.target.value);
                          setSelectedCategory("");
                        }}
                        required
                      >
                        <option value="" disabled>브랜드 선택</option>
                        {brands.map((brand) => <option key={brand.id} value={brand.name}>{brand.name}</option>)}
                      </SelectField>
                      <input
                        value={newBrand}
                        placeholder="브랜드 이름 입력"
                        onChange={(event) => setNewBrand(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" && !event.nativeEvent.isComposing) {
                            event.preventDefault();
                            handleBrandSave();
                          }
                        }}
                      />
                      <button type="button" onClick={handleBrandSave} disabled={isSavingBrand}>
                        {isSavingBrand ? "저장 중..." : "브랜드 저장"}
                      </button>
                    </div>
                  </div>
                  <label className="admin-create-field admin-product-code-field">
                    <span>상품 코드</span>
                    <input name="productId" value={productCode} placeholder="자동 생성 또는 직접 입력" onChange={(event) => setProductCode(event.target.value)} disabled={isEditMode} />
                    <small>영문, 숫자 조합 4~20자</small>
                  </label>
                  <label className="admin-create-field admin-create-span-full">
                    <span>상품명 <b>*</b></span>
                    <input name="name" value={productName} placeholder="상품명을 입력하세요" onChange={(event) => setProductName(event.target.value)} required />
                  </label>
                </div>
              </section>

              <section className="admin-create-card admin-create-price-card">
                <SectionTitle number="2">가격 및 카테고리</SectionTitle>
                <div className="admin-create-price-grid">
                  <label className="admin-create-field admin-unit-field admin-sale-price-field">
                    <span>판매가 <b>*</b></span>
                    <div><input name="salePrice" value={salePrice} onChange={(event) => setSalePrice(event.target.value)} inputMode="numeric" placeholder="0" /><em>원</em></div>
                  </label>
                  <label className="admin-create-field admin-unit-field">
                    <span>할인율</span>
                    <div><input value={discountRate} type="number" min="0" max="100" step="0.01" inputMode="decimal" placeholder="0" onChange={(event) => handleDiscountRateChange(event.target.value)} /><em>%</em></div>
                  </label>
                  <label className="admin-create-field admin-unit-field">
                    <span>정상가</span>
                    <div><input name="regularPrice" value={regularPrice} onChange={(event) => handleRegularPriceChange(event.target.value)} inputMode="numeric" placeholder="0" required /><em>원</em></div>
                  </label>
                  <div className="admin-create-field admin-create-span-full">
                    <span>성별 및 카테고리 <b>*</b></span>
                    <div className="admin-primary-category">
                      <SelectField name="targetGender" value={targetGender} onChange={(event) => setTargetGender(event.target.value)} required><option value="" disabled>성별 선택</option><option value="MEN">남성</option><option value="WOMEN">여성</option><option value="UNISEX">공용</option></SelectField>
                      <SelectField name="category" value={selectedCategory} onChange={(event) => setSelectedCategory(event.target.value)} disabled={!selectedBrand || selectedBrandCategories.length === 0} required>
                        <option value="" disabled>
                          {!selectedBrand
                            ? "브랜드를 먼저 선택하세요"
                            : selectedBrandCategories.length === 0
                              ? "브랜드 카테고리가 없습니다"
                              : "카테고리 선택"}
                        </option>
                        {selectedBrandCategories.map((category) => <option key={category} value={category}>{categoryLabels[category]}</option>)}
                      </SelectField>
                    </div>
                  </div>
                </div>
              </section>

              <section className="admin-create-card admin-create-options-card">
                <SectionTitle number="4">옵션 및 재고</SectionTitle>
                <p className="admin-create-helper">사이즈/옵션별 재고를 입력하세요.</p>
                <div className="admin-size-table-wrap">
                  <table className="admin-size-table">
                    <thead><tr><th>사이즈 (mm)</th><th>재고 수량</th><th aria-label="삭제" /></tr></thead>
                    <tbody>
                      {sizes.map((item, index) => (
                        <tr key={item.id}>
                          <td><input value={item.size} placeholder="250" onChange={(event) => updateSize(index, "size", event.target.value)} /></td>
                          <td><input value={item.quantity} placeholder="200" onChange={(event) => updateSize(index, "quantity", event.target.value)} /></td>
                          <td><button type="button" onClick={() => setSizes((items) => items.filter((_, itemIndex) => itemIndex !== index))} aria-label={`${item.size} 사이즈 삭제`}><X size={14} /></button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <button
                  className="admin-add-size-button"
                  type="button"
                  onClick={() =>
                    setSizes((items) => [
                      ...items,
                      { id: `size-option-${nextSizeOptionId.current++}`, size: "", quantity: "" },
                    ])
                  }
                >
                  <Plus size={16} strokeWidth={2.3} /> 사이즈 옵션 추가
                </button>
              </section>
            </div>

            <div className="admin-create-column">
              <section className="admin-create-card admin-create-images-card">
                <SectionTitle number="3">상품 이미지</SectionTitle>
                <div className="admin-create-field">
                  <span>대표 이미지 <b>*</b></span>
                  <p className="admin-card-image-note">상품 목록에 노출되는 기본 이미지와 마우스 오버 이미지를 각각 등록하세요.</p>
                  <div className="admin-primary-images">
                    <div className="admin-primary-image-slot">
                      <div className="admin-primary-image-heading">
                        <strong>기본 이미지</strong>
                        <small>일반 목록 노출</small>
                      </div>
                      <div className="admin-main-image-preview">
                        {defaultImage ? (
                          <div className="admin-image-fit-frame">
                            <img src={defaultImage} alt="기본 대표 이미지" />
                          </div>
                        ) : <ImagePlus size={28} strokeWidth={1.6} />}
                        {defaultImage && <button type="button" aria-label="기본 대표 이미지 삭제" onClick={() => setDefaultImage("")}><X size={15} /></button>}
                      </div>
                      <button className="admin-image-change-button" type="button" onClick={() => openCloudinaryWidget(setDefaultImage)}>기본 이미지 변경</button>
                    </div>
                    <div className="admin-primary-image-slot">
                      <div className="admin-primary-image-heading">
                        <strong>호버 이미지</strong>
                        <small>마우스 오버 시 노출</small>
                      </div>
                      <div className="admin-main-image-preview">
                        {hoverImage ? (
                          <div className="admin-image-fit-frame">
                            <img src={hoverImage} alt="호버 대표 이미지" />
                          </div>
                        ) : <ImagePlus size={28} strokeWidth={1.6} />}
                        {hoverImage && <button type="button" aria-label="호버 대표 이미지 삭제" onClick={() => setHoverImage("")}><X size={15} /></button>}
                      </div>
                      <button className="admin-image-change-button" type="button" onClick={() => openCloudinaryWidget(setHoverImage)}>호버 이미지 변경</button>
                    </div>
                  </div>
                </div>
                <div className="admin-create-extra-images">
                  <span>추가 이미지</span>
                  <div>
                    {extraImages.map((image, index) => (
                      <div
                        className={`admin-extra-image ${draggingExtraImageIndex === index ? "is-dragging" : ""} ${dragOverExtraImageIndex === index ? "is-drag-over" : ""}`}
                        key={`${image}-${index}`}
                        draggable
                        aria-label={`추가 이미지 ${index + 1}. 드래그하여 순서 변경`}
                        onDragStart={(event) => {
                          event.dataTransfer.effectAllowed = "move";
                          event.dataTransfer.setData("text/plain", String(index));
                          setDraggingExtraImageIndex(index);
                        }}
                        onDragOver={(event) => {
                          event.preventDefault();
                          event.dataTransfer.dropEffect = "move";
                          setDragOverExtraImageIndex(index);
                        }}
                        onDrop={(event) => {
                          event.preventDefault();
                          const fromIndex = Number(event.dataTransfer.getData("text/plain"));
                          reorderExtraImages(fromIndex, index);
                          setDraggingExtraImageIndex(null);
                          setDragOverExtraImageIndex(null);
                        }}
                        onDragEnd={() => {
                          setDraggingExtraImageIndex(null);
                          setDragOverExtraImageIndex(null);
                        }}
                      >
                        <img src={image} alt={`추가 이미지 ${index + 1}`} />
                        <button
                          type="button"
                          aria-label={`추가 이미지 ${index + 1} 삭제`}
                          draggable={false}
                          onClick={() => setExtraImages((images) => images.filter((_, imageIndex) => imageIndex !== index))}
                        >
                          <X size={13} strokeWidth={2.5} />
                        </button>
                      </div>
                    ))}
                    {extraImages.length < 8 && (
                      <button
                        className="admin-add-image-button"
                        type="button"
                        onClick={() =>
                          openCloudinaryWidget(
                            (imageUrl) => setExtraImages((images) => [...images, imageUrl].slice(0, 8)),
                            8 - extraImages.length,
                          )
                        }
                      >
                        <ImagePlus size={22} strokeWidth={1.7} />
                        <small>이미지 추가<br />(최대 8장)</small>
                      </button>
                    )}
                  </div>
                </div>
              </section>

              <section className="admin-create-card admin-create-sale-card">
                <SectionTitle number="5">판매 설정</SectionTitle>
                <div className="admin-sale-settings">
                  <span>판매 상태 <b>*</b></span>
                  <div className="admin-sale-status-options">
                    {[
                      ["판매중", "상품을 고객이 구매할 수 있습니다."],
                      ["비공개", "상품을 숨기며, 고객에게 노출되지 않습니다."],
                      ["판매중지", "재고와 관계없이 상품 판매를 중단합니다."],
                    ].map(([value, description]) => (
                      <label key={value}>
                        <input type="radio" name="sale-status" value={value} checked={status === value} onChange={() => setStatus(value)} />
                        <span><strong>{value}</strong><small>{description}</small></span>
                      </label>
                    ))}
                  </div>
                  <div className="admin-recommend-settings">
                    <span>메인 추천 노출</span>
                    <label className={isRecommendationSelectionDisabled ? "is-disabled" : ""}>
                      <input
                        type="checkbox"
                        checked={isRecommended}
                        disabled={isRecommendationSelectionDisabled}
                        onChange={handleRecommendationChange}
                      />
                      <span>
                        <strong>추천 상품으로 노출</strong>
                        <small>{recommendationGuide}</small>
                      </span>
                    </label>
                  </div>
                </div>
              </section>
            </div>
          </main>
          <footer className="admin-create-actions">
            {!isEditMode && <button type="button" onClick={() => navigate("/admin/products")}>임시저장</button>}
            <button type="submit" disabled={isSubmitting || (isEditMode && (isLoadingProduct || Boolean(productLoadError)))}>{isSubmitting ? "저장 중..." : isEditMode ? "수정하기" : "저장 / 등록"}</button>
          </footer>
        </form>
      </div>
    </div>
  );
}

export default AdminProductCreatePage;
