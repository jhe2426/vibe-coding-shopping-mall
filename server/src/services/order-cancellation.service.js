import Product from "../models/product.model.js";
import { cancelPortOnePayment } from "./portone.service.js";

const cancellableOrderStatuses = new Set(["PAID", "PREPARING"]);

const createCancellationError = (message, status) => {
  const error = new Error(message);
  error.status = status;
  return error;
};

const restoreOrderStock = async (items) => Promise.all(items.map((item) => Product.findOneAndUpdate(
  { _id: item.product, "sizes.size": item.size },
  { $inc: { "sizes.$.stockQuantity": item.quantity } },
)));

// 포트원 환불 성공 이후에만 주문을 취소 상태로 확정하고 재고를 복원합니다.
export const cancelOrderWithRefund = async (order, reason, { allowedOrderStatuses = cancellableOrderStatuses } = {}) => {
  if (!allowedOrderStatuses.has(order.status)) {
    throw createCancellationError("배송 시작 전까지 주문을 취소할 수 있습니다.", 400);
  }

  if (order.payment?.status !== "PAID") {
    throw createCancellationError("환불할 수 있는 완료 결제 정보를 찾을 수 없습니다.", 409);
  }

  const paidAmount = Number(order.payment.paidAmount);

  if (!order.payment.impUid || !Number.isFinite(paidAmount) || paidAmount <= 0) {
    throw createCancellationError("결제 취소에 필요한 결제 정보를 찾을 수 없습니다.", 409);
  }

  const cancellation = await cancelPortOnePayment({
    impUid: order.payment.impUid,
    totalAmount: paidAmount,
    reason,
  });
  const canceledAt = Number(cancellation.cancelled_at);

  order.payment.status = "CANCELED";
  order.payment.canceledAt = Number.isFinite(canceledAt) ? new Date(canceledAt * 1000) : new Date();
  order.payment.cancelReason = reason;
  order.status = "CANCELED";
  order.statusHistory = [...(order.statusHistory || []), { status: "CANCELED", changedAt: new Date() }];
  await order.save();

  try {
    await restoreOrderStock(order.items);
    return { warning: "" };
  } catch (error) {
    console.error("주문 취소 후 재고 복원에 실패했습니다.", error);
    return { warning: "결제 취소는 완료됐지만 재고 복원에 실패했습니다. 재고를 확인해주세요." };
  }
};
