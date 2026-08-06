import { useEffect, useState } from "react";
import {
  Bell,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Home,
  Package,
  Pencil,
  RotateCcw,
  Search,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

import { clearAuthSession } from "../utils/auth-storage.js";

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "/api";

const categoryLabels = {
  SNEAKERS: "스니커즈",
  SPORTS: "스포츠",
  SANDALS: "샌들",
  DRESS_SHOES: "구두",
  CASUAL: "캐주얼",
};

const saleStatus = {
  SELLING: { label: "판매중", className: "selling" },
  HIDDEN: { label: "비공개", className: "hidden" },
  STOPPED: { label: "판매중지", className: "stopped" },
};

const statusFilterOptions = [
  { value: "ALL", label: "전체 상품" },
  { value: "SELLING", label: "판매중", dot: "green" },
  { value: "SOLD_OUT", label: "품절", dot: "amber" },
  { value: "HIDDEN", label: "비공개", dot: "gray" },
  { value: "STOPPED", label: "판매중지", dot: "red" },
];

const categoryFilterOptions = Object.entries(categoryLabels).map(([value, label]) => ({ value, label }));

const formatPrice = (price) => `${Number(price || 0).toLocaleString("ko-KR")}원`;

const formatDate = (value) => new Intl.DateTimeFormat("sv-SE", {
  timeZone: "Asia/Seoul",
}).format(new Date(value));

const formatTime = (value) => new Intl.DateTimeFormat("en-GB", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "Asia/Seoul",
}).format(new Date(value));

