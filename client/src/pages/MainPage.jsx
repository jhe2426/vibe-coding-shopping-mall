import { useEffect, useState } from "react";
import { ArrowRight, ChevronLeft, ChevronRight, Heart } from "lucide-react";
import NavigationBar from "../components/NavigationBar.jsx";
import strideCampaignBanner from "../assets/home/stride-campaign-banner.png";
import strideCampaignBanner02 from "../assets/home/stride-campaign-banner-02.png";
import strideCampaignBanner03 from "../assets/home/stride-campaign-banner-03.png";
import product01 from "../assets/home-products/product-01.png";
import product02 from "../assets/home-products/product-02.png";
import product03 from "../assets/home-products/product-03.png";
import product04 from "../assets/home-products/product-04.png";
import product05 from "../assets/home-products/product-05.png";
import product06 from "../assets/home-products/product-06.png";
import product07 from "../assets/home-products/product-07.png";
import product08 from "../assets/home-products/product-08.png";
import productHover01 from "../assets/home-products/product-hover-01.png";
import productHover02 from "../assets/home-products/product-hover-02.png";
import productHover03 from "../assets/home-products/product-hover-03.png";
import productHover04 from "../assets/home-products/product-hover-04.png";
import productHover05 from "../assets/home-products/product-hover-05.png";
import productHover06 from "../assets/home-products/product-hover-06.png";
import productHover07 from "../assets/home-products/product-hover-07.png";
import productHover08 from "../assets/home-products/product-hover-08.png";

const products = [
  {
    id: 1,
    image: product01,
    hoverImage: productHover01,
    price: "299,000 원",
    name: "아디제로 아디오스 프로 4",
  },
  {
    id: 2,
    image: product02,
    hoverImage: productHover02,
    price: "109,000 원",
    name: "오즈가이아",
  },
  {
    id: 3,
    image: product03,
    hoverImage: productHover03,
    price: "169,000 원",
    name: "테렉스 프리하이커 SL 고어텍스 하이킹화",
  },
  {
    id: 4,
    image: product04,
    hoverImage: productHover04,
    price: "159,000 원",
    name: "아디스타 XLG 2.0",
  },
  {
    id: 5,
    image: product05,
    hoverImage: productHover05,
    price: "139,000 원",
    name: "슈퍼스타 82",
  },
  {
    id: 6,
    image: product06,
    hoverImage: productHover06,
    price: "129,000 원",
    name: "캠퍼스 00s",
  },
  {
    id: 7,
    image: product07,
    hoverImage: productHover07,
    price: "219,000 원",
    name: "울트라부스트 라이트",
  },
  {
    id: 8,
    image: product08,
    hoverImage: productHover08,
    price: "149,000 원",
    name: "드롭셋 3 트레이너",
  },
];

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

  // 메인 배너는 버튼을 누르지 않아도 일정 시간마다 자동으로 다음 이미지로 이동합니다.
  useEffect(() => {
    const slideTimer = window.setInterval(() => {
      setActiveSlideIndex((currentIndex) => (currentIndex + 1) % heroSlides.length);
    }, 4500);

    return () => {
      window.clearInterval(slideTimer);
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
            {products.map((product) => (
              <article className="product-card" key={product.id}>
                <div className="product-image-wrap">
                  <img className="product-image product-image-default" src={product.image} alt={product.name} />
                  <img
                    className="product-image product-image-hover"
                    src={product.hoverImage}
                    alt=""
                    aria-hidden="true"
                  />
                  <button className="product-like-button" type="button" aria-label={`${product.name} 찜하기`}>
                    <Heart size={22} strokeWidth={2} />
                  </button>
                </div>
                <div className="product-info">
                  <strong>{product.price}</strong>
                  <h2>{product.name}</h2>
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
