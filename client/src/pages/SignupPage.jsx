import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  BadgePercent,
  ChevronDown,
  Eye,
  EyeOff,
  RotateCcw,
  Truck,
} from "lucide-react";

import heroShoes from "../assets/signup-shoes.png";
import SiteHeader from "../components/SiteHeader.jsx";

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "/api";
const agreementItems = [
  {
    id: "terms",
    label: "[필수] 이용약관 동의",
    required: true,
    details: [
      "회원은 STRIDE가 제공하는 쇼핑몰 서비스를 본 약관에 따라 이용할 수 있습니다.",
      "회원은 가입 시 정확한 정보를 입력해야 하며, 타인의 정보를 무단으로 사용할 수 없습니다.",
      "주문, 결제, 배송, 교환 및 반품은 사이트에 안내된 정책과 관련 법령을 따릅니다.",
    ],
  },
  {
    id: "privacy",
    label: "[필수] 개인정보 수집 및 이용 동의",
    required: true,
    details: [
      "수집 항목: 이름, 이메일, 비밀번호, 휴대폰 번호, 서비스 이용 기록",
      "이용 목적: 회원 식별, 주문 처리, 배송 안내, 고객 문의 응대, 부정 이용 방지",
      "보유 기간: 회원 탈퇴 시까지 보관하며, 관련 법령에 따라 필요한 정보는 정해진 기간 동안 보관됩니다.",
    ],
  },
  {
    id: "marketing",
    label: "[선택] 마케팅 정보 수신 동의",
    required: false,
    details: [
      "신상품, 할인 행사, 쿠폰, 이벤트 등 쇼핑 혜택 정보를 이메일 또는 문자로 받아볼 수 있습니다.",
      "동의하지 않아도 회원가입과 기본 서비스 이용에는 제한이 없습니다.",
      "마케팅 수신 동의는 마이페이지 또는 고객센터를 통해 언제든지 철회할 수 있습니다.",
    ],
  },
];
const requiredFields = {
  name: "이름을 입력해주세요",
  email: "이메일을 입력해주세요",
  password: "비밀번호를 입력해주세요",
  confirmPassword: "비밀번호 확인을 입력해주세요",
  phone: "휴대폰 번호를 입력해주세요",
  verificationCode: "인증번호를 입력해주세요",
};
const passwordMismatchMessage = "비밀번호가 일치하지 않습니다";
const passwordGuideMessage = "비밀번호는 영문 대문자, 소문자, 숫자를 조합해 8자 이상 입력해주세요";
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const namePattern = /^[가-힣]{2,20}$/;
const passwordAlphaNumberPattern = /^[A-Za-z0-9]+$/;
const verificationCodePattern = /^\d{4}$/;
const initialAgreementChecks = agreementItems.reduce((checks, item) => {
  checks[item.id] = false;
  return checks;
}, {});

const parseJsonResponse = async (response) => {
  try {
    return await response.json();
  } catch {
    return {};
  }
};

const formatPhoneNumber = (value) => {
  const numbersOnly = value.replace(/\D/g, "").slice(0, 11);

  if (numbersOnly.length <= 3) {
    return numbersOnly;
  }

  if (numbersOnly.length <= 7) {
    return `${numbersOnly.slice(0, 3)}-${numbersOnly.slice(3)}`;
  }

  return `${numbersOnly.slice(0, 3)}-${numbersOnly.slice(3, 7)}-${numbersOnly.slice(7)}`;
};

const validateName = (value) => {
  const name = value.trim();

  if (!name) {
    return requiredFields.name;
  }

  if (!namePattern.test(name)) {
    return "이름은 한글로 2자 이상으로 입력해주세요";
  }

  return "";
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

const normalizePassword = (value) => String(value || "").normalize("NFKC").trim();

const validatePassword = (value) => {
  const password = normalizePassword(value);

  if (!password) {
    return requiredFields.password;
  }

  if (password.length < 8 || !passwordAlphaNumberPattern.test(password)) {
    return passwordGuideMessage;
  }

  if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/\d/.test(password)) {
    return passwordGuideMessage;
  }

  return "";
};

