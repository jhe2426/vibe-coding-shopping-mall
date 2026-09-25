import Order from "../models/order.model.js";
import Product from "../models/product.model.js";
import User from "../models/user.model.js";

const KOREA_TIME_ZONE = "Asia/Seoul";
const DAY_IN_MILLISECONDS = 24 * 60 * 60 * 1000;
const LOW_STOCK_THRESHOLD = 10;
const paidOrderFilter = {
  "payment.status": "PAID",
  status: { $ne: "CANCELED" },
};
const koreanDateFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: KOREA_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const getKoreanDateParts = (date) => Object.fromEntries(
  koreanDateFormatter
    .formatToParts(date)
    .filter((part) => ["year", "month", "day"].includes(part.type))
    .map((part) => [part.type, Number(part.value)]),
);

const createKoreanMidnight = (year, month, day) => new Date(
  `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}T00:00:00+09:00`,
);

const createDateRange = (start, end) => ({ createdAt: { $gte: start, $lt: end } });

const sumSales = async (start, end) => {
  const [result] = await Order.aggregate([
    { $match: { ...paidOrderFilter, ...createDateRange(start, end) } },
    { $group: { _id: null, totalAmount: { $sum: "$totalAmount" } } },
  ]);

  return Number(result?.totalAmount || 0);
};

const buildTrend = (currentValue, previousValue, description) => {
  if (previousValue === 0) {
    return {
      direction: currentValue > 0 ? "up" : "neutral",
      label: currentValue > 0 ? "신규" : "변동 없음",
      description,
    };
  }

  const difference = currentValue - previousValue;
  const percentage = Math.abs((difference / previousValue) * 100).toFixed(1);

  return {
    direction: difference > 0 ? "up" : difference < 0 ? "down" : "neutral",
    label: `${percentage}%`,
    description,
  };
};

const getOrderSummary = (order) => {
  const firstItem = order.items?.[0] || {};
  const product = firstItem.product && typeof firstItem.product === "object" ? firstItem.product : null;

  return {
    id: String(order._id),
    orderNumber: order.orderNumber,
    buyerName: order.user?.name || order.delivery?.recipientName || "알 수 없음",
    productName: firstItem.productName || "상품 정보 없음",
    imageUrl: firstItem.imageUrl || "",
    size: firstItem.size || null,
    quantity: firstItem.quantity || 0,
    brand: product?.brand || "-",
    totalAmount: Number(order.totalAmount || 0),
    createdAt: order.createdAt,
    status: order.status,
  };
};