function AdminProductsPage() {
  const navigate = useNavigate();
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isProductMenuOpen, setIsProductMenuOpen] = useState(true);
  const [products, setProducts] = useState([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [productLoadError, setProductLoadError] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [brandFilter, setBrandFilter] = useState("ALL");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [productNameInput, setProductNameInput] = useState("");
  const [productNameQuery, setProductNameQuery] = useState("");
  const [brands, setBrands] = useState([]);
  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  const [isLoadingStock, setIsLoadingStock] = useState(false);
  const [stockProduct, setStockProduct] = useState(null);
  const [stockLoadError, setStockLoadError] = useState("");

  useEffect(() => {
    let isMounted = true;

    const loadProducts = async () => {
      try {
        setIsLoadingProducts(true);
        setProductLoadError("");
        const searchParams = new URLSearchParams();
        if (statusFilter === "SOLD_OUT") {
          searchParams.set("inventoryStatus", "SOLD_OUT");
        } else if (statusFilter !== "ALL") {
          searchParams.set("status", statusFilter);
        }
        if (brandFilter !== "ALL") searchParams.set("brand", brandFilter);
        if (categoryFilter !== "ALL") searchParams.set("category", categoryFilter);
        if (productNameQuery) searchParams.set("name", productNameQuery);
        const queryString = searchParams.size > 0 ? `?${searchParams.toString()}` : "";
        const response = await fetch(`${apiBaseUrl}/products${queryString}`);
        const productList = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(productList.message || "상품 목록을 불러오지 못했습니다.");
        }

        if (isMounted) {
          setProducts(productList);
        }
      } catch (error) {
        if (isMounted) {
          setProductLoadError(error.message || "상품 목록을 불러오지 못했습니다.");
        }
      } finally {
        if (isMounted) {
          setIsLoadingProducts(false);
        }
      }
    };

    loadProducts();

    return () => {
      isMounted = false;
    };
  }, [brandFilter, categoryFilter, productNameQuery, statusFilter]);

  useEffect(() => {
    let isMounted = true;

    const loadBrands = async () => {
      try {
        const response = await fetch(`${apiBaseUrl}/brands`);
        const brandList = await response.json().catch(() => []);

        if (response.ok && isMounted) {
          setBrands(brandList);
        }
      } catch {
        // 상품 목록은 그대로 조회하고, 브랜드 필터 선택지만 비워둡니다.
      }
    };

    loadBrands();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!isStockModalOpen) return undefined;

    const closeOnEscape = (event) => {
      if (event.key === "Escape") {
        setIsStockModalOpen(false);
      }
    };

    window.addEventListener("keydown", closeOnEscape);

    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [isStockModalOpen]);

  const handleLogout = () => {
    clearAuthSession();
    setIsProfileMenuOpen(false);
    navigate("/", { replace: true });
  };

  const closeStockModal = () => {
    setIsStockModalOpen(false);
    setStockProduct(null);
    setStockLoadError("");
  };

  const openStockModal = async (productId) => {
    try {
      setIsStockModalOpen(true);
      setIsLoadingStock(true);
      setStockProduct(null);
      setStockLoadError("");

      const response = await fetch(`${apiBaseUrl}/products/${productId}`);
      const product = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(product.message || "재고 정보를 불러오지 못했습니다.");
      }

      setStockProduct(product);
    } catch (error) {
      setStockLoadError(error.message || "재고 정보를 불러오지 못했습니다.");
    } finally {
      setIsLoadingStock(false);
    }
  };

  const handleBrandFilterChange = (value) => {
    setBrandFilter(value);
    setCategoryFilter("ALL");
  };

  const resetFilters = () => {
    setStatusFilter("ALL");
    setBrandFilter("ALL");
    setCategoryFilter("ALL");
    setProductNameInput("");
    setProductNameQuery("");
  };

  const availableCategoryFilters = brandFilter === "ALL"
    ? categoryFilterOptions
    : (brands.find((brand) => brand.name === brandFilter)?.categories || [])
      .map((category) => ({ value: category, label: categoryLabels[category] || category }));

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
          <Link className="admin-nav-link" to="/admin">
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
                <Link to="/admin/brands">브랜드 관리</Link>
              </div>
            )}
          </div>
          <Link className="admin-nav-link" to="/admin">
            <ClipboardList size={20} strokeWidth={1.9} />
            <span>주문관리</span>
          </Link>
        </nav>
      </aside>

      <div className="admin-shell">
        <header className="admin-topbar">
          <h1>상품 관리</h1>

          <div className="admin-topbar-actions">
            <button className="admin-icon-button" type="button" aria-label="알림">
              <Bell size={24} strokeWidth={1.8} />
              <span>3</span>
            </button>

            <div
              className="admin-profile-menu-wrap"
              onBlur={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget)) {
                  setIsProfileMenuOpen(false);
                }
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

        <main className="admin-content admin-products-content">
          <section className="admin-product-filter-panel" aria-label="product filters">
            <div className="admin-product-toolbar">
              <Link className="admin-product-primary-button" to="/admin/products/new">
                상품 등록
              </Link>
            </div>

            <div className="admin-product-filters">
              <fieldset className="admin-status-filter">
                <legend>판매상태</legend>
                {statusFilterOptions.map((filter) => (
                  <button className={statusFilter === filter.value ? "is-selected" : ""} type="button" key={filter.value} onClick={() => setStatusFilter(filter.value)}>
                    {filter.dot && <span className={`status-dot ${filter.dot}`} />}
                    {filter.label}
                  </button>
                ))}
              </fieldset>

              <label className="admin-filter-field">
                <span>브랜드</span>
                <select value={brandFilter} onChange={(event) => handleBrandFilterChange(event.target.value)}>
                  <option value="ALL">전체</option>
                  {brands.map((brand) => <option key={brand.id} value={brand.name}>{brand.name}</option>)}
                </select>
                <ChevronDown size={17} strokeWidth={2} />
              </label>

              <label className="admin-filter-field">
                <span>카테고리</span>
                <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
                  <option value="ALL">전체</option>
                  {availableCategoryFilters.map((category) => <option key={category.value} value={category.value}>{category.label}</option>)}
                </select>
                <ChevronDown size={17} strokeWidth={2} />
              </label>

              <div className="admin-product-search-field">
                <label htmlFor="admin-product-name">상품명</label>
                <form onSubmit={(event) => {
                  event.preventDefault();
                  setProductNameQuery(productNameInput.trim());
                }}>
                  <input id="admin-product-name" type="search" value={productNameInput} onChange={(event) => setProductNameInput(event.target.value)} placeholder="상품명을 입력하세요" />
                  <button type="submit">검색</button>
                </form>
              </div>
              <button className="admin-filter-reset-button admin-product-filter-reset" type="button" aria-label="필터 초기화" title="필터 초기화" onClick={resetFilters}>
                <RotateCcw size={18} strokeWidth={2} />
              </button>
            </div>
          </section>

          <section className="admin-product-list-panel" aria-label="product list">
            <div className="admin-product-bulkbar">
              <div>
                <span>선택한 상품 (0개)</span>
                <button className="bulk-green" type="button">
                  판매중으로 변경
                </button>
                <button className="bulk-red" type="button">
                  판매중지로 변경
                </button>
              </div>
              <strong>
                총 <b>{products.length}</b>개의 상품
              </strong>
            </div>

            <div className="admin-products-table-wrap">
              <table className="admin-products-table">
                <thead>
                  <tr>
                    <th>
                      <input type="checkbox" aria-label="전체 상품 선택" />
                    </th>
                    <th>상품정보</th>
                    <th>카테고리</th>
                    <th>판매상태</th>
                    <th>재고수량</th>
                    <th>판매가</th>
                    <th>수정일</th>
                    <th>재고조회</th>
                    <th>수정</th>
                    <th>삭제</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoadingProducts && (
                    <tr><td className="admin-products-empty" colSpan="10">상품 목록을 불러오는 중입니다.</td></tr>
                  )}
                  {!isLoadingProducts && productLoadError && (
                    <tr><td className="admin-products-empty is-error" colSpan="10">{productLoadError}</td></tr>
                  )}
                  {!isLoadingProducts && !productLoadError && products.length === 0 && (
                    <tr><td className="admin-products-empty" colSpan="10">등록된 상품이 없습니다.</td></tr>
                  )}
                  {!isLoadingProducts && !productLoadError && products.map((product) => {
                    const stockQuantity = product.totalStockQuantity ?? product.sizes.reduce((total, size) => total + size.stockQuantity, 0);
                    const currentStatus = product.status === "SELLING" && product.inventoryStatus === "SOLD_OUT"
                      ? { label: "품절", className: "soldout" }
                      : saleStatus[product.status] || saleStatus.HIDDEN;
                    const price = product.salePrice ?? product.regularPrice;

                    return (
                      <tr key={product.id}>
                        <td>
                          <input type="checkbox" aria-label={`${product.name} 선택`} />
                        </td>
                        <td>
                          <div className="admin-product-info">
                            <img src={product.cardImages.defaultImage} alt="" aria-hidden="true" />
                            <div>
                              <strong>{product.name}</strong>
                              <small>{product.brand}</small>
                            </div>
                          </div>
                        </td>
                        <td><span>{categoryLabels[product.category] || product.category}</span></td>
                        <td>
                          <span className={`admin-product-status ${currentStatus.className}`}>{currentStatus.label}</span>
                        </td>
                        <td>{stockQuantity}</td>
                        <td>{formatPrice(price)}</td>
                        <td>
                          <span>{formatDate(product.updatedAt)}</span>
                          <small>{formatTime(product.updatedAt)}</small>
                        </td>
                        <td>
                          <button className="admin-table-icon-button" type="button" aria-label={`${product.name} 재고조회`} onClick={() => openStockModal(product.id)}>
                            <Search size={24} strokeWidth={1.9} />
                          </button>
                        </td>
                        <td>
                          <button className="admin-table-icon-button" type="button" aria-label={`${product.name} 수정`} onClick={() => navigate(`/admin/products/${product.id}/edit`)}>
                            <Pencil size={21} strokeWidth={2} />
                          </button>
                        </td>
                        <td>
                          <button className="admin-table-icon-button" type="button" aria-label={`${product.name} 삭제`}>
                            <Trash2 size={22} strokeWidth={2} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="admin-product-pagination">
              <button type="button" aria-label="이전 페이지">
                <ChevronLeft size={18} strokeWidth={2} />
              </button>
              {Array.from({ length: 10 }, (_, index) => index + 1).map((pageNumber) => (
                <button className={pageNumber === 1 ? "is-current" : ""} type="button" key={pageNumber}>
                  {pageNumber}
                </button>
              ))}
              <button type="button" aria-label="다음 페이지">
                <ChevronRight size={18} strokeWidth={2} />
              </button>

              <label className="admin-page-size-select">
                <select defaultValue="10">
                  <option value="10">10개씩 보기</option>
                  <option value="20">20개씩 보기</option>
                  <option value="50">50개씩 보기</option>
                </select>
                <ChevronDown size={16} strokeWidth={2} />
              </label>
            </div>
          </section>
        </main>

        {isStockModalOpen && (
          <div className="admin-stock-modal-backdrop" role="presentation" onMouseDown={closeStockModal}>
            <section
              className="admin-stock-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="admin-stock-modal-title"
              onMouseDown={(event) => event.stopPropagation()}
            >
              <div className="admin-stock-modal-heading">
                <h2 id="admin-stock-modal-title">재고 정보</h2>
                <button type="button" aria-label="재고 정보 닫기" onClick={closeStockModal}><X size={21} strokeWidth={2} /></button>
              </div>

              {isLoadingStock && <p className="admin-stock-modal-message">재고 정보를 불러오는 중입니다.</p>}
              {!isLoadingStock && stockLoadError && <p className="admin-stock-modal-message is-error">{stockLoadError}</p>}
              {!isLoadingStock && stockProduct && (
                <>
                  <div className="admin-stock-product-summary">
                    <div>
                      <img src={stockProduct.cardImages.defaultImage} alt="" aria-hidden="true" />
                    </div>
                    <p>
                      <strong>{stockProduct.name}</strong>
                      <span>{stockProduct.brand}</span>
                    </p>
                  </div>

                  <div className="admin-stock-modal-table-wrap">
                    <table className="admin-stock-modal-table">
                      <thead><tr><th>사이즈 (mm)</th><th>재고 수량</th></tr></thead>
                      <tbody>
                        {[...stockProduct.sizes]
                          .sort((first, second) => first.size - second.size)
                          .map((size) => <tr key={size.size}><td>{size.size}</td><td>{size.stockQuantity}</td></tr>)}
                      </tbody>
                    </table>
                  </div>
                </>
              )}

              <button className="admin-stock-modal-close-button" type="button" onClick={closeStockModal}>닫기</button>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminProductsPage;