const validatePhone = (value) => {
  const phone = value.replace(/\D/g, "");

  if (!phone) {
    return requiredFields.phone;
  }

  if (!phone.startsWith("010")) {
    return "휴대폰 번호는 010으로 시작해야 합니다";
  }

  if (phone.length !== 11) {
    return "휴대폰 번호 11자리를 입력해주세요";
  }

  return "";
};

const validatePhoneWhileTyping = (value) => {
  const phone = value.replace(/\D/g, "");

  if (!phone) {
    return requiredFields.phone;
  }

  if (phone.length <= 3 && !"010".startsWith(phone)) {
    return "휴대폰 번호는 010으로 시작해야 합니다";
  }

  if (phone.length > 3 && !phone.startsWith("010")) {
    return "휴대폰 번호는 010으로 시작해야 합니다";
  }

  return "";
};

const validateVerificationCode = (value) => {
  const code = String(value || "").replace(/\D/g, "");

  if (!code) {
    return requiredFields.verificationCode;
  }

  if (!verificationCodePattern.test(code)) {
    return "인증번호 4자리를 입력해주세요";
  }

  return "";
};

function SignupPage() {
  const navigate = useNavigate();
  const [errors, setErrors] = useState({});
  const [verificationMessage, setVerificationMessage] = useState("");
  const [agreementError, setAgreementError] = useState("");
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [openedAgreementId, setOpenedAgreementId] = useState(null);
  const [agreementChecks, setAgreementChecks] = useState(initialAgreementChecks);
  const [passwordValue, setPasswordValue] = useState("");
  const [confirmPasswordValue, setConfirmPasswordValue] = useState("");
  const [phoneValue, setPhoneValue] = useState("");
  const [verificationCodeValue, setVerificationCodeValue] = useState("");
  const [isVerificationCodeSent, setIsVerificationCodeSent] = useState(false);
  const [isPhoneVerified, setIsPhoneVerified] = useState(false);
  const [isVerifyingCode, setIsVerifyingCode] = useState(false);
  const isAllAgreed = agreementItems.every((item) => agreementChecks[item.id]);
  const isPhoneInputLocked = isSendingCode || isVerificationCodeSent;
  const isVerificationCodeInputLocked = isVerifyingCode || isPhoneVerified;
  const verificationButtonLabel = isPhoneVerified
    ? "인증완료"
    : isVerificationCodeSent
      ? isVerifyingCode
        ? "확인 중"
        : "인증번호 확인하기"
      : isSendingCode
        ? "전송 중"
        : "인증번호 받기";
  const isVerificationButtonDisabled = isSendingCode || isVerifyingCode || isPhoneVerified;

  // 가입하기 클릭 시 필수 입력값과 형식을 확인하고, 문제가 있는 인풋에 에러를 표시합니다.
  const handleSubmit = async (event) => {
    event.preventDefault();
    setVerificationMessage("");
    setAgreementError("");

    const signupForm = event.currentTarget;
    const formData = new FormData(signupForm);
    const nextErrors = Object.entries(requiredFields).reduce((result, [fieldName, message]) => {
      const value = formData.get(fieldName)?.toString().trim();

      if (!value) {
        result[fieldName] = message;
      }

      return result;
    }, {});
    const nameError = validateName(formData.get("name")?.toString() || "");
    const emailError = validateEmail(formData.get("email")?.toString() || "");
    const phoneError = validatePhone(formData.get("phone")?.toString() || "");
    const verificationCodeError = validateVerificationCode(formData.get("verificationCode")?.toString() || "");
    const password = normalizePassword(formData.get("password"));
    const confirmPassword = normalizePassword(formData.get("confirmPassword"));
    const passwordError = validatePassword(password);
    const hasRequiredAgreementError = agreementItems.some((item) => item.required && !agreementChecks[item.id]);

    if (nameError) {
      nextErrors.name = nameError;
    }

    if (emailError) {
      nextErrors.email = emailError;
    }

    if (phoneError) {
      nextErrors.phone = phoneError;
    }

    if (verificationCodeError) {
      nextErrors.verificationCode = verificationCodeError;
    }

    if (passwordError) {
      nextErrors.password = passwordError;
    }

    if (!verificationCodeError && !isPhoneVerified) {
      nextErrors.verificationCode = isVerificationCodeSent
        ? "인증번호 확인을 완료해주세요"
        : "인증번호를 먼저 받아주세요";
    }

    if (password && confirmPassword && password !== confirmPassword) {
      nextErrors.confirmPassword = passwordMismatchMessage;
    }

    setErrors(nextErrors);
    setAgreementError(hasRequiredAgreementError ? "필수 동의는 꼭 체크해주셔야 합니다." : "");

    if (Object.keys(nextErrors).length > 0 || hasRequiredAgreementError) {
      return;
    }

    setIsSubmitting(true);

    try {
      const createUserResponse = await fetch(`${apiBaseUrl}/users`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: formData.get("email")?.toString().trim().toLowerCase(),
          name: formData.get("name")?.toString().trim(),
          password,
          phoneNumber: phoneValue.replace(/\D/g, ""),
          userType: "customer",
        }),
      });
      const createdUserData = await parseJsonResponse(createUserResponse);

      if (!createUserResponse.ok) {
        const message = createdUserData.message || "회원가입 처리 중 오류가 발생했습니다.";

        if (createUserResponse.status === 409) {
          setErrors((currentErrors) => ({
            ...currentErrors,
            email: message,
          }));
          return;
        }

        setVerificationMessage(message);
        return;
      }

      // 회원가입이 정상 처리되면 메인 화면으로 이동합니다.
      signupForm.reset();
      setPasswordValue("");
      setConfirmPasswordValue("");
      setPhoneValue("");
      setVerificationCodeValue("");
      setIsVerificationCodeSent(false);
      setIsPhoneVerified(false);
      setAgreementError("");
      setAgreementChecks(initialAgreementChecks);
      navigate("/", { replace: true });
      return;
    } catch {
      setVerificationMessage("서버와 연결할 수 없습니다. 서버가 실행 중인지 확인해주세요.");
      return;
    } finally {
      setIsSubmitting(false);
    }
  };

  // 비밀번호 확인값이 비밀번호와 다르면 확인 입력창 아래에 즉시 에러를 표시합니다.
  const handlePasswordChange = (fieldName, value) => {
    const nextPassword = fieldName === "password" ? value : passwordValue;
    const nextConfirmPassword = fieldName === "confirmPassword" ? value : confirmPasswordValue;
    const normalizedNextPassword = normalizePassword(nextPassword);
    const normalizedNextConfirmPassword = normalizePassword(nextConfirmPassword);

    if (fieldName === "password") {
      setPasswordValue(value);
    } else {
      setConfirmPasswordValue(value);
    }

    setErrors((currentErrors) => {
      const nextErrors = { ...currentErrors };
      delete nextErrors[fieldName];
      const passwordError = validatePassword(nextPassword);

      if (passwordError) {
        nextErrors.password = passwordError;
      } else {
        delete nextErrors.password;
      }

      if (
        normalizedNextConfirmPassword &&
        normalizedNextPassword &&
        normalizedNextPassword !== normalizedNextConfirmPassword
      ) {
        nextErrors.confirmPassword = passwordMismatchMessage;
      } else if (nextErrors.confirmPassword === passwordMismatchMessage) {
        delete nextErrors.confirmPassword;
      }

      return nextErrors;
    });
  };

  // 사용자가 다시 입력을 시작하면 해당 인풋의 에러만 제거합니다.
  const clearFieldError = (fieldName) => {
    setErrors((currentErrors) => {
      if (!currentErrors[fieldName]) {
        return currentErrors;
      }

      const nextErrors = { ...currentErrors };
      delete nextErrors[fieldName];
      return nextErrors;
    });
  };

  // 이름과 이메일은 입력 중에도 바로 형식 검사를 진행합니다.
  const validateTextField = (fieldName, value) => {
    const message = fieldName === "name" ? validateName(value) : validateEmail(value);

    setErrors((currentErrors) => {
      const nextErrors = { ...currentErrors };

      if (message) {
        nextErrors[fieldName] = message;
      } else {
        delete nextErrors[fieldName];
      }

      return nextErrors;
    });
  };

  // 약관의 보기 버튼을 누르면 해당 약관 내용만 펼치고, 다시 누르면 접습니다.
  const toggleAgreement = (agreementId) => {
    setOpenedAgreementId((currentId) => (currentId === agreementId ? null : agreementId));
  };

  // 전체 동의를 누르면 모든 약관 체크박스를 같은 상태로 맞춥니다.
  const handleAllAgreementChange = (event) => {
    const isChecked = event.target.checked;

    setAgreementError("");
    setAgreementChecks(
      agreementItems.reduce((checks, item) => {
        checks[item.id] = isChecked;
        return checks;
      }, {}),
    );
  };

  // 개별 약관 체크 상태를 바꾸고, 모든 항목이 체크되면 전체 동의도 자동 체크됩니다.
  const handleAgreementChange = (agreementId) => {
    setAgreementError("");
    setAgreementChecks((currentChecks) => ({
      ...currentChecks,
      [agreementId]: !currentChecks[agreementId],
    }));
  };

  // 휴대폰 번호는 숫자만 입력받고, 입력 길이에 맞춰 하이픈을 자동으로 붙입니다.
  const handlePhoneChange = (value) => {
    if (isPhoneInputLocked) {
      return;
    }

    const formattedPhone = formatPhoneNumber(value);
    const message = validatePhoneWhileTyping(formattedPhone);

    setPhoneValue(formattedPhone);
    setVerificationMessage("");
    setIsVerificationCodeSent(false);
    setIsPhoneVerified(false);
    setVerificationCodeValue("");
    setErrors((currentErrors) => {
      const nextErrors = { ...currentErrors };

      if (message) {
        nextErrors.phone = message;
      } else {
        delete nextErrors.phone;
      }

      return nextErrors;
    });
  };

  // 전화번호 입력칸을 벗어나면 010 시작 여부와 전체 길이를 검사합니다.
  const handlePhoneBlur = (value) => {
    const message = validatePhone(value);

    setErrors((currentErrors) => {
      const nextErrors = { ...currentErrors };

      if (message) {
        nextErrors.phone = message;
      } else {
        delete nextErrors.phone;
      }

      return nextErrors;
    });
  };

  // 인증번호는 숫자만 입력받고 4자리까지만 허용합니다.
  const handleVerificationCodeChange = (value) => {
    const code = value.replace(/\D/g, "").slice(0, 4);
    const message = validateVerificationCode(code);

    setVerificationCodeValue(code);
    setIsPhoneVerified(false);
    setErrors((currentErrors) => {
      const nextErrors = { ...currentErrors };

      if (message) {
        nextErrors.verificationCode = message;
      } else {
        delete nextErrors.verificationCode;
      }

      return nextErrors;
    });

    return code;
  };

  // 프론트에서 입력한 전화번호를 서버로 보내고, 서버에서 Solapi SMS 인증번호를 전송합니다.
  const handleSendVerificationCode = async () => {
    const phoneError = validatePhone(phoneValue);

    setVerificationMessage("");

    if (phoneError) {
      setErrors((currentErrors) => ({
        ...currentErrors,
        phone: phoneError,
      }));
      return;
    }

    setIsSendingCode(true);

    try {
      const response = await fetch(`${apiBaseUrl}/auth/send-verification-code`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          phoneNumber: phoneValue,
        }),
      });
      const data = await parseJsonResponse(response);

      if (!response.ok) {
        setVerificationMessage(data.message || "인증번호 전송에 실패했습니다.");
        return;
      }

      setIsVerificationCodeSent(true);
      setIsPhoneVerified(false);
      setVerificationMessage(data.message || "인증번호를 전송했습니다. 인증번호 입력 후 확인해주세요.");
    } catch {
      setVerificationMessage("인증번호 전송 중 오류가 발생했습니다.");
    } finally {
      setIsSendingCode(false);
    }
  };

  // 전송받은 인증번호를 서버에 보내 실제 인증 완료 상태로 변경합니다.
  const handleVerifyVerificationCode = async () => {
    const phoneError = validatePhone(phoneValue);
    const verificationCodeError = validateVerificationCode(verificationCodeValue);

    setVerificationMessage("");

    if (phoneError || verificationCodeError) {
      setErrors((currentErrors) => ({
        ...currentErrors,
        ...(phoneError ? { phone: phoneError } : {}),
        ...(verificationCodeError ? { verificationCode: verificationCodeError } : {}),
      }));
      return;
    }

    setIsVerifyingCode(true);

    try {
      const response = await fetch(`${apiBaseUrl}/auth/verify-verification-code`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          phoneNumber: phoneValue,
          code: verificationCodeValue,
        }),
      });
      const data = await parseJsonResponse(response);

      if (!response.ok) {
        setIsPhoneVerified(false);
        setErrors((currentErrors) => ({
          ...currentErrors,
          verificationCode: data.message || "인증번호를 확인해주세요.",
        }));
        return;
      }

      setIsPhoneVerified(true);
      setErrors((currentErrors) => {
        const nextErrors = { ...currentErrors };
        delete nextErrors.verificationCode;
        return nextErrors;
      });
      setVerificationMessage(data.message || "인증이 완료되었습니다.");
    } catch {
      setVerificationMessage("인증번호 확인 중 오류가 발생했습니다.");
    } finally {
      setIsVerifyingCode(false);
    }
  };

  // 인증번호 버튼은 전송 전에는 발송, 전송 후에는 확인 역할을 합니다.
  const handleVerificationButtonClick = () => {
    if (isVerificationCodeSent) {
      handleVerifyVerificationCode();
      return;
    }

    handleSendVerificationCode();
  };

  return (
    <div className="signup-page">
      {/* 쇼핑몰 공통 상단 네비게이션 */}
      <SiteHeader />

      <main className="signup-main">
        {/* 좌측 브랜드 소개와 상품 비주얼 */}
        <section className="hero-area" aria-labelledby="signup-hero-title">
          <div className="hero-copy">
            <p className="eyebrow">EVERY STEP, YOUR STRIDE</p>
            <h1 id="signup-hero-title">
              새로운 여정의 시작,
              <br />
              STRIDE와 함께
            </h1>
            <p className="hero-description">
              회원이 되시면 특별한 혜택과
              <br />더 나은 쇼핑 경험을 누리실 수 있습니다.
            </p>
          </div>

          <img className="hero-image" src={heroShoes} alt="오프화이트 러닝화 제품 사진" />

          <div className="benefit-bar" aria-label="membership benefits">
            <Benefit icon={Truck} title="전 상품 무료 배송" description="3만원 이상 구매 시" />
            <Benefit icon={RotateCcw} title="간편한 무료 반품" description="상품 수령 후 7일 이내" />
            <Benefit icon={BadgePercent} title="STRIDE 멤버 혜택" description="등급별 할인 및 쿠폰 제공" />
          </div>
        </section>

        {/* 우측 회원가입 입력 폼 */}
        <section className="form-card" aria-labelledby="signup-form-title">
          <div className="form-heading">
            <h2 id="signup-form-title">회원가입</h2>
            <p>
              STRIDE의 새로운 멤버가 되어
              <br />
              다양한 혜택과 특별한 경험을 만나보세요.
            </p>
          </div>

          <form className="signup-form" noValidate onSubmit={handleSubmit}>
            <TextInput
              error={errors.name}
              label="이름"
              name="name"
              onClearError={clearFieldError}
              onValidate={validateTextField}
              placeholder="이름"
              type="text"
            />
            <TextInput
              error={errors.email}
              label="이메일"
              name="email"
              onClearError={clearFieldError}
              onValidate={validateTextField}
              placeholder="your@email.com"
              type="email"
            />

            <PasswordInput
              error={errors.password}
              label="비밀번호"
              name="password"
              onChange={handlePasswordChange}
              placeholder="비밀번호를 입력해주세요"
              value={passwordValue}
            />
            <PasswordInput
              error={errors.confirmPassword}
              label="비밀번호 확인"
              name="confirmPassword"
              onChange={handlePasswordChange}
              placeholder="비밀번호를 다시 입력해주세요"
              value={confirmPasswordValue}
            />
            <PhoneInput
              error={errors.phone}
              label="전화번호"
              name="phone"
              onBlur={handlePhoneBlur}
              onChange={handlePhoneChange}
              placeholder="010-1234-5678"
              readOnly={isPhoneInputLocked}
              value={phoneValue}
            />

            <div className="verify-row">
              <VerificationCodeInput
                error={errors.verificationCode}
                label="인증번호"
                name="verificationCode"
                onChange={handleVerificationCodeChange}
                placeholder="인증번호 입력"
                readOnly={isVerificationCodeInputLocked}
                value={verificationCodeValue}
              />
              <div className="verify-action">
                <span className="field-label" aria-hidden="true">
                  인증번호
                </span>
                <button type="button" disabled={isVerificationButtonDisabled} onClick={handleVerificationButtonClick}>
                  {verificationButtonLabel}
                </button>
              </div>
            </div>

            {verificationMessage && <p className="form-status">{verificationMessage}</p>}

            <div className="agreement-list">
              <label className="check-line all-agree">
                <input type="checkbox" checked={isAllAgreed} onChange={handleAllAgreementChange} />
                전체 동의
              </label>

              {agreementItems.map((item) => {
                const isOpened = openedAgreementId === item.id;
                const detailId = `${item.id}-agreement-detail`;

                return (
                  <div className="agreement-item" key={item.id}>
                    <div className="check-line">
                      <label>
                        <input
                          type="checkbox"
                          checked={agreementChecks[item.id]}
                          onChange={() => handleAgreementChange(item.id)}
                          required={item.required}
                        />
                        <span>{item.label}</span>
                      </label>
                      <button
                        type="button"
                        aria-controls={detailId}
                        aria-expanded={isOpened}
                        aria-label={`${item.label} ${isOpened ? "닫기" : "보기"}`}
                        onClick={() => toggleAgreement(item.id)}
                      >
                        {isOpened ? "닫기" : "보기"}
                        <ChevronDown className={isOpened ? "chevron-open" : ""} size={16} strokeWidth={1.8} />
                      </button>
                    </div>

                    {isOpened && (
                      <div className="agreement-detail" id={detailId}>
                        {item.details.map((detail) => (
                          <p key={detail}>{detail}</p>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {agreementError && <p className="agreement-error">{agreementError}</p>}

            <button className="submit-button" type="submit" disabled={isSubmitting}>
              {isSubmitting ? "확인 중" : "가입하기"}
            </button>

            <Link className="login-button signup-switch-button" to="/login">
              이미 회원이신가요? <span>로그인</span>
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

function TextInput({ error, label, name, onClearError, onValidate, placeholder, type }) {
  const handleChange = (event) => {
    if (onValidate) {
      onValidate(name, event.target.value);
      return;
    }

    onClearError(name);
  };

  return (
    <label className="field-control">
      <span className="field-label">{label}</span>
      <input
        aria-invalid={Boolean(error)}
        aria-label={label}
        className={error ? "input-error" : ""}
        name={name}
        onBlur={(event) => onValidate?.(name, event.target.value)}
        onChange={handleChange}
        placeholder={placeholder}
        type={type}
      />
      {error && <span className="field-error">{error}</span>}
    </label>
  );
}

function PhoneInput({ error, label, name, onBlur, onChange, placeholder, readOnly = false, value }) {
  return (
    <label className="field-control">
      <span className="field-label">{label}</span>
      <input
        aria-invalid={Boolean(error)}
        aria-label={label}
        className={error ? "input-error" : ""}
        inputMode="numeric"
        name={name}
        onBlur={(event) => onBlur(event.target.value)}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        readOnly={readOnly}
        type="tel"
        value={value}
      />
      {error && <span className="field-error">{error}</span>}
    </label>
  );
}

function VerificationCodeInput({ error, label, name, onChange, placeholder, readOnly = false, value }) {
  const handleChange = (event) => {
    if (readOnly) {
      return;
    }

    onChange(event.target.value);
  };

  return (
    <label className="field-control">
      <span className="field-label">{label}</span>
      <input
        aria-invalid={Boolean(error)}
        aria-label={label}
        className={error ? "input-error" : ""}
        inputMode="numeric"
        maxLength={4}
        name={name}
        onChange={handleChange}
        placeholder={placeholder}
        readOnly={readOnly}
        type="text"
        value={value}
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
          onChange={(event) => onChange(name, event.target.value)}
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

export default SignupPage;