// 관리자 HOME에 필요한 데이터를 한 번에 집계합니다.
export const getAdminDashboard = async (_req, res, next) => {
  try {
    const now = new Date();
    const { year, month, day } = getKoreanDateParts(now);
    const todayStart = createKoreanMidnight(year, month, day);
    const tomorrowStart = new Date(todayStart.getTime() + DAY_IN_MILLISECONDS);
    const recentSevenDaysStart = new Date(todayStart.getTime() - (6 * DAY_IN_MILLISECONDS));
    const previousSevenDaysStart = new Date(recentSevenDaysStart.getTime() - (7 * DAY_IN_MILLISECONDS));
    const nextMonthYear = month === 12 ? year + 1 : year;
    const nextMonth = month === 12 ? 1 : month + 1;
    const monthStart = createKoreanMidnight(year, month, 1);
    const nextMonthStart = createKoreanMidnight(nextMonthYear, nextMonth, 1);
    const daysInMonth = Math.round((nextMonthStart.getTime() - monthStart.getTime()) / DAY_IN_MILLISECONDS);

    const [
      totalMemberCount,
      recentMemberCount,
      previousMemberCount,
      todayOrderCount,
      recentOrderCount,
      previousOrderCount,
      todaySalesAmount,
      recentSalesAmount,
      previousSalesAmount,
      soldOutProducts,
      recentMembers,
      recentOrders,
      lowStockItems,
      dailySalesRows,
    ] = await Promise.all([
      User.countDocuments({ userType: "customer" }),
      User.countDocuments({ userType: "customer", ...createDateRange(recentSevenDaysStart, tomorrowStart) }),
      User.countDocuments({ userType: "customer", ...createDateRange(previousSevenDaysStart, recentSevenDaysStart) }),
      Order.countDocuments({ ...paidOrderFilter, ...createDateRange(todayStart, tomorrowStart) }),
      Order.countDocuments({ ...paidOrderFilter, ...createDateRange(recentSevenDaysStart, tomorrowStart) }),
      Order.countDocuments({ ...paidOrderFilter, ...createDateRange(previousSevenDaysStart, recentSevenDaysStart) }),
      sumSales(todayStart, tomorrowStart),
      sumSales(recentSevenDaysStart, tomorrowStart),
      sumSales(previousSevenDaysStart, recentSevenDaysStart),
      Product.aggregate([
        { $match: { status: "SELLING" } },
        { $project: { totalStockQuantity: { $sum: "$sizes.stockQuantity" } } },
        { $match: { totalStockQuantity: 0 } },
        { $count: "count" },
      ]),
      User.find({ userType: "customer" })
        .select("name userId phoneNumber createdAt deliveryAddresses")
        .sort({ createdAt: -1 })
        .limit(20)
        .lean(),
      Order.find({ abandonedAt: null, status: { $ne: "PAYMENT_PENDING" } })
        .populate("user", "name userId")
        .populate("items.product", "brand")
        .sort({ createdAt: -1 })
        .limit(20)
        .lean(),
      Product.aggregate([
        { $match: { status: "SELLING" } },
        { $unwind: "$sizes" },
        { $match: { "sizes.stockQuantity": { $lte: LOW_STOCK_THRESHOLD } } },
        { $sort: { "sizes.stockQuantity": 1, updatedAt: -1 } },
        { $limit: 20 },
        {
          $project: {
            _id: 0,
            productId: 1,
            name: 1,
            brand: 1,
            imageUrl: "$cardImages.defaultImage",
            size: "$sizes.size",
            stockQuantity: "$sizes.stockQuantity",
          },
        },
      ]),
      Order.aggregate([
        { $match: { ...paidOrderFilter, ...createDateRange(monthStart, nextMonthStart) } },
        {
          $group: {
            _id: {
              $dayOfMonth: {
                date: "$createdAt",
                timezone: KOREA_TIME_ZONE,
              },
            },
            amount: { $sum: "$totalAmount" },
          },
        },
      ]),
    ]);

    const dailySalesByDay = new Map(dailySalesRows.map((row) => [Number(row._id), Number(row.amount || 0)]));
    const dailySales = Array.from({ length: daysInMonth }, (_value, index) => ({
      day: index + 1,
      amount: dailySalesByDay.get(index + 1) || 0,
    }));

    return res.json({
      summary: {
        totalMemberCount,
        todayOrderCount,
        todaySalesAmount,
        soldOutProductCount: Number(soldOutProducts[0]?.count || 0),
        trends: {
          members: buildTrend(recentMemberCount, previousMemberCount, "이전 7일 대비"),
          orders: buildTrend(recentOrderCount, previousOrderCount, "이전 7일 대비"),
          sales: buildTrend(recentSalesAmount, previousSalesAmount, "이전 7일 대비"),
          soldOut: {
            direction: "neutral",
            label: "현재 재고 기준",
            description: "판매중 상품",
          },
        },
      },
      recentMembers: recentMembers.map((member) => ({
        id: String(member._id),
        name: member.name,
        email: member.userId,
        phoneNumber: member.phoneNumber,
        createdAt: member.createdAt,
        deliveryAddressCount: member.deliveryAddresses?.length || 0,
      })),
      monthlySales: {
        year,
        month,
        dailySales,
      },
      recentOrders: recentOrders.map(getOrderSummary),
      lowStockItems,
    });
  } catch (error) {
    return next(error);
  }
};
