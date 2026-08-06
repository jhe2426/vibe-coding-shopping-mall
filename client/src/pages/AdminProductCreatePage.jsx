import { useRef, useState } from "react";
import {
  Bell,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  ImagePlus,
  Home,
  Package,
  Plus,
  Users,
  X,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

import product01 from "../assets/home-products/product-01.png";
import product02 from "../assets/home-products/product-02.png";
import product03 from "../assets/home-products/product-03.png";
import product04 from "../assets/home-products/product-04.png";
import product05 from "../assets/home-products/product-05.png";
import productHover01 from "../assets/home-products/product-hover-01.png";
import { clearAuthSession } from "../utils/auth-storage.js";

const initialSizes = [
  { id: "size-250", size: "250", quantity: "100", code: "", adjustment: "0" },
  { id: "size-255", size: "255", quantity: "150", code: "", adjustment: "0" },
  { id: "size-260", size: "260", quantity: "50", code: "", adjustment: "0" },
  { id: "size-265", size: "265", quantity: "60", code: "", adjustment: "0" },
  { id: "size-270", size: "270", quantity: "80", code: "", adjustment: "0" },
  { id: "size-275", size: "275", quantity: "50", code: "", adjustment: "0" },
];

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
  const defaultImageInputRef = useRef(null);
  const hoverImageInputRef = useRef(null);
  const extraImageInputRef = useRef(null);
  const nextSizeOptionId = useRef(initialSizes.length);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [defaultImage, setDefaultImage] = useState(product01);
  const [hoverImage, setHoverImage] = useState(productHover01);
  const [extraImages, setExtraImages] = useState([product02, product03, product04, product05]);
  const [sizes, setSizes] = useState(initialSizes);
  const [status, setStatus] = useState("판매중");

  const handleLogout = () => {
    clearAuthSession();
    setIsProfileMenuOpen(false);
    navigate("/", { replace: true });
  };

  const readImage = (event, onLoad) => {
    const [file] = event.target.files ?? [];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => onLoad(reader.result);
    reader.readAsDataURL(file);
    event.target.value = "";
  };

  const updateSize = (index, field, value) => {
    setSizes((currentSizes) =>
      currentSizes.map((item, itemIndex) => (itemIndex === index ? { ...item, [field]: value } : item)),
    );
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    navigate("/admin/products");
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

      <div className="admin-shell admin-create-shell">
        <header className="admin-topbar">
          <h1>상품 등록</h1>
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
          <main className="admin-create-content">
            <div className="admin-create-column">
              <section className="admin-create-card">
                <SectionTitle number="1">기본 정보</SectionTitle>
                <div className="admin-create-basic-grid">
                  <label className="admin-create-field">
                    <span>브랜드 <b>*</b></span>
                    <SelectField defaultValue="adidas">
                      <option value="adidas">아디다스</option>
                      <option value="nike">나이키</option>
                      <option value="new-balance">뉴발란스</option>
                      <option value="vans">반스</option>
                    </SelectField>
                  </label>
                  <label className="admin-create-field">
                    <span>상품 코드</span>
                    <input placeholder="자동 생성 또는 직접 입력" />
                    <small>영문, 숫자 조합 4~20자</small>
                  </label>
                  <label className="admin-create-field admin-create-span-full">
                    <span>상품명 <b>*</b></span>
                    <input defaultValue="슈퍼 로우 프로 - 블랙" />
                  </label>
                  <div className="admin-create-field admin-create-span-full">
                    <span>카테고리 <b>*</b></span>
                    <div className="admin-category-selects">
                      <SelectField defaultValue="shoes">
                        <option value="shoes">신발</option>
                      </SelectField>
                      <ChevronRight size={18} strokeWidth={1.8} />
                      <SelectField defaultValue="sneakers">
                        <option value="sneakers">스니커즈</option>
                      </SelectField>
                      <ChevronRight size={18} strokeWidth={1.8} />
                      <SelectField defaultValue="lowtop">
                        <option value="lowtop">로우탑</option>
                      </SelectField>
                    </div>
                  </div>
                  <label className="admin-create-field admin-create-color-field">
                    <span>컬러 <b>*</b></span>
                    <SelectField defaultValue="black">
                      <option value="black">●&nbsp; 블랙</option>
                      <option value="white">●&nbsp; 화이트</option>
                    </SelectField>
                  </label>
                </div>
              </section>

              <section className="admin-create-card admin-create-price-card">
                <SectionTitle number="2">가격 및 카테고리</SectionTitle>
                <div className="admin-create-price-grid">
                  <label className="admin-create-field admin-unit-field admin-sale-price-field">
                    <span>판매가 <b>*</b></span>
                    <div><input defaultValue="94,000" inputMode="numeric" /><em>원</em></div>
                  </label>
                  <label className="admin-create-field admin-unit-field">
                    <span>할인율</span>
                    <div><input defaultValue="10" inputMode="numeric" /><em>%</em></div>
                  </label>
                  <label className="admin-create-field admin-unit-field">
                    <span>정상가</span>
                    <div><input defaultValue="104,000" inputMode="numeric" /><em>원</em></div>
                  </label>
                  <div className="admin-create-field admin-create-span-full">
                    <span>대표 카테고리 <b>*</b></span>
                    <div className="admin-primary-category">
                      <SelectField defaultValue="men"><option value="men">남성</option><option value="women">여성</option></SelectField>
                      <SelectField defaultValue="sneaker"><option value="sneaker">로우탑 스니커즈</option><option value="running">러닝화</option></SelectField>
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
                          <td><input value={item.size} onChange={(event) => updateSize(index, "size", event.target.value)} /></td>
                          <td><input value={item.quantity} onChange={(event) => updateSize(index, "quantity", event.target.value)} /></td>
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
                      <input ref={defaultImageInputRef} className="admin-file-input" type="file" accept="image/*" onChange={(event) => readImage(event, setDefaultImage)} />
                      <button className="admin-image-change-button" type="button" onClick={() => defaultImageInputRef.current?.click()}>기본 이미지 변경</button>
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
                      <input ref={hoverImageInputRef} className="admin-file-input" type="file" accept="image/*" onChange={(event) => readImage(event, setHoverImage)} />
                      <button className="admin-image-change-button" type="button" onClick={() => hoverImageInputRef.current?.click()}>호버 이미지 변경</button>
                    </div>
                  </div>
                </div>
                <div className="admin-create-extra-images">
                  <span>추가 이미지</span>
                  <div>
                    {extraImages.map((image, index) => (
                      <button className="admin-extra-image" type="button" key={`${image}-${index}`} onClick={() => setDefaultImage(image)}>
                        <img src={image} alt={`추가 이미지 ${index + 1}`} />
                      </button>
                    ))}
                    {extraImages.length < 8 && (
                      <button className="admin-add-image-button" type="button" onClick={() => extraImageInputRef.current?.click()}>
                        <ImagePlus size={22} strokeWidth={1.7} />
                        <small>이미지 추가<br />(최대 8장)</small>
                      </button>
                    )}
                    <input ref={extraImageInputRef} className="admin-file-input" type="file" accept="image/*" onChange={(event) => readImage(event, (image) => setExtraImages((images) => [...images, image]))} />
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
                      ["품절", "재고가 없으며, 구매가 불가능합니다."],
                      ["비공개", "상품을 숨기며, 고객에게 노출되지 않습니다."],
                    ].map(([value, description]) => (
                      <label key={value}>
                        <input type="radio" name="sale-status" value={value} checked={status === value} onChange={() => setStatus(value)} />
                        <span><strong>{value}</strong><small>{description}</small></span>
                      </label>
                    ))}
                  </div>
                </div>
              </section>
            </div>
          </main>
          <footer className="admin-create-actions">
            <button type="button" onClick={() => navigate("/admin/products")}>임시저장</button>
            <button type="submit">저장 / 등록</button>
          </footer>
        </form>
      </div>
    </div>
  );
}

export default AdminProductCreatePage;
