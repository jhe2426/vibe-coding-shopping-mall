import mongoose from "mongoose";

const { Schema, model } = mongoose;

const productReviewSchema = new Schema(
  {
    order: {
      type: Schema.Types.ObjectId,
      ref: "Order",
      required: [true, "주문 정보는 필수입니다."],
      index: true,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "리뷰 작성자는 필수입니다."],
      index: true,
    },
    product: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: [true, "상품 정보는 필수입니다."],
    },
    productId: {
      type: String,
      required: [true, "상품 아이디는 필수입니다."],
      trim: true,
      index: true,
    },
    size: {
      type: Number,
      required: [true, "구매 사이즈는 필수입니다."],
    },
    rating: {
      type: Number,
      required: [true, "별점은 필수입니다."],
      min: [1, "별점은 1점 이상이어야 합니다."],
      max: [5, "별점은 5점 이하여야 합니다."],
    },
    content: {
      type: String,
      required: [true, "리뷰 내용은 필수입니다."],
      trim: true,
      maxlength: [1000, "리뷰 내용은 1,000자 이하여야 합니다."],
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

// 하나의 주문 상품은 한 번만 리뷰를 작성할 수 있습니다.
productReviewSchema.index({ order: 1, product: 1, size: 1 }, { unique: true });
productReviewSchema.index({ productId: 1, createdAt: -1 });

const ProductReview = model("ProductReview", productReviewSchema);

export default ProductReview;
