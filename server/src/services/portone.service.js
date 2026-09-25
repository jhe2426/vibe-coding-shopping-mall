const portOneApiBaseUrl = "https://api.iamport.kr";

const createPortOneError = (message, status = 502) => {
  const error = new Error(message);
  error.status = status;
  return error;
};

const parseResponse = async (response, fallbackMessage) => {
  const data = await response.json().catch(() => ({}));

  if (!response.ok || data.code !== 0 || !data.response) {
    throw createPortOneError(data.message || fallbackMessage);
  }

  return data.response;
};

const getPortOneAccessToken = async () => {
  const apiKey = process.env.PORTONE_REST_API_KEY;
  const apiSecret = process.env.PORTONE_REST_API_SECRET;

  if (!apiKey || !apiSecret) {
    throw createPortOneError("포트원 서버 결제 검증 키가 설정되지 않았습니다.", 500);
  }

  const response = await fetch(`${portOneApiBaseUrl}/users/getToken`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ imp_key: apiKey, imp_secret: apiSecret }),
  });
  const token = await parseResponse(response, "포트원 인증에 실패했습니다.");

  return token.access_token;
};

// 포트원 서버 조회 결과와 서버에서 재계산한 주문 금액을 함께 검증합니다.
export const verifyPortOnePayment = async ({ impUid, merchantUid, totalAmount }) => {
  const accessToken = await getPortOneAccessToken();
  const paymentUrl = new URL(`${portOneApiBaseUrl}/payments/${encodeURIComponent(impUid)}`);

  // 포트원 V1은 테스트 채널 결제를 단건조회에서 기본적으로 제외한다.
  if (process.env.PORTONE_INCLUDE_SANDBOX === "true") {
    paymentUrl.searchParams.set("include_sandbox", "true");
  }

  const response = await fetch(paymentUrl, {
    headers: { Authorization: accessToken },
  });
  const payment = await parseResponse(response, "포트원 결제 내역을 조회하지 못했습니다.");

  if (payment.merchant_uid !== merchantUid) {
    throw createPortOneError("결제 주문번호가 일치하지 않습니다.", 400);
  }

  if (payment.status !== "paid") {
    const error = createPortOneError("결제가 완료된 상태가 아닙니다.", 400);
    error.code = "PAYMENT_NOT_PAID";
    throw error;
  }

  if (Number(payment.amount) !== totalAmount) {
    throw createPortOneError("결제 금액이 주문 금액과 일치하지 않습니다.", 400);
  }

  return payment;
};

// 결제 취소는 반드시 서버에서 포트원 거래고유번호와 서버 저장 금액으로 요청합니다.
export const cancelPortOnePayment = async ({ impUid, totalAmount, reason }) => {
  const accessToken = await getPortOneAccessToken();
  const response = await fetch(`${portOneApiBaseUrl}/payments/cancel`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: accessToken,
    },
    body: JSON.stringify({
      imp_uid: impUid,
      amount: totalAmount,
      checksum: totalAmount,
      reason,
    }),
  });

  return parseResponse(response, "포트원 결제 취소에 실패했습니다.");
};
