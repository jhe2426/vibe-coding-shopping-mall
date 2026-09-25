import assert from "node:assert/strict";
import test from "node:test";

import { isPaymentDismissal, isUnpaidPaymentError, isUnpaidPaymentResponse } from "../src/utils/portone-result.js";

test("결제번호가 있어도 결제창을 닫아 failed 상태면 미결제로 처리한다", () => {
  assert.equal(isUnpaidPaymentResponse({ imp_uid: "imp_123", status: "failed" }), true);
  assert.equal(isUnpaidPaymentResponse({ imp_uid: "imp_123", error_msg: "사용자가 결제창을 닫았습니다." }), true);
  assert.equal(isPaymentDismissal("사용자가 결제창을 닫았습니다."), true);
});

test("결제번호만 온 경우 서버의 미결제 검증 응답을 구분한다", () => {
  assert.equal(isUnpaidPaymentResponse({ imp_uid: "imp_123" }), false);
  assert.equal(isUnpaidPaymentError(400, { code: "PAYMENT_NOT_PAID" }), true);
  assert.equal(isUnpaidPaymentError(400, { message: "결제가 완료된 상태가 아닙니다." }), true);
});

test("결제 완료 및 다른 서버 오류는 미결제로 오인하지 않는다", () => {
  assert.equal(isUnpaidPaymentResponse({ imp_uid: "imp_123", status: "paid" }), false);
  assert.equal(isUnpaidPaymentError(502, { message: "포트원 인증에 실패했습니다." }), false);
});
