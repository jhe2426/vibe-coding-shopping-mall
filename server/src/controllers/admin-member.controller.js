import Order from "../models/order.model.js";
import User from "../models/user.model.js";

const KOREA_TIME_ZONE = "Asia/Seoul";
const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 50;
const searchFieldByType = {
  name: "name",
  email: "userId",
  phoneNumber: "phoneNumber",
};
const koreanMonthFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: KOREA_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
});

const getPositiveInteger = (value, defaultValue, maximum) => {
  const parsedValue = Number(value);

  if (!Number.isInteger(parsedValue) || parsedValue < 1) return defaultValue;
  return Math.min(parsedValue, maximum);
};

const escapeRegularExpression = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const getCurrentKoreanMonthStart = () => {
  const parts = Object.fromEntries(
    koreanMonthFormatter
      .formatToParts(new Date())
      .filter((part) => ["year", "month"].includes(part.type))
      .map((part) => [part.type, part.value]),
  );

  return new Date(`${parts.year}-${parts.month}-01T00:00:00+09:00`);
};

export const getAdminMembers = async (req, res, next) => {
  try {
    const searchType = searchFieldByType[req.query.searchType] ? req.query.searchType : "name";
    const keyword = String(req.query.keyword || "").trim();
    const page = getPositiveInteger(req.query.page, 1, Number.MAX_SAFE_INTEGER);
    const limit = getPositiveInteger(req.query.limit, DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);
    const filter = { userType: "customer" };

    if (keyword) {
      filter[searchFieldByType[searchType]] = {
        $regex: escapeRegularExpression(keyword),
        $options: "i",
      };
    }

    const currentMonthStart = getCurrentKoreanMonthStart();
    const [totalMemberCount, monthlyNewMemberCount, matchingMemberCount] = await Promise.all([
      User.countDocuments({ userType: "customer" }),
      User.countDocuments({ userType: "customer", createdAt: { $gte: currentMonthStart } }),
      User.countDocuments(filter),
    ]);
    const totalPages = Math.max(1, Math.ceil(matchingMemberCount / limit));
    const normalizedPage = Math.min(page, totalPages);
    const members = await User.find(filter)
      .select("name userId phoneNumber createdAt deliveryAddresses")
      .sort({ createdAt: -1, _id: -1 })
      .skip((normalizedPage - 1) * limit)
      .limit(limit)
      .lean();

    const memberIds = members.map((member) => member._id);
    const orderCounts = memberIds.length === 0
      ? []
      : await Order.aggregate([
        {
          $match: {
            user: { $in: memberIds },
            "payment.status": "PAID",
            status: { $ne: "CANCELED" },
          },
        },
        { $group: { _id: "$user", count: { $sum: 1 } } },
      ]);
    const orderCountByUserId = new Map(orderCounts.map((item) => [String(item._id), Number(item.count || 0)]));
    return res.json({
      summary: {
        totalMemberCount,
        monthlyNewMemberCount,
      },
      members: members.map((member) => ({
        id: String(member._id),
        name: member.name,
        email: member.userId,
        phoneNumber: member.phoneNumber,
        createdAt: member.createdAt,
        orderCount: orderCountByUserId.get(String(member._id)) || 0,
        deliveryAddressCount: member.deliveryAddresses?.length || 0,
      })),
      pagination: {
        page: normalizedPage,
        limit,
        totalCount: matchingMemberCount,
        totalPages,
      },
    });
  } catch (error) {
    return next(error);
  }
};
