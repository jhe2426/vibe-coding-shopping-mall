import mongoose from "mongoose";

import Order from "../models/order.model.js";
import ProductReview from "../models/product-review.model.js";

const maskAuthorName = (authorName) => {
  const name = String(authorName || "").trim();

  if (name.length <= 1) return "*";
  return `${name.slice(0, 1)}${"*".repeat(name.length - 1)}`;
};

const serializeReview = (review) => {
  const user = review.user && typeof review.user === "object" ? review.user : null;

  return {
    id: String(review._id),
    orderId: String(review.order),
    productId: review.productId,
    size: review.size,
    rating: review.rating,
    content: review.content,
    authorName: maskAuthorName(user?.name),
    createdAt: review.createdAt,
  };
};

const getReviewInput = (body = {}) => {
  const productId = String(body.productId || "").trim();
  const size = Number(body.size);
  const rating = Number(body.rating);
  const content = String(body.content || "").trim();

  if (!productId || !Number.isInteger(size)) {
    const error = new Error("리뷰를 작성할 주문 상품 정보가 올바르지 않습니다.");
    error.status = 400;
    throw error;
  }

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    const error = new Error("별점은 1점부터 5점까지 선택해주세요.");
    error.status = 400;
    throw error;
  }

  if (!content) {
    const error = new Error("리뷰 내용을 입력해주세요.");
    error.status = 400;
    throw error;
  }

  if (content.length > 1000) {
    const error = new Error("리뷰 내용은 1,000자 이하로 입력해주세요.");
    error.status = 400;
    throw error;
  }

  return { productId, size, rating, content };
};

// 누구나 상품별 리뷰 목록을 조회할 수 있습니다.
export const getProductReviews = async (req, res, next) => {
  try {
    const productId = String(req.params.productId || "").trim();

    if (!productId) {
      return res.status(400).json({ message: "상품 아이디가 필요합니다." });
    }

    const reviews = await ProductReview.find({ productId })
      .populate("user", "name")
      .sort({ createdAt: -1 });

    return res.json({ reviews: reviews.map(serializeReview) });
  } catch (error) {
    return next(error);
  }
};

// 주문 내역의 작성 완료 여부를 표시하기 위해 내 리뷰 목록을 조회합니다.
export const getMyProductReviews = async (req, res, next) => {
  try {
    const reviews = await ProductReview.find({ user: req.authUser.id }).select("order productId size");

    return res.json({
      reviews: reviews.map((review) => ({
        orderId: String(review.order),
        productId: review.productId,
        size: review.size,
      })),
    });
  } catch (error) {
    return next(error);
  }
};

// 배송 완료된 본인 주문 상품에만 리뷰를 한 번 작성할 수 있습니다.
export const createProductReview = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.body.orderId)) {
      return res.status(404).json({ message: "주문을 찾을 수 없습니다." });
    }

    const { productId, size, rating, content } = getReviewInput(req.body);
    const order = await Order.findOne({
      _id: req.body.orderId,
      user: req.authUser.id,
      status: "DELIVERED",
    });

    if (!order) {
      return res.status(403).json({ message: "배송 완료된 본인 주문의 상품만 리뷰를 작성할 수 있습니다." });
    }

    const orderItem = order.items.find((item) => (
      item.productId === productId && Number(item.size) === size
    ));

    if (!orderItem) {
      return res.status(403).json({ message: "해당 주문에 포함되지 않은 상품입니다." });
    }

    const existingReview = await ProductReview.exists({
      order: order._id,
      product: orderItem.product,
      size: orderItem.size,
    });

    if (existingReview) {
      return res.status(409).json({ message: "이미 이 상품의 리뷰를 작성했습니다." });
    }

    const review = await ProductReview.create({
      order: order._id,
      user: req.authUser.id,
      product: orderItem.product,
      productId: orderItem.productId,
      size: orderItem.size,
      rating,
      content,
    });
    await review.populate("user", "name");

    return res.status(201).json({ review: serializeReview(review) });
  } catch (error) {
    return next(error);
  }
};
