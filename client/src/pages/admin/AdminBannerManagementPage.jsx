import { useEffect, useMemo, useState } from "react";
import {
  Bell,
  ChevronDown,
  ClipboardList,
  Home,
  ImagePlus,
  Package,
  PanelsTopLeft,
  Pencil,
  Plus,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

import { buildAuthHeaders, clearAuthSession } from "../../utils/auth-storage.js";

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "/api";
const cloudinaryCloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const cloudinaryUploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

const createEmptyDraft = (displayOrder = 1) => ({
  id: "",
  imageUrl: "",
  eyebrow: "",
  title: "",
  description: "",
  buttonLabel: "구매하기",
  linkedProductId: "",
  displayOrder,
  isVisible: true,
});

function AdminBannerManagementPage() {
  const navigate = useNavigate();
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isContentMenuOpen, setIsContentMenuOpen] = useState(true);
  const [banners, setBanners] = useState([]);
  const [products, setProducts] = useState([]);
  const [draft, setDraft] = useState(createEmptyDraft());
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const productNameById = useMemo(
    () => new Map(products.map((product) => [product.productId, product.name])),
    [products],
  );

  const loadData = async () => {
    try {
      setIsLoading(true);
      setLoadError("");
      const [bannerResponse, productResponse] = await Promise.all([
        fetch(`${apiBaseUrl}/banners/admin/all`, { headers: { ...buildAuthHeaders() } }),
        fetch(`${apiBaseUrl}/products`),
      ]);
      const [bannerList, productList] = await Promise.all([
        bannerResponse.json().catch(() => ({})),
        productResponse.json().catch(() => ({})),
      ]);

      if (!bannerResponse.ok) {
        throw new Error(bannerList.message || "배너 목록을 불러오지 못했습니다.");
      }
      if (!productResponse.ok) {
        throw new Error(productList.message || "상품 목록을 불러오지 못했습니다.");
      }

      setBanners(Array.isArray(bannerList) ? bannerList : []);
      setProducts(Array.isArray(productList) ? productList : []);
    } catch (error) {
      setLoadError(error.message || "배너 관리 정보를 불러오지 못했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void Promise.resolve().then(loadData);
  }, []);

  const handleLogout = () => {
    clearAuthSession();
    setIsProfileMenuOpen(false);
    navigate("/", { replace: true });
  };

  const openCreateEditor = () => {
    const nextOrder = Math.max(0, ...banners.map((banner) => Number(banner.displayOrder || 0))) + 1;
    setDraft(createEmptyDraft(nextOrder));
    setIsEditorOpen(true);
  };

  const openEditEditor = (banner) => {
    setDraft({
      id: banner.id,
      imageUrl: banner.imageUrl || "",
      eyebrow: banner.eyebrow || "",
      title: banner.title || "",
      description: banner.description || "",
      buttonLabel: banner.buttonLabel || "구매하기",
      linkedProductId: banner.linkedProductId || "",
      displayOrder: banner.displayOrder || 1,
      isVisible: Boolean(banner.isVisible),
    });
    setIsEditorOpen(true);
  };

  const updateDraft = (field, value) => {
    setDraft((currentDraft) => ({ ...currentDraft, [field]: value }));
  };

  const openCloudinaryWidget = () => {
    if (!cloudinaryCloudName || !cloudinaryUploadPreset) {
      window.alert("Cloudinary cloud name과 unsigned upload preset을 설정해주세요.");
      return;
    }
    if (!window.cloudinary) {
      window.alert("이미지 업로드 기능을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.");
      return;
    }

    const widget = window.cloudinary.createUploadWidget(
      {
        cloudName: cloudinaryCloudName,
        uploadPreset: cloudinaryUploadPreset,
        sources: ["local", "url", "camera"],
        multiple: false,
        resourceType: "image",
        clientAllowedFormats: ["png", "jpg", "jpeg", "webp"],
        showAdvancedOptions: false,
      },
      (error, result) => {
        if (!error && result?.event === "success" && result.info?.secure_url) {
          updateDraft("imageUrl", result.info.secure_url);
        }
      },
    );

    widget.open();
  };

  const saveBanner = async (event) => {
    event.preventDefault();

    const payload = {
      imageUrl: draft.imageUrl,
      eyebrow: draft.eyebrow,
      title: draft.title,
      description: draft.description,
      buttonLabel: draft.buttonLabel || "구매하기",
      linkedProductId: draft.linkedProductId,
      displayOrder: Number(draft.displayOrder),
      isVisible: draft.isVisible,
    };

    try {
      setIsSaving(true);
      const response = await fetch(
        draft.id ? `${apiBaseUrl}/banners/${draft.id}` : `${apiBaseUrl}/banners`,
        {
          method: draft.id ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json", ...buildAuthHeaders() },
          body: JSON.stringify(payload),
        },
      );
      const savedBanner = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(savedBanner.message || "배너 저장에 실패했습니다.");
      }

      setBanners((currentBanners) => {
        const nextBanners = draft.id
          ? currentBanners.map((banner) => (banner.id === savedBanner.id ? savedBanner : banner))
          : [...currentBanners, savedBanner];
        return nextBanners.sort((first, second) => first.displayOrder - second.displayOrder);
      });
      setIsEditorOpen(false);
      setDraft(createEmptyDraft());
    } catch (error) {
      window.alert(error.message || "배너 저장에 실패했습니다.");
    } finally {
      setIsSaving(false);
    }
  };

  const deleteBanner = async (banner) => {
    if (!window.confirm(`'${banner.title}' 배너를 삭제할까요?`)) return;

    try {
      const response = await fetch(`${apiBaseUrl}/banners/${banner.id}`, {
        method: "DELETE",
        headers: { ...buildAuthHeaders() },
      });
      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        throw new Error(result.message || "배너를 삭제하지 못했습니다.");
      }
      setBanners((currentBanners) => currentBanners.filter((item) => item.id !== banner.id));
    } catch (error) {
      window.alert(error.message || "배너를 삭제하지 못했습니다.");
    }
  };

  return (
    <div className="admin-page">
      <aside className="admin-sidebar" aria-label="admin navigation">
        <div className="admin-brand"><strong>STRIDE ADMIN</strong><span>관리자 모드</span></div>
        <nav className="admin-nav">
          <Link className="admin-nav-link" to="/admin"><Home size={20} strokeWidth={1.9} /><span>HOME</span></Link>
          <Link className="admin-nav-link" to="/admin/members"><Users size={20} strokeWidth={1.9} /><span>회원관리</span></Link>
          <Link className="admin-nav-link" to="/admin/products"><Package size={20} strokeWidth={1.9} /><span>상품관리</span></Link>
          <div className="admin-nav-product-group">
            <button className="admin-nav-link is-active" type="button" aria-expanded={isContentMenuOpen} onClick={() => setIsContentMenuOpen((isOpen) => !isOpen)}>
              <PanelsTopLeft size={20} strokeWidth={1.9} /><span>콘텐츠 관리</span><ChevronDown className="admin-nav-expand-icon" size={16} strokeWidth={2} />
            </button>
            {isContentMenuOpen && <div className="admin-nav-submenu"><Link className="is-active" to="/admin/banners">메인 배너 관리</Link></div>}
          </div>
          <Link className="admin-nav-link" to="/admin/orders"><ClipboardList size={20} strokeWidth={1.9} /><span>주문관리</span></Link>
        </nav>
      </aside>

      <div className="admin-shell">
        <header className="admin-topbar">
          <h1>메인 배너 관리</h1>
          <div className="admin-topbar-actions">
            <button className="admin-icon-button" type="button" aria-label="알림"><Bell size={24} strokeWidth={1.8} /></button>
            <div className="admin-profile-menu-wrap" onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setIsProfileMenuOpen(false); }}>
              <button className="admin-profile-button" type="button" aria-expanded={isProfileMenuOpen} aria-haspopup="menu" onClick={() => setIsProfileMenuOpen((isOpen) => !isOpen)}>
                <span className="admin-profile-avatar">AD</span><span className="admin-profile-label">관리자</span><ChevronDown className="admin-profile-chevron" size={17} strokeWidth={2} />
              </button>
              {isProfileMenuOpen && <div className="admin-profile-menu" role="menu"><Link to="/" role="menuitem">메인페이지</Link><button type="button" role="menuitem" onClick={handleLogout}>로그아웃</button></div>}
            </div>
          </div>
        </header>

        <main className="admin-banner-content">
          <section className="admin-banner-heading">
            <div><p>CONTENT MANAGEMENT</p><h2>메인 배너</h2><span>배너 문구와 연결 상품을 설정하면 구매 버튼이 해당 상품 상세 페이지로 이동합니다.</span></div>
            <button type="button" onClick={openCreateEditor}><Plus size={17} strokeWidth={2.5} /> 새 배너 등록</button>
          </section>

          {isLoading && <p className="admin-banner-message">배너 정보를 불러오는 중입니다.</p>}
          {!isLoading && loadError && <p className="admin-banner-message is-error">{loadError}</p>}
          {!isLoading && !loadError && banners.length === 0 && <div className="admin-banner-empty"><ImagePlus size={30} strokeWidth={1.5} /><strong>등록된 메인 배너가 없습니다.</strong><span>새 배너를 등록해 메인 화면에 노출해보세요.</span></div>}
          {!isLoading && !loadError && banners.length > 0 && (
            <section className="admin-banner-list" aria-label="등록된 메인 배너">
              {banners.map((banner) => (
                <article className="admin-banner-item" key={banner.id}>
                  <div className="admin-banner-thumbnail"><img src={banner.imageUrl} alt="" /></div>
                  <div className="admin-banner-item-copy"><span>노출 순서 {banner.displayOrder} · {banner.isVisible ? "노출 중" : "비노출"}</span><strong>{banner.title}</strong><p>{banner.eyebrow || "상단 문구 없음"} · {banner.description || "설명 없음"}</p><small>연결 상품: {productNameById.get(banner.linkedProductId) || banner.linkedProductId}</small></div>
                  <div className="admin-banner-item-actions"><button type="button" onClick={() => openEditEditor(banner)}><Pencil size={15} /> 수정</button><button type="button" onClick={() => deleteBanner(banner)}><Trash2 size={15} /> 삭제</button></div>
                </article>
              ))}
            </section>
          )}
        </main>
      </div>

      {isEditorOpen && (
        <div className="admin-banner-modal-backdrop" role="presentation" onMouseDown={() => setIsEditorOpen(false)}>
          <form className="admin-banner-editor" onSubmit={saveBanner} onMouseDown={(event) => event.stopPropagation()}>
            <div className="admin-banner-editor-header"><div><p>{draft.id ? "EDIT BANNER" : "NEW BANNER"}</p><h2>{draft.id ? "메인 배너 수정" : "메인 배너 등록"}</h2></div><button type="button" aria-label="닫기" onClick={() => setIsEditorOpen(false)}><X size={20} /></button></div>
            <div className="admin-banner-editor-body">
              <section className="admin-banner-image-section">
                <div className="admin-banner-field-title"><strong>배너 이미지 <b>*</b></strong><span>현재 홈 배너 기준 <em>1857 × 847px</em> 가로형 이미지를 첨부해주세요.</span></div>
                <div className="admin-banner-image-preview">{draft.imageUrl ? <img src={draft.imageUrl} alt="등록할 배너 미리보기" /> : <div><ImagePlus size={31} strokeWidth={1.5} /><span>이미지를 첨부해주세요</span></div>}</div>
                <button className="admin-banner-upload-button" type="button" onClick={openCloudinaryWidget}><ImagePlus size={16} /> 이미지 첨부</button>
                <label className="admin-banner-url-field"><span>또는 이미지 URL</span><input value={draft.imageUrl} placeholder="https://" onChange={(event) => updateDraft("imageUrl", event.target.value)} required /></label>
              </section>
              <section className="admin-banner-form-section">
                <label><span>상단 문구</span><input value={draft.eyebrow} placeholder="예: THE ORIGINAL" maxLength="40" onChange={(event) => updateDraft("eyebrow", event.target.value)} /></label>
                <label><span>배너 제목 <b>*</b></span><input value={draft.title} placeholder="예: STRIDE SUPERSTAR" maxLength="80" required onChange={(event) => updateDraft("title", event.target.value)} /></label>
                <label><span>설명 문구</span><input value={draft.description} placeholder="예: 새로운 클래식 아이콘" maxLength="120" onChange={(event) => updateDraft("description", event.target.value)} /></label>
                <label><span>버튼 문구</span><input value={draft.buttonLabel} placeholder="구매하기" maxLength="20" onChange={(event) => updateDraft("buttonLabel", event.target.value)} /></label>
                <label><span>연결 상품 <b>*</b></span><select value={draft.linkedProductId} required onChange={(event) => updateDraft("linkedProductId", event.target.value)}><option value="" disabled>상품을 선택하세요</option>{products.map((product) => <option key={product.id} value={product.productId}>{product.name} ({product.productId})</option>)}</select><small>구매하기 버튼을 누르면 선택한 상품의 상세 페이지로 이동합니다.</small></label>
                <div className="admin-banner-settings-row"><label><span>노출 순서 <b>*</b></span><input type="number" min="1" value={draft.displayOrder} required onChange={(event) => updateDraft("displayOrder", event.target.value)} /></label><label className="admin-banner-visible-toggle"><input type="checkbox" checked={draft.isVisible} onChange={(event) => updateDraft("isVisible", event.target.checked)} /><span><strong>메인에 노출</strong><small>체크 해제 시 저장되지만 고객 메인에는 표시되지 않습니다.</small></span></label></div>
              </section>
            </div>
            <div className="admin-banner-editor-actions"><button type="button" onClick={() => setIsEditorOpen(false)}>취소</button><button type="submit" disabled={isSaving}>{isSaving ? "저장 중..." : draft.id ? "변경사항 저장" : "배너 등록"}</button></div>
          </form>
        </div>
      )}
    </div>
  );
}

export default AdminBannerManagementPage;
