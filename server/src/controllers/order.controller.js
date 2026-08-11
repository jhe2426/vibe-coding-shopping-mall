import mongoose from "mongoose";

import Order from "../models/order.model.js";
import Product from "../models/product.model.js";
import { cancelOrderWithRefund } from "../services/order-cancellation.service.js";
import { verifyPortOnePayment } from "../services/portone.service.js";

const getProductPrice = (product) => product.salePrice ?? product.regularPrice;

const createOrderNumber = () => `order_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;

const buildOrderFilter = (orderId) => (
  mongoose.isValidObjectId(orderId) ? { _id: orderId } : { orderNumber: orderId }
);

const getOrderForUser = (req, orderId) => {
  return Order.findOne({
    ...buildOrderFilter(orderId),
    user: req.authUser.id,
  }).populate("items.product");
};

const getExistingPaymentOrder = (impUid, merchantUid) => Order.findOne({
  $or: [
    { orderNumber: merchantUid },
    { "payment.merchantUid": merchantUid },
    { "payment.impUid": impUid },
  ],
}).populate("items.product");

const validateDelivery = (delivery = {}) => {
  const normalizedDelivery = {
    recipientName: String(delivery.recipientName || "").trim(),
    phoneNumber: String(delivery.phoneNumber || "").trim(),
    postalCode: String(delivery.postalCode || "").trim(),
    address: String(delivery.address || "").trim(),
    addressDetail: String(delivery.addressDetail || "").trim(),
    deliveryMemo: String(delivery.deliveryMemo || "").trim(),
  };

  if (!normalizedDelivery.recipientName || !normalizedDelivery.phoneNumber || !normalizedDelivery.postalCode || !normalizedDelivery.address) {
    const error = new Error("배송 정보를 모두 입력해주세요.");
    error.status = 400;
    throw error;
  }

  return normalizedDelivery;
};

const buildOrderItems = async (items) => {
  if (!Array.isArray(items) || items.length === 0) {
    const error = new Error("주문 상품을 선택해주세요.");
    error.status = 400;
    throw error;
  }

  const itemKeys = new Set();
  const orderItems = [];

  for (const item of items) {
    const productId = String(item.productId || "").trim();
    const size = Number(item.size);
    const quantity = Number(item.quantity);
    const itemKey = `${productId}:${size}`;

    if (!productId || !Number.isInteger(size) || !Number.isInteger(quantity) || quantity < 1 || quantity > 99 || itemKeys.has(itemKey)) {
      const error = new Error("주문 상품 정보가 올바르지 않습니다.");
      error.status = 400;
      throw error;
    }

    const product = await Product.findOne({ productId });

    if (!product) {
      const error = new Error("상품을 찾을 수 없습니다.");
      error.status = 404;
      throw error;
    }

    if (product.status !== "SELLING") {
      const error = new Error("판매 중지된 상품입니다.");
      error.status = 400;
      throw error;
    }

    const sizeItem = product.sizes.find((productSize) => productSize.size === size);

    if (!sizeItem || quantity > sizeItem.stockQuantity) {
      const error = new Error("선택한 상품의 재고가 부족합니다.");
      error.status = 400;
      throw error;
    }

    itemKeys.add(itemKey);
    orderItems.push({
      product: product._id,
      productId: product.productId,
      productName: product.name,
      imageUrl: product.cardImages?.defaultImage || "",
      size,
      unitPrice: getProductPrice(product),
      quantity,
      lineAmount: getProductPrice(product) * quantity,
    });
  }

  return orderItems;
};

const decreaseStock = async (items) => {
  const decreasedItems = [];

  try {
    for (const item of items) {
      const product = await Product.findOneAndUpdate(
        {
          _id: item.product,
          status: "SELLING",
          sizes: { $elemMatch: { size: item.size, stockQuantity: { $gte: item.quantity } } },
        },
        { $inc: { "sizes.$.stockQuantity": -item.quantity } },
        { new: true },
      );

      if (!product) {
        const error = new Error("결제 처리 중 상품 재고가 부족해졌습니다.");
        error.status = 409;
        throw error;
      }

      decreasedItems.push(item);
    }
  } catch (error) {
    await Promise.all(decreasedItems.map((item) => Product.findOneAndUpdate(
      { _id: item.product, "sizes.size": item.size },
      { $inc: { "sizes.$.stockQuantity": item.quantity } },
    )));
    throw error;
  }

  return decreasedItems;
};

const restoreStock = async (items) => Promise.all(items.map((item) => Product.findOneAndUpdate(
  { _id: item.product, "sizes.size": item.size },
  { $inc: { "sizes.$.stockQuantity": item.quantity } },
)));

const getPaymentMethod = (payMethod) => (
  payMethod === "card" ? "CARD" : payMethod === "trans" ? "BANK_TRANSFER" : "EXTERNAL"
);

const applyVerifiedPayment = async ({ order, impUid, merchantUid }) => {
  if (order.status === "PAID") {
    return order;
  }

  if (order.status !== "PAYMENT_PENDING") {
    const error = new Error("결제 처리할 수 없는 주문 상태입니다.");
    error.status = 409;
    throw error;
  }

  const payment = await verifyPortOnePayment({
    impUid,
    merchantUid,
    totalAmount: order.totalAmount,
  });
  const decreasedItems = await decreaseStock(order.items);

  try {
    const approvedAt = payment.paid_at ? new Date(payment.paid_at * 1000) : new Date();

    order.status = "PAID";
    order.payment = {
      provider: "PORTONE",
      method: getPaymentMethod(payment.pay_method),
      status: "PAID",
      merchantUid,
      impUid,
      pgTid: payment.pg_tid || "",
      paidAmount: Number(payment.amount),
      approvedAt,
    };
    order.statusHistory = [...(order.statusHistory || []), { status: "PAID", changedAt: approvedAt }];
    await order.save();
    await order.populate("items.product");
    return order;
  } catch (error) {
    await restoreStock(decreasedItems);
    throw error;
  }
};

// 고객용 주문 API는 역할과 무관하게 로그인한 사용자의 주문만 조회합니다.
export const getOrders = async (req, res, next) => {
  try {
    const filter = { user: req.authUser.id };

    if (req.query.status) {
      filter.status = req.query.status;
    }

    const orders = await Order.find(filter)
      .populate("items.product")
      .sort({ createdAt: -1 });

    return res.json({ orders });
  } catch (error) {
    return next(error);
  }
};

// 주문 상세를 조회합니다. 일반 사용자는 본인 주문만 조회할 수 있습니다.
export const getOrder = async (req, res, next) => {
  try {
    const order = await getOrderForUser(req, req.params.orderId);

    if (!order) {
      return res.status(404).json({ message: "주문을 찾을 수 없습니다." });
    }

    return res.json({ order });
  } catch (error) {
    return next(error);
  }
};

// 본인 주문의 결제 취소와 재고 복원을 함께 처리합니다.
export const cancelOrder = async (req, res, next) => {
  try {
    const order = await getOrderForUser(req, req.params.orderId);

    if (!order) {
      return res.status(404).json({ message: "주문을 찾을 수 없습니다." });
    }

    const { warning } = await cancelOrderWithRefund(order, "사용자 주문 취소");
    await order.populate("items.product");

    return res.json({ order, warning });
  } catch (error) {
    return next(error);
  }
};

// 결제 전 주문을 생성합니다. 상품 가격과 재고는 서버에서 다시 확인합니다.
export const createOrder = async (req, res, next) => {
  try {
    const [items, delivery] = await Promise.all([
      buildOrderItems(req.body.items),
      Promise.resolve(validateDelivery(req.body.delivery)),
    ]);

    const order = await Order.create({
      orderNumber: createOrderNumber(),
      user: req.authUser.id,
      items,
      delivery,
      discountAmount: 0,
      deliveryFee: 0,
      status: "PAYMENT_PENDING",
      statusHistory: [{ status: "PAYMENT_PENDING", changedAt: new Date() }],
      payment: {
        provider: "PORTONE",
        method: "EXTERNAL",
        status: "READY",
      },
    });

    await order.populate("items.product");
    return res.status(201).json({ order });
  } catch (error) {
    return next(error);
  }
};

// 결제 콜백 이후에만 호출합니다. 포트원 결제 상태와 금액을 서버에서 검증한 뒤 주문을 확정합니다.
export const completeOrderPayment = async (req, res, next) => {
  try {
    const impUid = String(req.body.impUid || "").trim();
    const merchantUid = String(req.body.merchantUid || "").trim();

    if (!impUid || !merchantUid) {
      return res.status(400).json({ message: "결제 식별 정보가 올바르지 않습니다." });
    }

    const existingOrder = await getExistingPaymentOrder(impUid, merchantUid);

    if (existingOrder) {
      if (existingOrder.user.toString() !== req.authUser.id) {
        return res.status(409).json({ message: "이미 처리된 결제입니다." });
      }

      if (existingOrder.status === "PAID") {
        return res.json({ order: existingOrder, alreadyProcessed: true });
      }

      const order = await applyVerifiedPayment({ order: existingOrder, impUid, merchantUid });
      return res.json({ order });
    }

    const [items, delivery] = await Promise.all([
      buildOrderItems(req.body.items),
      Promise.resolve(validateDelivery(req.body.delivery)),
    ]);
    const totalAmount = items.reduce((total, item) => total + item.lineAmount, 0);
    const payment = await verifyPortOnePayment({ impUid, merchantUid, totalAmount });
    const decreasedItems = await decreaseStock(items);

    try {
      const approvedAt = payment.paid_at ? new Date(payment.paid_at * 1000) : new Date();
      const order = await Order.create({
        orderNumber: merchantUid,
        user: req.authUser.id,
        items,
        delivery,
        discountAmount: 0,
        deliveryFee: 0,
        status: "PAID",
        statusHistory: [{ status: "PAID", changedAt: approvedAt }],
        payment: {
          provider: "PORTONE",
          method: getPaymentMethod(payment.pay_method),
          status: "PAID",
          merchantUid,
          impUid,
          pgTid: payment.pg_tid || "",
          paidAmount: Number(payment.amount),
          approvedAt,
        },
      });

      await order.populate("items.product");
      return res.status(201).json({ order });
    } catch (error) {
      await restoreStock(decreasedItems);

      if (error.code === 11000) {
        const duplicateOrder = await getExistingPaymentOrder(impUid, merchantUid);

        if (duplicateOrder?.user.toString() === req.authUser.id && duplicateOrder.status === "PAID") {
          return res.json({ order: duplicateOrder, alreadyProcessed: true });
        }
      }

      throw error;
    }
  } catch (error) {
    return next(error);
  }
};

// 포트원 웹훅은 브라우저 콜백이 끊긴 경우에도 대기 주문을 결제 완료로 확정합니다.
export const handlePortOnePaymentWebhook = async (req, res, next) => {
  try {
    const impUid = String(req.body.imp_uid || req.body.impUid || "").trim();
    const merchantUid = String(req.body.merchant_uid || req.body.merchantUid || "").trim();

    if (!impUid || !merchantUid) {
      return res.status(400).json({ message: "결제 식별 정보가 올바르지 않습니다." });
    }

    const order = await Order.findOne({ orderNumber: merchantUid });

    if (!order) {
      return res.status(404).json({ message: "대기 중인 주문을 찾을 수 없습니다." });
    }

    if (order.status === "PAID") {
      return res.json({ received: true, alreadyProcessed: true });
    }

    await applyVerifiedPayment({ order, impUid, merchantUid });
    return res.json({ received: true });
  } catch (error) {
    return next(error);
  }
};

// 고객용 주문 API에서는 결제 전 배송 정보만 수정할 수 있습니다.
export const updateOrder = async (req, res, next) => {
  try {
    const order = await getOrderForUser(req, req.params.orderId);

    if (!order) {
      return res.status(404).json({ message: "주문을 찾을 수 없습니다." });
    }

    if (order.status !== "PAYMENT_PENDING") {
      return res.status(400).json({ message: "결제 완료된 주문은 배송 정보를 수정할 수 없습니다." });
    }

    order.delivery = validateDelivery({ ...order.delivery.toObject(), ...req.body.delivery });

    await order.save();
    await order.populate("items.product");
    return res.json({ order });
  } catch (error) {
    return next(error);
  }
};

// 결제 전 주문만 삭제할 수 있습니다. 결제 완료 주문은 취소 절차를 통해 처리해야 합니다.
export const deleteOrder = async (req, res, next) => {
  try {
    const order = await getOrderForUser(req, req.params.orderId);

    if (!order) {
      return res.status(404).json({ message: "주문을 찾을 수 없습니다." });
    }

    if (order.status !== "PAYMENT_PENDING") {
      return res.status(400).json({ message: "결제 완료된 주문은 삭제할 수 없습니다." });
    }

    await order.deleteOne();
    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
};
