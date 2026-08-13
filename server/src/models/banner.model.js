import mongoose from "mongoose";

const { Schema, model } = mongoose;

const bannerSchema = new Schema(
  {
    imageUrl: {
      type: String,
      required: [true, "배너 이미지는 필수입니다."],
      trim: true,
    },
    eyebrow: {
      type: String,
      trim: true,
      maxlength: [40, "상단 문구는 40자 이하여야 합니다."],
      default: "",
    },
    title: {
      type: String,
      required: [true, "배너 제목은 필수입니다."],
      trim: true,
      maxlength: [80, "배너 제목은 80자 이하여야 합니다."],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [120, "설명은 120자 이하여야 합니다."],
      default: "",
    },
    buttonLabel: {
      type: String,
      trim: true,
      maxlength: [20, "버튼 문구는 20자 이하여야 합니다."],
      default: "구매하기",
    },
    linkedProductId: {
      type: String,
      required: [true, "연결할 상품을 선택해주세요."],
      trim: true,
      index: true,
    },
    displayOrder: {
      type: Number,
      required: [true, "노출 순서를 입력해주세요."],
      min: [1, "노출 순서는 1 이상이어야 합니다."],
      default: 1,
    },
    isVisible: {
      type: Boolean,
      default: true,
      index: true,
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

bannerSchema.index({ isVisible: 1, displayOrder: 1, createdAt: -1 });

const Banner = model("Banner", bannerSchema);

export default Banner;
