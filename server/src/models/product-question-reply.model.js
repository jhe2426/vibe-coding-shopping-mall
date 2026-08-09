import mongoose from "mongoose";

const { Schema, model } = mongoose;

const productQuestionReplySchema = new Schema(
  {
    question: {
      type: Schema.Types.ObjectId,
      ref: "ProductQuestion",
      required: [true, "답글 대상 문의는 필수입니다."],
      index: true,
    },
    productId: {
      type: String,
      required: [true, "상품 아이디는 필수입니다."],
      trim: true,
      index: true,
    },
    author: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "답글 작성자는 필수입니다."],
    },
    authorName: {
      type: String,
      required: [true, "답글 작성자명은 필수입니다."],
      trim: true,
      maxlength: [30, "작성자명은 30자 이하여야 합니다."],
    },
    content: {
      type: String,
      required: [true, "답글 내용은 필수입니다."],
      trim: true,
      maxlength: [1000, "답글 내용은 1,000자 이하여야 합니다."],
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

productQuestionReplySchema.index({ question: 1, createdAt: 1 });

const ProductQuestionReply = model("ProductQuestionReply", productQuestionReplySchema);

export default ProductQuestionReply;
