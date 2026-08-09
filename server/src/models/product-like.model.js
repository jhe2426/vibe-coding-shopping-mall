import mongoose from "mongoose";

const { Schema, model } = mongoose;

const productLikeSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "좋아요 사용자는 필수입니다."],
      index: true,
    },
    product: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: [true, "좋아요 상품은 필수입니다."],
      index: true,
    },
    productId: {
      type: String,
      required: [true, "상품 아이디는 필수입니다."],
      trim: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON: {
      virtuals: true,
      transform(_document, returnedObject) {
        returnedObject.id = returnedObject._id.toString();
        delete returnedObject._id;
      },
    },
  },
);

// 한 사용자는 하나의 상품에 좋아요를 한 번만 등록할 수 있습니다.
productLikeSchema.index({ user: 1, product: 1 }, { unique: true });

const ProductLike = model("ProductLike", productLikeSchema);

export default ProductLike;
