import mongoose from "mongoose";

const { Schema, model } = mongoose;

const productQuestionSchema = new Schema(
  {
    productId: {
      type: String,
      required: [true, "상품 아이디는 필수입니다."],
      trim: true,
      index: true,
    },
    author: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "문의 작성자는 필수입니다."],
    },
    authorName: {
      type: String,
      required: [true, "문의 작성자명은 필수입니다."],
      trim: true,
      maxlength: [30, "작성자명은 30자 이하여야 합니다."],
    },
    title: {
      type: String,
      required: [true, "문의 제목은 필수입니다."],
      trim: true,
      maxlength: [60, "문의 제목은 60자 이하여야 합니다."],
    },
    content: {
      type: String,
      required: [true, "문의 내용은 필수입니다."],
      trim: true,
      maxlength: [1000, "문의 내용은 1,000자 이하여야 합니다."],
    },
    isSecret: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON: {
      transform(_document, returnedObject) {
        returnedObject.id = returnedObject._id.toString();
        delete returnedObject._id;
        delete returnedObject.__v;
      },
    },
  },
);

productQuestionSchema.index({ productId: 1, createdAt: -1 });

const ProductQuestion = model("ProductQuestion", productQuestionSchema);

export default ProductQuestion;
