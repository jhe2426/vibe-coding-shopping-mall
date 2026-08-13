import { useEffect, useState } from "react";
import { ArrowRight, ChevronLeft, ChevronRight, Heart } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { fetchProductLikes, getProductLikeKey, updateProductLikeStatus } from "../api/product-likes.js";
import NavigationBar from "../components/NavigationBar.jsx";
import SiteFooter from "../components/SiteFooter.jsx";
import { getAuthToken } from "../utils/auth-storage.js";
import strideCampaignBanner from "../assets/home/stride-campaign-banner.png";
import strideCampaignBanner02 from "../assets/home/stride-campaign-banner-02.png";
import strideCampaignBanner03 from "../assets/home/stride-campaign-banner-03.png";

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "/api";
const PRODUCTS_PER_PAGE = 12;
const RECOMMENDED_PRODUCT_LIMIT = 8;
const formatPrice = (price) => `${Number(price || 0).toLocaleString("ko-KR")} 원`;
const getProductPathId = (product) => product.productId || product.id;
const getDiscountRate = (product) => {
  const regularPrice = Number(product.regularPrice);
  const salePrice = Number(product.salePrice);

  if (!Number.isFinite(regularPrice) || regularPrice <= 0 || !Number.isFinite(salePrice) || salePrice >= regularPrice) {
    return null;
  }

  return Math.round((1 - (salePrice / regularPrice)) * 100);
};

const catalogFilters = {
  men: { title: "MEN", targetGender: "MEN" },
  women: { title: "WOMEN", targetGender: "WOMEN" },
  running: { title: "RUNNING", category: "SPORTS" },
  sale: { title: "SALE", isSaleOnly: true },
};

const defaultHeroSlides = [
  {
    id: 1,
    image: strideCampaignBanner,
    eyebrow: "THE ORIGINAL",
    title: "STRIDE SUPERSTAR",
    description: "새로운 클래식 아이콘",
  },
  {
    id: 2,
    image: strideCampaignBanner02,
    eyebrow: "RUN READY",
    title: "EVERYDAY RUN",
    description: "가볍게 시작하는 데일리 러닝",
  },
  {
    id: 3,
    image: strideCampaignBanner03,
    eyebrow: "STREET COURT",
    title: "MOVE YOUR WAY",
    description: "도시 위에서 완성되는 스타일",
  },
];

function MainPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const activeCatalog = catalogFilters[searchParams.get("catalog")] || null;
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const [heroSlides, setHeroSlides] = useState(defaultHeroSlides);
  const [products, setProducts] = useState([]);
  const [visibleProductCount, setVisibleProductCount] = useState(RECOMMENDED_PRODUCT_LIMIT);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [productLoadError, setProductLoadError] = useState("");
  const [likedProductIds, setLikedProductIds] = useState(() => new Set());
  const [pendingLikeProductId, setPendingLikeProductId] = useState(null);
  const [likeActionError, setLikeActionError] = useState("");

  useEffect(() => {
    let isMounted = true;

    const loadBanners = async () => {
      try {
        const response = await fetch(`${apiBaseUrl}/banners`);
        const bannerList = await response.json().catch(() => []);

        // 아직 관리자로 등록한 배너가 없을 때에는 기존 캠페인 배너를 유지합니다.
        if (response.ok && Array.isArray(bannerList) && bannerList.length > 0 && isMounted) {
          setHeroSlides(bannerList);
          setActiveSlideIndex(0);
        }
      } catch {
        // 배너 API를 사용할 수 없는 동안에도 기존 홈 화면은 그대로 노출합니다.
      }
    };

    loadBanners();

    return () => {
      isMounted = false;
    };
  }, []);

  // 메인 배너는 버튼을 누르지 않아도 일정 시간마다 자동으로 다음 이미지로 이동합니다.
  useEffect(() => {
    const slideTimer = window.setInterval(() => {
      setActiveSlideIndex((currentIndex) => (currentIndex + 1) % heroSlides.length);
    }, 4500);

    return () => {
      window.clearInterval(slideTimer);
    };
  }, [heroSlides.length]);

  useEffect(() => {
    let isMounted = true;

    const loadProducts = async () => {
      try {
        setIsLoadingProducts(true);
        setProductLoadError("");

        const productSearchParams = new URLSearchParams({ status: "SELLING" });

        if (!activeCatalog) productSearchParams.set("isRecommended", "true");
        if (activeCatalog?.targetGender) productSearchParams.set("targetGender", activeCatalog.targetGender);
        if (activeCatalog?.category) productSearchParams.set("category", activeCatalog.category);

        const response = await fetch(`${apiBaseUrl}/products?${productSearchParams.toString()}`);
        const productList = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(productList.message || "상품 목록을 불러오지 못했습니다.");
        }

        if (isMounted) {
          // 관리자 화면과 달리 메인에는 판매 중인 상품만 노출한다.
          const sellingProducts =
            Array.isArray(productList)
              ? productList.filter((product) => product.status === "SELLING")
              : [];
          const filteredProducts = activeCatalog?.isSaleOnly
            ? sellingProducts.filter(
              (product) => product.salePrice !== null
                && product.salePrice !== undefined
                && Number(product.salePrice) < Number(product.regularPrice),
            )
            : sellingProducts;

          setProducts(filteredProducts);
          setVisibleProductCount(activeCatalog ? PRODUCTS_PER_PAGE : RECOMMENDED_PRODUCT_LIMIT);
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
  }, [activeCatalog]);

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

  const moveHeroSlide = (direction) => {
    setActiveSlideIndex((currentIndex) => {
      const nextIndex = currentIndex + direction;

      if (nextIndex < 0) {
        return heroSlides.length - 1;
      }

      return nextIndex % heroSlides.length;
    });
  };

  const toggleProductLike = async (product) => {
    const productId = getProductLikeKey(product);

    if (!productId) return;

    if (!getAuthToken()) {
      navigate("/login", { state: { from: "/" } });
      return;
    }

    const isLiked = likedProductIds.has(productId);

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
    <div className="home-page">
      {/* 메인 페이지 공통 헤더 */}
      <NavigationBar />

      <main className="home-main">
        {!activeCatalog && <section className="home-hero-banner" aria-label="STRIDE campaign banner">
          {heroSlides.map((slide, index) => (
            <div className={`hero-slide ${index === activeSlideIndex ? "is-active" : ""}`} key={slide.id}>
              <img src={slide.imageUrl || slide.image} alt={`${slide.title} 캠페인 배너`} />
              <div className="home-hero-copy">
                <p>{slide.eyebrow}</p>
                <h1>{slide.title}</h1>
                <span>{slide.description}</span>
                <button
                  type="button"
                  onClick={() => {
                    if (slide.linkedProductId) navigate(`/products/${slide.linkedProductId}`);
                  }}
                >
                  {slide.buttonLabel || "구매하기"}
                  <ArrowRight size={18} strokeWidth={2} />
                </button>
              </div>
            </div>
          ))}

          <button
            className="hero-arrow-button hero-arrow-button-left"
            type="button"
            aria-label="이전 배너 보기"
            onClick={() => moveHeroSlide(-1)}
          >
            <ChevronLeft size={30} strokeWidth={1.8} />
          </button>
          <button
            className="hero-arrow-button hero-arrow-button-right"
            type="button"
            aria-label="다음 배너 보기"
            onClick={() => moveHeroSlide(1)}
          >
            <ChevronRight size={30} strokeWidth={1.8} />
          </button>
        </section>}

        <section className="home-products" aria-labelledby="home-products-title">
          <div className="home-products-heading">
            <h1 id="home-products-title">{activeCatalog ? `${activeCatalog.title} 상품` : "추천 상품"}</h1>
          </div>

          <div className="product-grid">
            {isLoadingProducts && <p className="home-products-message">상품을 불러오는 중입니다.</p>}
            {!isLoadingProducts && productLoadError && <p className="home-products-message is-error">{productLoadError}</p>}
            {!isLoadingProducts && !productLoadError && likeActionError && <p className="home-products-message is-error">{likeActionError}</p>}
            {!isLoadingProducts && !productLoadError && products.length === 0 && <p className="home-products-message">등록된 상품이 없습니다.</p>}
            {!isLoadingProducts && !productLoadError && products.slice(0, visibleProductCount).map((product) => {
              const productId = getProductLikeKey(product);
              const isLiked = likedProductIds.has(productId);
              const discountRate = activeCatalog?.isSaleOnly ? getDiscountRate(product) : null;

              return (
                <article className="product-card" key={product.id}>
                  <Link className="product-card-image-link" to={`/products/${getProductPathId(product)}`}>
                    <div className="product-image-wrap">
                      <img className="product-image product-image-default" src={product.cardImages.defaultImage} alt={product.name} />
                      <img
                        className="product-image product-image-hover"
                        src={product.cardImages.hoverImage}
                        alt=""
                        aria-hidden="true"
                      />
                    </div>
                  </Link>
                  <div className="product-info">
                    <Link className="product-copy product-copy-link" to={`/products/${getProductPathId(product)}`}>
                      <strong className="product-price">
                        {discountRate !== null && <em>{discountRate}%</em>}
                        {formatPrice(product.salePrice ?? product.regularPrice)}
                      </strong>
                      <h2>{product.name}</h2>
                    </Link>
                    <button
                      className={`product-like-button ${isLiked ? "is-liked" : ""}`}
                      type="button"
                      aria-label={`${product.name} ${isLiked ? "찜 해제" : "찜하기"}`}
                      aria-pressed={isLiked}
                      disabled={pendingLikeProductId === productId}
                      onClick={() => toggleProductLike(product)}
                    >
                      <Heart size={22} strokeWidth={2} />
                    </button>
                  </div>
                </article>
              );
            })}
          </div>

          {activeCatalog && !isLoadingProducts && !productLoadError && products.length > visibleProductCount && (
            <button
              className="more-products-button"
              type="button"
              onClick={() => setVisibleProductCount((count) => count + PRODUCTS_PER_PAGE)}
            >
              더보기
            </button>
          )}
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}

export default MainPage;
