import assert from "node:assert/strict";
import { afterEach, test } from "node:test";

import { abandonOrder, getOrders } from "../src/controllers/order.controller.js";
import Order from "../src/models/order.model.js";

const originalFindOneAndUpdate = Order.findOneAndUpdate;
const originalFindOne = Order.findOne;
const originalFind = Order.find;

afterEach(() => {
  Order.findOneAndUpdate = originalFindOneAndUpdate;
  Order.findOne = originalFindOne;
  Order.find = originalFind;
});

const runAbandon = async () => {
  const result = { status: 200, body: null, error: null };
  const response = {
    status(code) {
      result.status = code;
      return this;
    },
    send() {
      return this;
    },
    json(body) {
      result.body = body;
      return this;
    },
  };

  await abandonOrder(
    { params: { orderId: "order_test" }, authUser: { id: "customer-1" } },
    response,
    (error) => { result.error = error; },
  );
  return result;
};

test("결제 대기 주문만 중단 표시한다", async () => {
  Order.findOneAndUpdate = async (filter, update) => {
    assert.equal(filter.user, "customer-1");
    assert.equal(filter.orderNumber, "order_test");
    assert.equal(filter.status, "PAYMENT_PENDING");
    assert.equal(filter.abandonedAt, null);
    assert.ok(update.$set.abandonedAt instanceof Date);
    return { status: "PAYMENT_PENDING" };
  };

  assert.deepEqual(await runAbandon(), { status: 204, body: null, error: null });
});

test("이미 중단 표시된 주문은 재요청해도 성공한다", async () => {
  Order.findOneAndUpdate = async () => null;
  Order.findOne = () => ({ select: async () => ({ status: "PAYMENT_PENDING", abandonedAt: new Date() }) });

  assert.deepEqual(await runAbandon(), { status: 204, body: null, error: null });
});

test("이미 결제된 주문은 중단 표시하지 않는다", async () => {
  Order.findOneAndUpdate = async () => null;
  Order.findOne = () => ({ select: async () => ({ status: "PAID", abandonedAt: null }) });

  const result = await runAbandon();
  assert.equal(result.status, 409);
  assert.match(result.body.message, /이미 처리된 주문/);
  assert.equal(result.error, null);
});

test("고객 주문 목록은 이전에 생성된 결제 대기 주문도 제외한다", async () => {
  Order.find = (filter) => {
    assert.equal(filter.user, "customer-1");
    assert.deepEqual(filter.status, { $ne: "PAYMENT_PENDING" });
    return { populate: () => ({ sort: async () => [{ status: "PAID" }] }) };
  };

  let body;
  await getOrders(
    { authUser: { id: "customer-1" }, query: {} },
    { json(data) { body = data; } },
    (error) => { throw error; },
  );
  assert.deepEqual(body, { orders: [{ status: "PAID" }] });
});
