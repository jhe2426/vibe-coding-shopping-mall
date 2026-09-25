import mongoose from "mongoose";

import Order from "../models/order.model.js";
import User from "../models/user.model.js";
import { cancelOrderWithRefund } from "../services/order-cancellation.service.js";

const KOREA_TIME_ZONE = "Asia/Seoul";
const DAY_IN_MILLISECONDS = 24 * 60 * 60 * 1000;
const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 50;
const orderStatuses = ["PAID", "PREPARING", "SHIPPED", "DELIVERED", "CANCELED"];
const adminEditableStatuses = ["PAID", "PREPARING", "SHIPPED", "DELIVERED"];
const adminCancellableStatuses = new Set(["PAID", "PREPARING"]);
const koreanDateFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: KOREA_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const getPositiveInteger = (value, defaultValue, maximum) => {
  const parsedValue = Number(value);

  if (!Number.isInteger(parsedValue) || parsedValue < 1) return defaultValue;
  return Math.min(parsedValue, maximum);
};

const escapeRegularExpression = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const getKoreanDateParts = (date) => Object.fromEntries(
  koreanDateFormatter
    .formatToParts(date)
    .filter((part) => ["year", "month", "day"].includes(part.type))
    .map((part) => [part.type, Number(part.value)]),
);

const createKoreanMidnight = (year, month, day) => new Date(
  `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}T00:00:00+09:00`,
);

const getAdminOrderDocument = (orderId) => Order.findById(orderId)
  .populate("user", "name userId phoneNumber")
  .populate("items.product", "brand");

const getAdminStatusOptions = (order) => {
  if (order.status === "CANCELED" || order.payment?.status !== "PAID") {
    return [order.status];
  }

  return adminEditableStatuses;
};

const parseKoreanDate = (value) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ""))) return null;

  const date = new Date(`${value}T00:00:00+09:00`);
  return Number.isNaN(date.getTime()) ? null : date;
};

const getFirstProduct = (order) => {
  const item = order.items?.[0] || {};
  const product = item.product && typeof item.product === "object" ? item.product : null;

  return {
    name: item.productName || "상품 정보 없음",
    brand: product?.brand || "-",
    imageUrl: item.imageUrl || "",
    size: item.size || null,
    quantity: Number(item.quantity || 0),
  };
};

const getOrderHistory = (order) => {
  if (Array.isArray(order.statusHistory) && order.statusHistory.length > 0) {
    return order.statusHistory.map((item) => ({
      status: item.status,
      changedAt: item.changedAt,
    }));
  }

  const history = [{ status: "PAYMENT_PENDING", changedAt: order.createdAt }];

  if (order.payment?.approvedAt) {
    history.push({ status: "PAID", changedAt: order.payment.approvedAt });
  }

  if (!["PAYMENT_PENDING", "PAID"].includes(order.status)) {
    history.push({ status: order.status, changedAt: order.updatedAt || order.createdAt });
  }

  return history;
};

const serializeOrderListItem = (order) => {
  const firstProduct = getFirstProduct(order);
  const user = order.user && typeof order.user === "object" ? order.user : null;

  return {
    id: String(order._id),
    orderNumber: order.orderNumber,
    buyerName: user?.name || "알 수 없음",
    buyerEmail: user?.userId || "",
    product: firstProduct,
    additionalItemCount: Math.max((order.items?.length || 0) - 1, 0),
    totalQuantity: (order.items || []).reduce((total, item) => total + Number(item.quantity || 0), 0),
    totalAmount: Number(order.totalAmount || 0),
    paymentMethod: order.payment?.method || "EXTERNAL",
    createdAt: order.createdAt,
    status: order.status,
  };
};

const serializeOrderDetail = (order) => {
  const user = order.user && typeof order.user === "object" ? order.user : null;

  return {
    id: String(order._id),
    orderNumber: order.orderNumber,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    status: order.status,
    allowedNextStatuses: getAdminStatusOptions(order),
    items: (order.items || []).map((item) => ({
      productId: item.productId,
      productName: item.productName,
      brand: item.product?.brand || "-",
      imageUrl: item.imageUrl || "",
      size: item.size,
      quantity: Number(item.quantity || 0),
      unitPrice: Number(item.unitPrice || 0),
      lineAmount: Number(item.lineAmount || 0),
    })),
    productAmount: Number(order.productAmount || 0),
    discountAmount: Number(order.discountAmount || 0),
    deliveryFee: Number(order.deliveryFee || 0),
    totalAmount: Number(order.totalAmount || 0),
    payment: {
      method: order.payment?.method || "EXTERNAL",
      status: order.payment?.status || "READY",
      paidAmount: Number(order.payment?.paidAmount || 0),
      approvedAt: order.payment?.approvedAt || null,
    },
    buyer: {
      name: user?.name || "알 수 없음",
      email: user?.userId || "",
      phoneNumber: user?.phoneNumber || "",
    },
    delivery: {
      recipientName: order.delivery?.recipientName || "",
      phoneNumber: order.delivery?.phoneNumber || "",
      postalCode: order.delivery?.postalCode || "",
      address: order.delivery?.address || "",
      addressDetail: order.delivery?.addressDetail || "",
    },
    customerRequest: order.delivery?.deliveryMemo || "",
    adminMemo: order.adminMemo || "",
    adminMemoUpdatedAt: order.adminMemoUpdatedAt || null,
    statusHistory: getOrderHistory(order),
  };
};

