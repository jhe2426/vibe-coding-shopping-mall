import { useEffect, useMemo, useState } from "react";
import { ArrowRight, ChevronRight, CircleCheck, Clock3, PackageCheck, Pencil, Truck, UserRound, XCircle } from "lucide-react";
import { Link, Navigate } from "react-router-dom";

import { fetchMyProfile } from "../api/auth.js";
import DeliveryAddressManagerModal from "../components/DeliveryAddressManagerModal.jsx";
import NavigationBar from "../components/NavigationBar.jsx";
import SiteFooter from "../components/SiteFooter.jsx";
import { buildAuthHeaders, getAuthToken } from "../utils/auth-storage.js";

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "/api";
const formatPrice = (price) => `${Number(price || 0).toLocaleString("ko-KR")}원`;
const getProduct = (item) => (item.product && typeof item.product === "object" ? item.product : null);

const formatPhoneNumber = (value) => {
  const numbers = String(value || "").replace(/\D/g, "");

  if (numbers.length !== 11) return value || "-";
  return `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7)}`;
};

const formatDate = (value) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
};

const orderStatus = {
  PAYMENT_PENDING: { label: "결제 확인 중", className: "is-processing", Icon: Clock3 },
  PAID: { label: "처리중", className: "is-processing", Icon: Clock3 },
  PREPARING: { label: "처리중", className: "is-processing", Icon: Clock3 },
  SHIPPED: { label: "배송중", className: "is-shipping", Icon: Truck },
  DELIVERED: { label: "완료", className: "is-completed", Icon: CircleCheck },
  CANCELED: { label: "주문 취소", className: "is-canceled", Icon: XCircle },
};

