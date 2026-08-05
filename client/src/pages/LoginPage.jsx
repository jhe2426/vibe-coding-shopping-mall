import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { BadgePercent, Eye, EyeOff, RotateCcw, Truck } from "lucide-react";

import heroShoes from "../assets/signup-shoes.png";
import SiteHeader from "../components/SiteHeader.jsx";
import { getAuthToken, saveAuthSession } from "../utils/auth-storage.js";

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "/api";
const requiredFields = {
  email: "이메일을 입력해주세요",
  password: "비밀번호를 입력해주세요",
};
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const parseJsonResponse = async (response) => {
  try {
    return await response.json();
  } catch {
    return {};
  }
};

const validateEmail = (value) => {
  const email = value.trim();

  if (!email) {
    return requiredFields.email;
  }

  if (!emailPattern.test(email)) {
    return "유효하지 않은 이메일입니다";
  }

  return "";
};

function LoginPage() {
  const navigate = useNavigate();
  const hasAuthToken = Boolean(getAuthToken());
  const [errors, setErrors] = useState({});
  const [passwordValue, setPasswordValue] = useState("");
  const [formStatus, setFormStatus] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (hasAuthToken) {
    return <Navigate to="/" replace />;
  }

  // 로그인 클릭 시 이메일과 비밀번호를 서버로 보내고, 성공하면 토큰을 저장한 뒤 메인으로 이동합니다.
  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormStatus("");

    const loginForm = event.currentTarget;
    const formData = new FormData(loginForm);
    const email = formData.get("email")?.toString().trim() || "";
    const password = formData.get("password")?.toString() || "";
    const nextErrors = {};
    const emailError = validateEmail(email);

    if (emailError) {
      nextErrors.email = emailError;
    }

    if (!password) {
      nextErrors.password = requiredFields.password;
    }

    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`${apiBaseUrl}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });
      const data = await parseJsonResponse(response);

      if (!response.ok) {
        setFormStatus(data.message || "로그인에 실패했습니다.");
        return;
      }

      const token = data.accessToken || data.token;

      if (!token) {
        setFormStatus("로그인 토큰을 발급받지 못했습니다.");
        return;
      }

      saveAuthSession({
        token,
      });
      loginForm.reset();
      setPasswordValue("");
      navigate("/", { replace: true });
    } catch {
      setFormStatus("서버와 연결할 수 없습니다. 서버가 실행 중인지 확인해주세요.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // 사용자가 값을 다시 입력하면 해당 인풋 에러와 로그인 실패 메시지를 정리합니다.
  const clearFieldError = (fieldName) => {
    setFormStatus("");
    setErrors((currentErrors) => {
      if (!currentErrors[fieldName]) {
        return currentErrors;
      }

      const nextErrors = { ...currentErrors };
      delete nextErrors[fieldName];
      return nextErrors;
    });
  };

  // 이메일은 입력 중에도 바로 형식 검사를 진행합니다.
  const handleEmailChange = (value) => {
    const message = validateEmail(value);

    setFormStatus("");
    setErrors((currentErrors) => {
      const nextErrors = { ...currentErrors };

      if (message) {
        nextErrors.email = message;
      } else {
        delete nextErrors.email;
      }

      return nextErrors;
    });
  };

  // 비밀번호 입력값을 관리하고, 입력 시 비밀번호 에러만 제거합니다.
  const handlePasswordChange = (value) => {
    setPasswordValue(value);
    clearFieldError("password");
  };

  return (
    <div className="signup-page login-page">
      {/* 쇼핑몰 공통 상단 네비게이션 */}
      <SiteHeader />

      <main className="signup-main">
        {/* 좌측 브랜드 소개와 상품 비주얼 */}
        <section className="hero-area" aria-labelledby="login-hero-title">
          <div className="hero-copy">
            <p className="eyebrow">EVERY STEP, YOUR STRIDE</p>
            <h1 id="login-hero-title">
              당신의 움직임을
              <br />더 멀리, 더 멋지게
            </h1>
            <p className="hero-description">
              프리미엄 러닝부터 데일리 스니커즈까지,
              <br />
              STRIDE와 함께 새로운 감각을 경험하세요.
            </p>
          </div>

          <img className="hero-image" src={heroShoes} alt="오프화이트 러닝화 제품 사진" />

          <div className="benefit-bar" aria-label="membership benefits">
            <Benefit icon={Truck} title="전 상품 무료 배송" description="3만원 이상 구매 시" />
            <Benefit icon={RotateCcw} title="간편한 무료 반품" description="상품 수령 후 7일 이내" />
            <Benefit icon={BadgePercent} title="STRIDE 멤버 혜택" description="등급별 할인 및 쿠폰 제공" />
          </div>
        </section>

        {/* 우측 로그인 입력 폼 */}
        <section className="form-card login-card" aria-labelledby="login-form-title">
          <div className="form-heading">
            <h2 id="login-form-title">로그인</h2>
            <p>
              STRIDE에 오신 것을 환영합니다.
              <br />
              로그인하고 다양한 혜택을 누려보세요.
            </p>
          </div>

          <form className="signup-form login-form" noValidate onSubmit={handleSubmit}>
            <TextInput
              error={errors.email}
              label="이메일"
              name="email"
              onChange={handleEmailChange}
              placeholder="your@email.com"
              type="email"
            />

            <PasswordInput
              error={errors.password}
              label="비밀번호"
              name="password"
              onChange={handlePasswordChange}
              placeholder="비밀번호"
              value={passwordValue}
            />

            {formStatus && <p className="form-status form-status-error">{formStatus}</p>}

            <button className="submit-button login-submit-button" type="submit" disabled={isSubmitting}>
              {isSubmitting ? "로그인 중" : "로그인"}
            </button>

            <Link className="login-button signup-switch-button" to="/signup">
              회원가입
            </Link>
          </form>
        </section>
      </main>

      {/* 하단 약관 및 저작권 영역 */}
      <footer className="site-footer">
        <nav aria-label="footer navigation">
          <Link to="/">고객센터</Link>
          <Link to="/">이용약관</Link>
          <Link to="/">개인정보처리방침</Link>
          <Link to="/">FAQ</Link>
        </nav>
        <p>© STRIDE. ALL RIGHTS RESERVED.</p>
      </footer>
    </div>
  );
}

function Benefit({ icon: Icon, title, description }) {
  return (
    <article className="benefit-item">
      <Icon size={34} strokeWidth={1.6} />
      <div>
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
    </article>
  );
}

function TextInput({ error, label, name, onChange, placeholder, type }) {
  return (
    <label className="field-control">
      <span className="field-label">{label}</span>
      <input
        aria-invalid={Boolean(error)}
        aria-label={label}
        className={error ? "input-error" : ""}
        name={name}
        onBlur={(event) => onChange(event.target.value)}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        type={type}
      />
      {error && <span className="field-error">{error}</span>}
    </label>
  );
}

function PasswordInput({ error, label, name, onChange, placeholder, value }) {
  const [isVisible, setIsVisible] = useState(false);
  const inputType = isVisible ? "text" : "password";
  const buttonLabel = isVisible ? `${label} 숨기기` : `${label} 보기`;

  return (
    <label className="field-control password-field">
      <span className="field-label">{label}</span>
      <span className="password-input-wrap">
        <input
          aria-invalid={Boolean(error)}
          aria-label={label}
          autoCapitalize="none"
          autoCorrect="off"
          className={error ? "input-error" : ""}
          name={name}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          spellCheck={false}
          type={inputType}
          value={value}
        />
        <button
          type="button"
          aria-label={buttonLabel}
          aria-pressed={isVisible}
          onClick={() => setIsVisible((current) => !current)}
        >
          {isVisible ? <EyeOff size={16} strokeWidth={1.8} /> : <Eye size={16} strokeWidth={1.8} />}
        </button>
      </span>
      {error && <span className="field-error">{error}</span>}
    </label>
  );
}

export default LoginPage;