export const getAdminOrders = async (req, res, next) => {
  try {
    const page = getPositiveInteger(req.query.page, 1, Number.MAX_SAFE_INTEGER);
    const limit = getPositiveInteger(req.query.limit, DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);
    const keyword = String(req.query.keyword || "").trim();
    const searchType = ["orderNumber", "buyerName", "buyerEmail"].includes(req.query.searchType)
      ? req.query.searchType
      : "orderNumber";
    const filter = { abandonedAt: null, status: { $ne: "PAYMENT_PENDING" } };
    const status = String(req.query.status || "");
    const startDate = parseKoreanDate(req.query.startDate);
    const endDate = parseKoreanDate(req.query.endDate);

    if (orderStatuses.includes(status)) filter.status = status;

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = startDate;
      if (endDate) filter.createdAt.$lt = new Date(endDate.getTime() + DAY_IN_MILLISECONDS);
    }

    if (keyword) {
      const searchExpression = { $regex: escapeRegularExpression(keyword), $options: "i" };

      if (searchType === "orderNumber") {
        filter.orderNumber = searchExpression;
      } else {
        const userField = searchType === "buyerName" ? "name" : "userId";
        const users = await User.find({ [userField]: searchExpression }).select("_id").lean();
        filter.user = { $in: users.map((user) => user._id) };
      }
    }

    const now = new Date();
    const { year, month, day } = getKoreanDateParts(now);
    const todayStart = createKoreanMidnight(year, month, day);
    const tomorrowStart = new Date(todayStart.getTime() + DAY_IN_MILLISECONDS);
    const paidFilter = { "payment.status": "PAID", status: { $ne: "CANCELED" } };
    const [todayOrderCount, preparingOrderCount, shippedOrderCount, matchingOrderCount] = await Promise.all([
      Order.countDocuments({ ...paidFilter, createdAt: { $gte: todayStart, $lt: tomorrowStart } }),
      Order.countDocuments({ "payment.status": "PAID", status: { $in: ["PAID", "PREPARING"] } }),
      Order.countDocuments({ "payment.status": "PAID", status: "SHIPPED" }),
      Order.countDocuments(filter),
    ]);
    const totalPages = Math.max(1, Math.ceil(matchingOrderCount / limit));
    const normalizedPage = Math.min(page, totalPages);
    const orders = await Order.find(filter)
      .populate("user", "name userId")
      .populate("items.product", "brand")
      .sort({ createdAt: -1, _id: -1 })
      .skip((normalizedPage - 1) * limit)
      .limit(limit)
      .lean();

    return res.json({
      summary: {
        todayOrderCount,
        preparingOrderCount,
        shippedOrderCount,
      },
      orders: orders.map(serializeOrderListItem),
      pagination: {
        page: normalizedPage,
        limit,
        totalCount: matchingOrderCount,
        totalPages,
      },
    });
  } catch (error) {
    return next(error);
  }
};

export const getAdminOrder = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.orderId)) {
      return res.status(404).json({ message: "주문을 찾을 수 없습니다." });
    }

    const order = await getAdminOrderDocument(req.params.orderId).lean();

    if (!order) {
      return res.status(404).json({ message: "주문을 찾을 수 없습니다." });
    }

    return res.json({ order: serializeOrderDetail(order) });
  } catch (error) {
    return next(error);
  }
};

export const updateAdminOrderStatus = async (req, res, next) => {
  try {
    const nextStatus = String(req.body.status || "");

    if (!mongoose.isValidObjectId(req.params.orderId)) {
      return res.status(404).json({ message: "주문을 찾을 수 없습니다." });
    }

    const order = await getAdminOrderDocument(req.params.orderId);

    if (!order) {
      return res.status(404).json({ message: "주문을 찾을 수 없습니다." });
    }

    if (nextStatus === order.status) {
      return res.json({ order: serializeOrderDetail(order.toObject()) });
    }

    if (!getAdminStatusOptions(order).includes(nextStatus)) {
      return res.status(400).json({ message: "결제 완료된 주문의 상태만 변경할 수 있습니다." });
    }

    order.status = nextStatus;
    order.statusHistory = [...(order.statusHistory || []), { status: nextStatus, changedAt: new Date() }];
    await order.save();

    return res.json({ order: serializeOrderDetail(order.toObject()) });
  } catch (error) {
    return next(error);
  }
};

export const updateAdminOrderMemo = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.orderId)) {
      return res.status(404).json({ message: "주문을 찾을 수 없습니다." });
    }

    const adminMemo = String(req.body.adminMemo || "").trim();

    if (!adminMemo) {
      return res.status(400).json({ message: "관리자 메모를 입력해주세요." });
    }

    if (adminMemo.length > 1000) {
      return res.status(400).json({ message: "관리자 메모는 1,000자 이하로 입력해주세요." });
    }

    const order = await getAdminOrderDocument(req.params.orderId);

    if (!order) {
      return res.status(404).json({ message: "주문을 찾을 수 없습니다." });
    }

    order.adminMemo = adminMemo;
    order.adminMemoUpdatedAt = new Date();
    await order.save();

    return res.json({ order: serializeOrderDetail(order.toObject()) });
  } catch (error) {
    return next(error);
  }
};

export const cancelAdminOrder = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.orderId)) {
      return res.status(404).json({ message: "주문을 찾을 수 없습니다." });
    }

    const order = await getAdminOrderDocument(req.params.orderId);

    if (!order) {
      return res.status(404).json({ message: "주문을 찾을 수 없습니다." });
    }

    const { warning } = await cancelOrderWithRefund(order, "관리자 주문 취소", {
      allowedOrderStatuses: adminCancellableStatuses,
    });

    return res.json({
      order: serializeOrderDetail(order.toObject()),
      warning,
    });
  } catch (error) {
    return next(error);
  }
};
