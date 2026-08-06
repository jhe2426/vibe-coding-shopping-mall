import { useEffect, useState } from "react";
import { ArrowRight, ChevronLeft, ChevronRight, Heart } from "lucide-react";
import NavigationBar from "../components/NavigationBar.jsx";
import strideCampaignBanner from "../assets/home/stride-campaign-banner.png";
import strideCampaignBanner02 from "../assets/home/stride-campaign-banner-02.png";
import strideCampaignBanner03 from "../assets/home/stride-campaign-banner-03.png";

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "/api";
const formatPrice = (price) => `${Number(price || 0).toLocaleString("ko-KR")} 원`;

const heroSlides = [
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
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const [products, setProducts] = useState([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [productLoadError, setProductLoadError] = useState("");

  // 메인 배너는 버튼을 누르지 않아도 일정 시간마다 자동으로 다음 이미지로 이동합니다.
  useEffect(() => {
    const slideTimer = window.setInterval(() => {
      setActiveSlideIndex((currentIndex) => (currentIndex + 1) % heroSlides.length);
    }, 4500);

    return () => {
      window.clearInterval(slideTimer);
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadProducts = async () => {
      try {
        setIsLoadingProducts(true);
        setProductLoadError("");

        const response = await fetch(`${apiBaseUrl}/products`);
        const productList = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(productList.message || "상품 목록을 불러오지 못했습니다.");
        }

        if (isMounted) {
          setProducts(Array.isArray(productList) ? productList : []);
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

  return (
    <div className="home-page">
      {/* 메인 페이지 공통 헤더 */}
      <NavigationBar />

      <main className="home-main">
        <section className="home-hero-banner" aria-label="STRIDE campaign banner">
          {heroSlides.map((slide, index) => (
            <div className={`hero-slide ${index === activeSlideIndex ? "is-active" : ""}`} key={slide.id}>
              <img src={slide.image} alt={`${slide.title} 캠페인 배너`} />
              <div className="home-hero-copy">
                <p>{slide.eyebrow}</p>
                <h1>{slide.title}</h1>
                <span>{slide.description}</span>
                <button type="button">
                  구매하기
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
        </section>

        <section className="home-products" aria-labelledby="home-products-title">
          <div className="home-products-heading">
            <h1 id="home-products-title">추천 상품</h1>
          </div>

          <div className="product-grid">
            {isLoadingProducts && <p className="home-products-message">상품을 불러오는 중입니다.</p>}
            {!isLoadingProducts && productLoadError && <p className="home-products-message is-error">{productLoadError}</p>}
            {!isLoadingProducts && !productLoadError && products.length === 0 && <p className="home-products-message">등록된 상품이 없습니다.</p>}
            {!isLoadingProducts && !productLoadError && products.map((product) => (
              <article className="product-card" key={product.id}>
                <div className="product-image-wrap">
                  <img className="product-image product-image-default" src={product.cardImages.defaultImage} alt={product.name} />
                  <img
                    className="product-image product-image-hover"
                    src={product.cardImages.hoverImage}
                    alt=""
                    aria-hidden="true"
                  />
                </div>
                <div className="product-info">
                  <div className="product-copy">
                    <strong>{formatPrice(product.salePrice ?? product.regularPrice)}</strong>
                    <h2>{product.name}</h2>
                  </div>
                  <button className="product-like-button" type="button" aria-label={`${product.name} 찜하기`}>
                    <Heart size={22} strokeWidth={2} />
                  </button>
                </div>
              </article>
            ))}
          </div>

          <button className="more-products-button" type="button">
            더보기
          </button>
        </section>
      </main>

      <footer className="home-footer">© 2026 STRIDE. All rights reserved.</footer>
    </div>
  );
}

export default MainPage;
