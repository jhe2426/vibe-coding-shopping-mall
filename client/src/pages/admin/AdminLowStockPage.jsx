import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
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
  Users,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

import { clearAuthSession } from "../../utils/auth-storage.js";

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "/api";
const LOW_STOCK_THRESHOLD = 10;
const ITEMS_PER_PAGE = 10;

const formatDate = (value) => new Intl.DateTimeFormat("sv-SE", {
  timeZone: "Asia/Seoul",
}).format(new Date(value));

function AdminLowStockPage() {
  const navigate = useNavigate();
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isProductMenuOpen, setIsProductMenuOpen] = useState(true);
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [keywordInput, setKeywordInput] = useState("");
  const [keyword, setKeyword] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    let isMounted = true;

    const loadLowStockProducts = async () => {
      try {
        setIsLoading(true);
        setLoadError("");

        const searchParams = new URLSearchParams({
          status: "SELLING",
          inventoryStatus: "LOW_STOCK",
        });
        const response = await fetch(`${apiBaseUrl}/products?${searchParams.toString()}`);
        const productList = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(productList.message || "재고 부족 상품을 불러오지 못했습니다.");
        }

        if (isMounted) {
          setProducts(productList);
        }
      } catch (error) {
        if (isMounted) {
          setLoadError(error.message || "재고 부족 상품을 불러오지 못했습니다.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadLowStockProducts();

    return () => {
      isMounted = false;
    };
  }, []);

  const lowStockItems = useMemo(() => products.flatMap((product) => (product.sizes || [])
    .filter((size) => Number(size.stockQuantity) <= LOW_STOCK_THRESHOLD)
    .map((size) => ({
      product,
      size: Number(size.size),
      stockQuantity: Number(size.stockQuantity),
    })))
    .sort((first, second) => (
      first.stockQuantity - second.stockQuantity
      || first.product.name.localeCompare(second.product.name, "ko-KR")
      || first.size - second.size
    )), [products]);

  const filteredItems = useMemo(() => {
    if (!keyword) return lowStockItems;

    const normalizedKeyword = keyword.toLocaleLowerCase("ko-KR");

    return lowStockItems.filter(({ product }) => (
      product.name.toLocaleLowerCase("ko-KR").includes(normalizedKeyword)
      || product.brand.toLocaleLowerCase("ko-KR").includes(normalizedKeyword)
    ));
  }, [keyword, lowStockItems]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / ITEMS_PER_PAGE));
  const paginatedItems = filteredItems.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );
  const visiblePageNumbers = Array.from({ length: totalPages }, (_, index) => index + 1).slice(0, 10);

  const handleLogout = () => {
    clearAuthSession();
    setIsProfileMenuOpen(false);
    navigate("/", { replace: true });
  };

  const handleSearch = () => {
    setKeyword(keywordInput.trim());
    setCurrentPage(1);
  };

  const resetFilters = () => {
    setKeywordInput("");
    setKeyword("");
    setCurrentPage(1);
  };

  return (
    <div className="admin-page">
      <aside className="admin-sidebar" aria-label="admin navigation">
        <div className="admin-brand">
          <strong>STRIDE ADMIN</strong>
          <span>관리자 모드</span>
        </div>

        <nav className="admin-nav">
          <Link className="admin-nav-link" to="/admin"><Home size={20} strokeWidth={1.9} /><span>HOME</span></Link>
          <Link className="admin-nav-link" to="/admin/members"><Users size={20} strokeWidth={1.9} /><span>회원관리</span></Link>
          <div className="admin-nav-product-group">
            <button className="admin-nav-link is-active" type="button" aria-expanded={isProductMenuOpen} onClick={() => setIsProductMenuOpen((isOpen) => !isOpen)}>
              <Package size={20} strokeWidth={1.9} /><span>상품관리</span><ChevronDown className="admin-nav-expand-icon" size={16} strokeWidth={2} />
            </button>
            {isProductMenuOpen && (
              <div className="admin-nav-submenu">
                <Link to="/admin/products">상품 목록</Link>
                <Link className="is-active" to="/admin/products/low-stock">재고 부족</Link>
                <Link to="/admin/brands">브랜드 관리</Link>
              </div>
            )}
          </div>
          <Link className="admin-nav-link" to="/admin/orders"><ClipboardList size={20} strokeWidth={1.9} /><span>주문관리</span></Link>
        </nav>
      </aside>

      <div className="admin-shell">
        <header className="admin-topbar">
          <h1>재고 부족</h1>
          <div className="admin-topbar-actions">
            <button className="admin-icon-button" type="button" aria-label="알림"><Bell size={24} strokeWidth={1.8} /><span>3</span></button>
            <div
              className="admin-profile-menu-wrap"
              onBlur={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget)) setIsProfileMenuOpen(false);
              }}
            >
              <button className="admin-profile-button" type="button" aria-expanded={isProfileMenuOpen} aria-haspopup="menu" onClick={() => setIsProfileMenuOpen((isOpen) => !isOpen)}>
                <span className="admin-profile-avatar">AD</span><span className="admin-profile-label">관리자</span><ChevronDown className="admin-profile-chevron" size={17} strokeWidth={2} />
              </button>
              {isProfileMenuOpen && (
                <div className="admin-profile-menu" role="menu">
                  <Link to="/" role="menuitem" onClick={() => setIsProfileMenuOpen(false)}>메인페이지</Link>
                  <button type="button" role="menuitem" onClick={handleLogout}>로그아웃</button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="admin-content admin-low-stock-content">
          <section className="admin-low-stock-summary" aria-label="low stock summary">
            <span className="admin-low-stock-summary-icon"><AlertTriangle size={28} strokeWidth={1.9} /></span>
            <div>
              <p>재고 부족 사이즈</p>
              <strong>{lowStockItems.length}개</strong>
              <span>판매 중인 상품 중 재고가 {LOW_STOCK_THRESHOLD}개 이하인 사이즈입니다.</span>
            </div>
            <Link className="admin-low-stock-all-products" to="/admin/products">전체 상품 관리</Link>
          </section>

          <section className="admin-low-stock-list-panel" aria-label="low stock product list">
            <div className="admin-low-stock-list-heading">
              <div>
                <h2>재고 부족 상품</h2>
                <p>사이즈별 현재 재고를 확인하고 필요한 상품을 수정하세요.</p>
              </div>
              <div className="admin-low-stock-search-controls">
                <form onSubmit={(event) => {
                  event.preventDefault();
                  handleSearch();
                }}>
                  <label className="sr-only" htmlFor="admin-low-stock-search">상품명 또는 브랜드 검색</label>
                  <Search size={18} strokeWidth={2} />
                  <input id="admin-low-stock-search" type="search" value={keywordInput} onChange={(event) => setKeywordInput(event.target.value)} placeholder="상품명 또는 브랜드 검색" />
                  <button type="submit">검색</button>
                </form>
                <button className="admin-filter-reset-button" type="button" title="검색 초기화" aria-label="검색 초기화" onClick={resetFilters}><RotateCcw size={18} strokeWidth={2} /></button>
              </div>
            </div>

            <div className="admin-low-stock-table-wrap">
              <table className="admin-low-stock-table">
                <thead><tr><th>상품정보</th><th>브랜드</th><th>사이즈</th><th>현재 재고</th><th>판매 상태</th><th>수정일</th><th>관리</th></tr></thead>
                <tbody>
                  {isLoading && <tr><td className="admin-low-stock-empty" colSpan="7">재고 부족 상품을 불러오는 중입니다.</td></tr>}
                  {!isLoading && loadError && <tr><td className="admin-low-stock-empty is-error" colSpan="7">{loadError}</td></tr>}
                  {!isLoading && !loadError && paginatedItems.length === 0 && <tr><td className="admin-low-stock-empty" colSpan="7">재고 부족 상품이 없습니다.</td></tr>}
                  {!isLoading && !loadError && paginatedItems.map(({ product, size, stockQuantity }) => (
                    <tr key={`${product.id}-${size}`}>
                      <td>
                        <div className="admin-low-stock-product-info">
                          <img src={product.cardImages.defaultImage} alt="" aria-hidden="true" />
                          <strong>{product.name}</strong>
                        </div>
                      </td>
                      <td>{product.brand}</td>
                      <td>{size}</td>
                      <td><span className={stockQuantity === 0 ? "is-sold-out" : "is-low"}>{stockQuantity}개</span></td>
                      <td><span className="admin-product-status selling">판매중</span></td>
                      <td>{formatDate(product.updatedAt)}</td>
                      <td><Link className="admin-low-stock-edit-button" to={`/admin/products/${product.id}/edit`}><Pencil size={15} strokeWidth={2} />재고 수정</Link></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filteredItems.length > ITEMS_PER_PAGE && (
              <nav className="admin-low-stock-pagination" aria-label="재고 부족 상품 페이지">
                <button type="button" aria-label="이전 페이지" disabled={currentPage === 1} onClick={() => setCurrentPage((page) => page - 1)}><ChevronLeft size={18} strokeWidth={2} /></button>
                {visiblePageNumbers.map((pageNumber) => <button className={pageNumber === currentPage ? "is-current" : ""} type="button" key={pageNumber} onClick={() => setCurrentPage(pageNumber)}>{pageNumber}</button>)}
                <button type="button" aria-label="다음 페이지" disabled={currentPage === totalPages} onClick={() => setCurrentPage((page) => page + 1)}><ChevronRight size={18} strokeWidth={2} /></button>
              </nav>
            )}
          </section>
        </main>
      </div>
    </div>
  );
}

export default AdminLowStockPage;
