import { useEffect, useMemo, useState } from "react";
import {
  Bell,
  ChevronDown,
  ClipboardList,
  Home,
  Package,
  Pencil,
  Plus,
  Search,
  Tags,
  Users,
  X,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

import { buildAuthHeaders, clearAuthSession } from "../../utils/auth-storage.js";

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "/api";

const categoryOptions = [
  { value: "SNEAKERS", label: "스니커즈" },
  { value: "SPORTS", label: "스포츠" },
  { value: "SANDALS", label: "샌들" },
  { value: "DRESS_SHOES", label: "구두" },
  { value: "CASUAL", label: "캐주얼" },
];

const categoryNameByValue = Object.fromEntries(categoryOptions.map(({ value, label }) => [value, label]));

const emptyBrandDraft = {
  id: "",
  name: "",
  categories: [],
};

function AdminBrandManagementPage() {
  const navigate = useNavigate();
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isProductMenuOpen, setIsProductMenuOpen] = useState(true);
  const [brands, setBrands] = useState([]);
  const [brandDraft, setBrandDraft] = useState(emptyBrandDraft);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let isMounted = true;

    const loadBrands = async () => {
      try {
        setLoadError("");
        const response = await fetch(`${apiBaseUrl}/brands`);

        if (!response.ok) {
          throw new Error("브랜드 목록을 불러오지 못했습니다.");
        }

        const brandList = await response.json();

        if (!isMounted) return;

        setBrands(brandList);
      } catch (error) {
        if (isMounted) {
          setLoadError(error.message || "브랜드 목록을 불러오지 못했습니다.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadBrands();

    return () => {
      isMounted = false;
    };
  }, []);

  const filteredBrands = useMemo(() => {
    const normalizedSearchTerm = searchTerm.trim().toLocaleLowerCase("ko-KR");

    if (!normalizedSearchTerm) return brands;

    return brands.filter((brand) => brand.name.toLocaleLowerCase("ko-KR").includes(normalizedSearchTerm));
  }, [brands, searchTerm]);

  const handleLogout = () => {
    clearAuthSession();
    setIsProfileMenuOpen(false);
    navigate("/", { replace: true });
  };

  const selectBrand = (brand) => {
    setBrandDraft({
      id: brand.id,
      name: brand.name,
      categories: brand.categories || [],
    });
    setIsEditorOpen(true);
  };

  const closeEditor = () => {
    setBrandDraft(emptyBrandDraft);
    setIsEditorOpen(false);
  };

  const toggleCategory = (category) => {
    setBrandDraft((currentDraft) => ({
      ...currentDraft,
      categories: currentDraft.categories.includes(category)
        ? currentDraft.categories.filter((item) => item !== category)
        : [...currentDraft.categories, category],
    }));
  };

  const saveBrand = async (event) => {
    event.preventDefault();

    const name = brandDraft.name.trim();
    if (!name) {
      window.alert("브랜드 이름을 입력해주세요.");
      return;
    }

    try {
      setIsSaving(true);
      const isEditing = Boolean(brandDraft.id);
      const response = await fetch(
        isEditing ? `${apiBaseUrl}/brands/${brandDraft.id}` : `${apiBaseUrl}/brands`,
        {
          method: isEditing ? "PUT" : "POST",
          headers: { "Content-Type": "application/json", ...buildAuthHeaders() },
          body: JSON.stringify({ name, categories: brandDraft.categories }),
        },
      );
      const savedBrand = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(savedBrand.message || "브랜드 저장에 실패했습니다.");
      }

      setBrands((currentBrands) => {
        if (isEditing) {
          return currentBrands.map((brand) => (brand.id === savedBrand.id ? savedBrand : brand));
        }

        return [...currentBrands, savedBrand].sort((first, second) => first.name.localeCompare(second.name, "ko-KR"));
      });
      setBrandDraft({
        id: savedBrand.id,
        name: savedBrand.name,
        categories: savedBrand.categories || [],
      });
      setIsEditorOpen(false);
    } catch (error) {
      window.alert(error.message || "브랜드 저장에 실패했습니다.");
    } finally {
      setIsSaving(false);
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
                <Link to="/admin/products">상품 목록</Link>
                <Link to="/admin/products/low-stock">재고 부족</Link>
                <Link className="is-active" to="/admin/brands">브랜드 관리</Link>
              </div>
            )}
          </div>
          <Link className="admin-nav-link" to="/admin/orders">
            <ClipboardList size={20} strokeWidth={1.9} />
            <span>주문관리</span>
          </Link>
        </nav>
      </aside>

      <div className="admin-shell">
        <header className="admin-topbar">
          <h1>브랜드 관리</h1>
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
                  <Link to="/" role="menuitem" onClick={() => setIsProfileMenuOpen(false)}>메인페이지</Link>
                  <button type="button" role="menuitem" onClick={handleLogout}>로그아웃</button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className={`admin-content admin-brand-management-content ${isEditorOpen ? "is-editor-open" : ""}`}>
          <section className="admin-brand-list-card" aria-label="브랜드 목록">
            <div className="admin-brand-list-toolbar">
              <label className="admin-brand-search">
                <Search size={19} strokeWidth={2} />
                <input
                  type="search"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="브랜드명 검색"
                />
              </label>
              <button
                className="admin-brand-add-button"
                type="button"
                onClick={() => {
                  setBrandDraft(emptyBrandDraft);
                  setIsEditorOpen(true);
                }}
              >
                <Plus size={18} strokeWidth={2.4} /> 브랜드 추가
              </button>
            </div>

            {loadError ? (
              <p className="admin-brand-load-message">{loadError}</p>
            ) : (
              <div className="admin-brand-table-wrap">
                <table className="admin-brand-table">
                  <thead>
                    <tr>
                      <th>브랜드명</th>
                      <th>등록 카테고리</th>
                      <th>카테고리 수</th>
                      <th>수정일</th>
                      <th>관리</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoading ? (
                      <tr><td className="admin-brand-empty" colSpan="5">브랜드 목록을 불러오는 중입니다.</td></tr>
                    ) : filteredBrands.length === 0 ? (
                      <tr><td className="admin-brand-empty" colSpan="5">등록된 브랜드가 없습니다.</td></tr>
                    ) : (
                      filteredBrands.map((brand) => (
                        <tr className={brandDraft.id === brand.id ? "is-selected" : ""} key={brand.id}>
                          <td><strong><Tags size={18} strokeWidth={1.8} />{brand.name}</strong></td>
                          <td>
                            <div className="admin-brand-category-chips">
                              {(brand.categories || []).length > 0
                                ? brand.categories.map((category) => <span key={category}>{categoryNameByValue[category] || category}</span>)
                                : <small>등록된 카테고리 없음</small>}
                            </div>
                          </td>
                          <td>{brand.categories?.length || 0}개</td>
                          <td>{new Date(brand.updatedAt).toLocaleDateString("ko-KR")}</td>
                          <td>
                            <button className="admin-brand-edit-button" type="button" onClick={() => selectBrand(brand)}>
                              <Pencil size={15} strokeWidth={2} /> 수정
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {isEditorOpen && (
            <aside className="admin-brand-editor" aria-label="브랜드 편집">
              <div className="admin-brand-editor-heading">
                <h2>{brandDraft.id ? "브랜드 수정" : "브랜드 추가"}</h2>
                <button type="button" aria-label="편집 창 닫기" onClick={closeEditor}><X size={21} /></button>
              </div>
              <form onSubmit={saveBrand}>
                <label className="admin-brand-editor-field">
                  <span>브랜드명 <b>*</b></span>
                  <input
                    value={brandDraft.name}
                    onChange={(event) => setBrandDraft((draft) => ({ ...draft, name: event.target.value }))}
                    placeholder="브랜드명을 입력하세요"
                    maxLength="50"
                  />
                </label>

                <fieldset className="admin-brand-category-field">
                  <legend>브랜드 카테고리</legend>
                  <p>이 브랜드에서 판매하는 상품 카테고리를 선택하세요.</p>
                  <div>
                    {categoryOptions.map((category) => (
                      <label key={category.value} className={brandDraft.categories.includes(category.value) ? "is-checked" : ""}>
                        <input
                          type="checkbox"
                          checked={brandDraft.categories.includes(category.value)}
                          onChange={() => toggleCategory(category.value)}
                        />
                        <span>{category.label}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>

                <div className="admin-brand-editor-actions">
                  <button type="button" onClick={closeEditor}>취소</button>
                  <button type="submit" disabled={isSaving}>{isSaving ? "저장 중..." : "저장"}</button>
                </div>
              </form>
            </aside>
          )}
        </main>
      </div>
    </div>
  );
}

export default AdminBrandManagementPage;
