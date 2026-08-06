import { useState } from "react";
import {
  Bell,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Home,
  Package,
  Pencil,
  Search,
  Trash2,
  Users,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

import product01 from "../assets/home-products/product-01.png";
import product02 from "../assets/home-products/product-02.png";
import product03 from "../assets/home-products/product-03.png";
import product04 from "../assets/home-products/product-04.png";
import product05 from "../assets/home-products/product-05.png";
import product06 from "../assets/home-products/product-06.png";
import product07 from "../assets/home-products/product-07.png";
import product08 from "../assets/home-products/product-08.png";
import { clearAuthSession } from "../utils/auth-storage.js";

const products = [
  {
    id: "SRP-BLK-250",
    name: "슈퍼 로우 프로 - 블랙",
    sku: "SKU SRP-BLK-250",
    brand: "아디다스",
    category: "스니커즈",
    subCategory: "로우탑",
    status: "판매중",
    stock: 250,
    price: "94,000원",
    updatedAt: "2025-05-12",
    updatedTime: "14:30",
    image: product01,
  },
  {
    id: "HBS-NVY-245",
    name: "핸드볼 스페지알",
    sku: "SKU HBS-NVY-245",
    brand: "아디다스",
    category: "스니커즈",
    subCategory: "로우탑",
    status: "판매중",
    stock: 180,
    price: "59,000원",
    updatedAt: "2025-05-10",
    updatedTime: "09:15",
    image: product04,
  },
  {
    id: "NB-ML408WB",
    name: "ML408WB",
    sku: "SKU NB-ML408WB",
    brand: "뉴발란스",
    category: "러닝화",
    subCategory: "러닝",
    status: "판매중",
    stock: 320,
    price: "99,000원",
    updatedAt: "2025-05-05",
    updatedTime: "16:45",
    image: product03,
  },
  {
    id: "NK-INI-W-255",
    name: "우먼스 나이키 이니시에이터 NA",
    sku: "SKU NK-INI-W-255",
    brand: "나이키",
    category: "러닝화",
    subCategory: "러닝",
    status: "판매중",
    stock: 210,
    price: "69,000원",
    updatedAt: "2025-05-03",
    updatedTime: "11:20",
    image: product05,
  },
  {
    id: "NK-TARGA-265",
    name: "타르가 클럽",
    sku: "SKU NK-TARGA-265",
    brand: "휠라",
    category: "스니커즈",
    subCategory: "로우탑",
    status: "품절",
    stock: 0,
    price: "39,000원",
    updatedAt: "2025-05-01",
    updatedTime: "10:05",
    image: product02,
  },
  {
    id: "NK-GAMMA-260",
    name: "나이키 감마 포스",
    sku: "SKU NK-GAMMA-260",
    brand: "나이키",
    category: "스니커즈",
    subCategory: "로우탑",
    status: "판매중",
    stock: 145,
    price: "89,000원",
    updatedAt: "2025-04-30",
    updatedTime: "15:40",
    image: product06,
  },
  {
    id: "NB-530-250",
    name: "뉴발란스 530",
    sku: "SKU NB-530-250",
    brand: "뉴발란스",
    category: "러닝화",
    subCategory: "러닝",
    status: "판매중",
    stock: 98,
    price: "109,000원",
    updatedAt: "2025-04-28",
    updatedTime: "13:25",
    image: product07,
  },
  {
    id: "VANS-OLD-BLK",
    name: "반스 올드스쿨 - 블랙",
    sku: "SKU VANS-OLD-BLK",
    brand: "반스",
    category: "스니커즈",
    subCategory: "로우탑",
    status: "판매중",
    stock: 76,
    price: "75,000원",
    updatedAt: "2025-04-26",
    updatedTime: "09:50",
    image: product08,
  },
];

function AdminProductsPage() {
  const navigate = useNavigate();
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);

  const handleLogout = () => {
    clearAuthSession();
    setIsProfileMenuOpen(false);
    navigate("/", { replace: true });
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
          <Link className="admin-nav-link" to="/admin">
            <Users size={20} strokeWidth={1.9} />
            <span>회원관리</span>
          </Link>
          <Link className="admin-nav-link is-active" to="/admin/products">
            <Package size={20} strokeWidth={1.9} />
            <span>상품관리</span>
          </Link>
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
                <button className="is-selected" type="button">
                  전체 상품
                </button>
                <button type="button">
                  <span className="status-dot green" />
                  판매중
                </button>
                <button type="button">
                  <span className="status-dot red" />
                  품절
                </button>
              </fieldset>

              <label className="admin-filter-field">
                <span>브랜드</span>
                <select defaultValue="all">
                  <option value="all">전체</option>
                  <option value="nike">나이키</option>
                  <option value="adidas">아디다스</option>
                  <option value="newbalance">뉴발란스</option>
                </select>
                <ChevronDown size={17} strokeWidth={2} />
              </label>

              <label className="admin-filter-field">
                <span>카테고리</span>
                <select defaultValue="all">
                  <option value="all">전체</option>
                  <option value="sneakers">스니커즈</option>
                  <option value="running">러닝화</option>
                </select>
                <ChevronDown size={17} strokeWidth={2} />
              </label>

              <div className="admin-product-search-field">
                <label htmlFor="admin-product-name">상품명</label>
                <div>
                  <input id="admin-product-name" type="search" placeholder="상품명을 입력하세요" />
                  <button type="button">검색</button>
                </div>
              </div>
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
                  품절로 변경
                </button>
              </div>
              <strong>
                총 <b>456</b>개의 상품
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
                  {products.map((product) => (
                    <tr key={product.id}>
                      <td>
                        <input type="checkbox" aria-label={`${product.name} 선택`} />
                      </td>
                      <td>
                        <div className="admin-product-info">
                          <img src={product.image} alt="" aria-hidden="true" />
                          <div>
                            <strong>{product.name}</strong>
                            <span>{product.sku}</span>
                            <small>{product.brand}</small>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span>{product.category}</span>
                        <small>{product.subCategory}</small>
                      </td>
                      <td>
                        <span className={`admin-product-status ${product.status === "품절" ? "soldout" : "selling"}`}>
                          {product.status}
                        </span>
                      </td>
                      <td>{product.stock}</td>
                      <td>{product.price}</td>
                      <td>
                        <span>{product.updatedAt}</span>
                        <small>{product.updatedTime}</small>
                      </td>
                      <td>
                        <button className="admin-table-icon-button" type="button" aria-label={`${product.name} 재고조회`}>
                          <Search size={24} strokeWidth={1.9} />
                        </button>
                      </td>
                      <td>
                        <button className="admin-table-icon-button" type="button" aria-label={`${product.name} 수정`}>
                          <Pencil size={21} strokeWidth={2} />
                        </button>
                      </td>
                      <td>
                        <button className="admin-table-icon-button" type="button" aria-label={`${product.name} 삭제`}>
                          <Trash2 size={22} strokeWidth={2} />
                        </button>
                      </td>
                    </tr>
                  ))}
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
      </div>
    </div>
  );
}

export default AdminProductsPage;
