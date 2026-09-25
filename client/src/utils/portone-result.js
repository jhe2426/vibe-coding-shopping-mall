export const isPaymentDismissal = (message = "") => /취소|닫|종료|cancel|clos|abort/i.test(message);

// 포트원은 결제창을 닫거나 취소해도 imp_uid를 반환할 수 있습니다.
export const isUnpaidPaymentResponse = (response) => (
  Boolean(response?.error_code)
  || isPaymentDismissal(response?.error_msg)
  || response?.success === false
  || response?.imp_success === false
  || (Boolean(response?.status) && response.status !== "paid")
  || !response?.imp_uid
);

export const isUnpaidPaymentError = (status, data = {}) => (
  data.code === "PAYMENT_NOT_PAID"
  || (status === 400 && data.message === "결제가 완료된 상태가 아닙니다.")
);
