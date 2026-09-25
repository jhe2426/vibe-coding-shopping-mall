// 결제 전 생성된 주문은 결제가 확정될 때까지 고객 주문 내역에서 제외합니다.
export const getVisibleOrders = (orders) => (
  Array.isArray(orders) ? orders.filter((order) => order.status !== "PAYMENT_PENDING") : []
);
