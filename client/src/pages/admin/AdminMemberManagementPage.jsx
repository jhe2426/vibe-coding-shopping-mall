import { useEffect, useMemo, useState } from "react";
import {
  Bell,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Home,
  Package,
  Search,
  Users,
} from "lucide-react";
import { Link, Navigate, useNavigate } from "react-router-dom";

import { fetchMyProfile } from "../../api/auth.js";
import { buildAuthHeaders, clearAuthSession, getAuthToken } from "../../utils/auth-storage.js";

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "/api";
const numberFormatter = new Intl.NumberFormat("ko-KR");
const dateFormatter = new Intl.DateTimeFormat("ko-KR", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
const searchOptions = [
  { value: "name", label: "이름" },
  { value: "email", label: "이메일" },
  { value: "phoneNumber", label: "연락처" },
];

const formatDate = (value) => {
  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? "-" : dateFormatter.format(date);
};

const formatPhoneNumber = (value) => {
  const phoneNumber = String(value || "").replace(/\D/g, "");

  if (phoneNumber.length !== 11) return value || "-";
  return `${phoneNumber.slice(0, 3)}-${phoneNumber.slice(3, 7)}-${phoneNumber.slice(7)}`;
};

const getPageNumbers = (currentPage, totalPages) => {
  const startPage = Math.max(1, Math.min(currentPage - 2, totalPages - 4));
  const endPage = Math.min(totalPages, startPage + 4);

  return Array.from({ length: endPage - startPage + 1 }, (_value, index) => startPage + index);
};

function AdminMemberManagementPage() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [isProfileLoading, setIsProfileLoading] = useState(() => Boolean(getAuthToken()));
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isProductMenuOpen, setIsProductMenuOpen] = useState(false);
  const [searchType, setSearchType] = useState("name");
  const [keywordInput, setKeywordInput] = useState("");
  const [keyword, setKeyword] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [memberData, setMemberData] = useState(null);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let isMounted = true;

    const loadProfile = async () => {
      try {
        const user = await fetchMyProfile();

        if (isMounted) setProfile(user);
      } catch {
        if (isMounted) setProfile(null);
      } finally {
        if (isMounted) setIsProfileLoading(false);
      }
    };

    if (getAuthToken()) loadProfile();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (profile?.userType !== "admin") return undefined;

    let isMounted = true;

    const loadMembers = async () => {
      try {
        setIsLoadingMembers(true);
        setLoadError("");

        const params = new URLSearchParams({
          searchType,
          page: String(currentPage),
          limit: "10",
        });

        if (keyword) params.set("keyword", keyword);

        const response = await fetch(`${apiBaseUrl}/admin/members?${params.toString()}`, {
          headers: {
            ...buildAuthHeaders(),
          },
        });
        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(data.message || "회원 정보를 불러오지 못했습니다.");
        }

        if (isMounted) setMemberData(data);
      } catch (error) {
        if (isMounted) setLoadError(error.message || "회원 정보를 불러오지 못했습니다.");
      } finally {
        if (isMounted) setIsLoadingMembers(false);
      }
    };

    loadMembers();

    return () => {
      isMounted = false;
    };
  }, [currentPage, keyword, profile, searchType]);

  const handleLogout = () => {
    clearAuthSession();
    setIsProfileMenuOpen(false);
    navigate("/", { replace: true });
  };

  const handleSearch = (event) => {
    event.preventDefault();
    setCurrentPage(1);
    setKeyword(keywordInput.trim());
  };

  const handleSearchTypeChange = (event) => {
    setSearchType(event.target.value);
    setCurrentPage(1);
  };

  const resetSearch = () => {
    setSearchType("name");
    setKeywordInput("");
    setKeyword("");
    setCurrentPage(1);
  };

  const pagination = memberData?.pagination || {
    page: 1,
    totalCount: 0,
    totalPages: 1,
  };
  const pageNumbers = useMemo(
    () => getPageNumbers(pagination.page, pagination.totalPages),
    [pagination.page, pagination.totalPages],
  );
  const selectedSearchOption = searchOptions.find((option) => option.value === searchType);
  const profileName = profile?.name || "관리자";
  const profileAvatar = profileName.slice(0, 2).toUpperCase();

  if (!getAuthToken()) {
    return <Navigate to="/login" state={{ from: "/admin/members" }} replace />;
  }

  if (!isProfileLoading && (!profile || profile.userType !== "admin")) {
    return <Navigate to="/" replace />;
  }

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
          <Link className="admin-nav-link is-active" to="/admin/members">
            <Users size={20} strokeWidth={1.9} />
            <span>회원관리</span>
          </Link>
          <div className="admin-nav-product-group">
            <button
              className="admin-nav-link"
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

      <div className="admin-shell">
        <header className="admin-topbar">
          <h1>회원 관리</h1>
          <div className="admin-topbar-actions">
            <button className="admin-icon-button" type="button" aria-label="알림">
              <Bell size={24} strokeWidth={1.8} />
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
                <span className="admin-profile-avatar">{profileAvatar}</span>
                <span className="admin-profile-label">{profileName}</span>
                <ChevronDown className="admin-profile-chevron" size={17} strokeWidth={2} />
              </button>
              {isProfileMenuOpen && (
                <div className="admin-profile-menu" role="menu">
                  <Link to="/mypage" role="menuitem" onClick={() => setIsProfileMenuOpen(false)}>마이페이지</Link>
                  <Link to="/" role="menuitem" onClick={() => setIsProfileMenuOpen(false)}>메인페이지</Link>
                  <button type="button" role="menuitem" onClick={handleLogout}>로그아웃</button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="admin-content admin-member-management-content">
          {isProfileLoading && <p className="admin-dashboard-message">관리자 정보를 확인하는 중입니다.</p>}

          {!isProfileLoading && profile?.userType === "admin" && (
            <>
              <section className="admin-member-summary" aria-label="회원 현황">
                <article className="admin-member-summary-card">
                  <div className="admin-member-summary-icon blue"><Users size={29} strokeWidth={1.8} /></div>
                  <div><p>전체 회원</p><strong>{numberFormatter.format(memberData?.summary?.totalMemberCount || 0)}명</strong></div>
                </article>
                <article className="admin-member-summary-card">
                  <div className="admin-member-summary-icon green"><CalendarDays size={28} strokeWidth={1.8} /></div>
                  <div><p>이번 달 신규 가입</p><strong>{numberFormatter.format(memberData?.summary?.monthlyNewMemberCount || 0)}명</strong></div>
                </article>
              </section>

              <section className="admin-member-filter-panel" aria-label="회원 검색">
                <form onSubmit={handleSearch}>
                  <label className="admin-member-search-type">
                    <span>검색 기준</span>
                    <select value={searchType} onChange={handleSearchTypeChange}>
                      {searchOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                    </select>
                    <ChevronDown size={16} strokeWidth={2} />
                  </label>
                  <label className="admin-member-search-input">
                    <span className="sr-only">회원 검색어</span>
                    <input
                      type="search"
                      value={keywordInput}
                      placeholder={`${selectedSearchOption?.label || "회원 정보"}을 입력해주세요.`}
                      onChange={(event) => setKeywordInput(event.target.value)}
                    />
                  </label>
                  <div className="admin-member-search-actions">
                    <button className="is-search" type="submit"><Search size={17} strokeWidth={2} />검색</button>
                    <button className="is-reset" type="button" onClick={resetSearch}>초기화</button>
                  </div>
                </form>
              </section>

              <section className="admin-member-list-panel" aria-label="회원 목록">
                <div className="admin-member-list-heading">
                  <h2>회원 목록</h2>
                  <span>총 {numberFormatter.format(pagination.totalCount)}명</span>
                </div>
                <div className="admin-member-table-wrap">
                  <table className="admin-member-table">
                    <thead>
                      <tr><th>회원 정보</th><th>휴대전화</th><th>가입일</th><th>주문 수</th><th>저장 배송지</th></tr>
                    </thead>
                    <tbody>
                      {isLoadingMembers ? (
                        <tr><td className="admin-member-empty" colSpan="5">회원 정보를 불러오는 중입니다.</td></tr>
                      ) : loadError ? (
                        <tr><td className="admin-member-empty is-error" colSpan="5">{loadError}</td></tr>
                      ) : memberData?.members?.length === 0 ? (
                        <tr><td className="admin-member-empty" colSpan="5">검색 결과가 없습니다.</td></tr>
                      ) : memberData?.members?.map((member) => (
                        <tr key={member.id}>
                          <td>
                            <div className="admin-member-identity"><strong>{member.name}</strong><span>{member.email}</span></div>
                          </td>
                          <td>{formatPhoneNumber(member.phoneNumber)}</td>
                          <td>{formatDate(member.createdAt)}</td>
                          <td>{numberFormatter.format(member.orderCount)}건</td>
                          <td>{numberFormatter.format(member.deliveryAddressCount)}개</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {!isLoadingMembers && !loadError && pagination.totalCount > 0 && (
                  <nav className="admin-member-pagination" aria-label="회원 목록 페이지">
                    <button type="button" disabled={pagination.page <= 1} onClick={() => setCurrentPage(pagination.page - 1)} aria-label="이전 페이지">
                      <ChevronLeft size={17} strokeWidth={2} />
                    </button>
                    {pageNumbers.map((page) => (
                      <button className={page === pagination.page ? "is-current" : ""} type="button" key={page} onClick={() => setCurrentPage(page)}>{page}</button>
                    ))}
                    <button type="button" disabled={pagination.page >= pagination.totalPages} onClick={() => setCurrentPage(pagination.page + 1)} aria-label="다음 페이지">
                      <ChevronRight size={17} strokeWidth={2} />
                    </button>
                  </nav>
                )}
              </section>
            </>
          )}
        </main>
      </div>
    </div>
  );
}

export default AdminMemberManagementPage;