function MyPage() {
  const [activeSection, setActiveSection] = useState("profile");
  const [profile, setProfile] = useState(null);
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [isAddressManagerOpen, setIsAddressManagerOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadMyPage = async () => {
      try {
        setIsLoading(true);
        setLoadError("");

        const [user, ordersResponse] = await Promise.all([
          fetchMyProfile(),
          fetch(`${apiBaseUrl}/orders`, {
            headers: {
              ...buildAuthHeaders(),
            },
          }),
        ]);
        const ordersData = await ordersResponse.json().catch(() => ({}));

        if (!ordersResponse.ok) {
          throw new Error(ordersData.message || "주문 내역을 불러오지 못했습니다.");
        }

        if (isMounted) {
          setProfile(user);
          setOrders(Array.isArray(ordersData.orders) ? ordersData.orders : []);
        }
      } catch (error) {
        if (isMounted) {
          setLoadError(error.message || "마이페이지 정보를 불러오지 못했습니다.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadMyPage();

    return () => {
      isMounted = false;
    };
  }, []);

  const orderSummary = useMemo(() => ({
    processing: orders.filter((order) => ["PAYMENT_PENDING", "PAID", "PREPARING"].includes(order.status)).length,
    shipping: orders.filter((order) => order.status === "SHIPPED").length,
    completed: orders.filter((order) => order.status === "DELIVERED").length,
  }), [orders]);
  const defaultDeliveryAddress = profile?.deliveryAddresses?.find((address) => address.isDefault);

  if (!getAuthToken()) {
    return <Navigate to="/login" state={{ from: "/mypage" }} replace />;
  }

  return (
    <div className="mypage-page">
      <NavigationBar />

      <main className="mypage-main">
        <header className="mypage-heading">
          <div>
            <p>MY ACCOUNT</p>
            <h1>{profile?.name ? `${profile.name}님, 안녕하세요` : "마이페이지"}</h1>
          </div>
          {profile?.userType === "admin" && <Link className="mypage-admin-link" to="/admin">관리자페이지 <ArrowRight size={16} strokeWidth={2} /></Link>}
        </header>

        {isLoading && <p className="mypage-message">마이페이지 정보를 불러오는 중입니다.</p>}
        {!isLoading && loadError && <p className="mypage-message is-error">{loadError}</p>}

        {!isLoading && !loadError && profile && (
          <div className="mypage-layout">
            <aside className="mypage-nav" aria-label="마이페이지 메뉴">
              <button className={activeSection === "profile" ? "is-active" : ""} type="button" onClick={() => setActiveSection("profile")}>
                <UserRound size={19} strokeWidth={1.9} />
                회원 정보
                <ChevronRight size={17} strokeWidth={2} />
              </button>
              <button className={activeSection === "orders" ? "is-active" : ""} type="button" onClick={() => setActiveSection("orders")}>
                <PackageCheck size={19} strokeWidth={1.9} />
                주문 내역
                <ChevronRight size={17} strokeWidth={2} />
              </button>
            </aside>

            <section className="mypage-content">
              {activeSection === "profile" ? (
                <>
                  <div className="mypage-section-heading">
                    <div><h2>회원 정보</h2><p>가입한 계정 정보를 확인할 수 있습니다.</p></div>
                  </div>
                  <dl className="mypage-profile-list">
                    <div><dt>이름</dt><dd>{profile.name}</dd></div>
                    <div><dt>이메일</dt><dd>{profile.userId}</dd></div>
                    <div><dt>휴대전화</dt><dd>{formatPhoneNumber(profile.phoneNumber)}</dd></div>
                    <div><dt>가입일</dt><dd>{formatDate(profile.createdAt)}</dd></div>
                  </dl>

                  <section className="mypage-delivery-summary">
                    <div className="mypage-section-heading">
                      <div><h2>기본 배송지</h2><p>배송지를 수정하거나 기본 배송지를 변경할 수 있습니다.</p></div>
                      <button className="mypage-delivery-manage-button" type="button" onClick={() => setIsAddressManagerOpen(true)}>
                        <Pencil size={15} strokeWidth={2} />
                        배송지 관리
                      </button>
                    </div>
                    {defaultDeliveryAddress ? (
                      <div className="mypage-delivery-address">
                        <strong>{defaultDeliveryAddress.label}</strong>
                        <span>{defaultDeliveryAddress.recipientName} · {formatPhoneNumber(defaultDeliveryAddress.phoneNumber)}</span>
                        <p>({defaultDeliveryAddress.postalCode}) {defaultDeliveryAddress.address} {defaultDeliveryAddress.addressDetail}</p>
                      </div>
                    ) : (
                      <p className="mypage-empty-line">등록된 기본 배송지가 없습니다.</p>
                    )}
                  </section>
                </>
              ) : (
                <>
                  <div className="mypage-section-heading mypage-order-heading">
                    <div><h2>주문 내역</h2><p>최근 주문의 진행 상태를 확인할 수 있습니다.</p></div>
                    <Link to="/orders">전체 보기 <ArrowRight size={16} strokeWidth={2} /></Link>
                  </div>

                  <div className="mypage-order-summary" aria-label="주문 상태 요약">
                    <div><span>처리중</span><strong>{orderSummary.processing}</strong></div>
                    <div><span>배송중</span><strong>{orderSummary.shipping}</strong></div>
                    <div><span>완료</span><strong>{orderSummary.completed}</strong></div>
                  </div>

                  {orders.length === 0 ? (
                    <div className="mypage-orders-empty"><PackageCheck size={30} strokeWidth={1.7} /><p>아직 주문 내역이 없습니다.</p><Link to="/">상품 둘러보기</Link></div>
                  ) : (
                    <div className="mypage-recent-orders">
                      {orders.slice(0, 3).map((order) => {
                        const statusInfo = orderStatus[order.status] || orderStatus.PAID;
                        const StatusIcon = statusInfo.Icon;
                        const firstItem = order.items?.[0];
                        const firstProduct = getProduct(firstItem);

                        return (
                          <Link className="mypage-order-row" to="/orders" key={order.id || order._id || order.orderNumber}>
                            <img src={firstProduct?.cardImages?.defaultImage || firstItem?.imageUrl} alt={firstProduct?.name || firstItem?.productName || "상품 이미지"} />
                            <div>
                              <strong>{firstProduct?.name || firstItem?.productName || order.orderNumber}</strong>
                              <span>{order.items?.length > 1 ? `${order.items.length}개 상품` : `사이즈 ${firstItem?.size || "-"}`}</span>
                              <small>{formatDate(order.createdAt)} · {order.orderNumber}</small>
                            </div>
                            <div className="mypage-order-row-status">
                              <span className={statusInfo.className}><StatusIcon size={15} strokeWidth={2} />{statusInfo.label}</span>
                              <b>{formatPrice(order.totalAmount)}</b>
                            </div>
                            <ChevronRight size={18} strokeWidth={2} />
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </>
              )}
            </section>
          </div>
        )}
      </main>

      <DeliveryAddressManagerModal
        isOpen={isAddressManagerOpen}
        onClose={() => setIsAddressManagerOpen(false)}
        onAddressesChange={(deliveryAddresses) => {
          setProfile((currentProfile) => currentProfile ? { ...currentProfile, deliveryAddresses } : currentProfile);
        }}
      />

      <SiteFooter />
    </div>
  );
}

export default MyPage;
