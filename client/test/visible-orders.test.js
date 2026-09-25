import assert from "node:assert/strict";
import test from "node:test";

import { getVisibleOrders } from "../src/utils/visible-orders.js";

test("기존 결제 대기 주문은 숨기고 결제 완료·배송·환불 주문은 유지한다", () => {
  const orders = [
    { id: "old", status: "PAYMENT_PENDING" },
    { id: "paid", status: "PAID" },
    { id: "shipped", status: "SHIPPED" },
    { id: "cancelled", status: "CANCELED" },
  ];

  assert.deepEqual(getVisibleOrders(orders).map((order) => order.id), ["paid", "shipped", "cancelled"]);
});
