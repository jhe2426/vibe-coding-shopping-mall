import mongoose from "mongoose";

const { Schema, model } = mongoose;

export const BRAND_CATEGORY_VALUES = ["SNEAKERS", "SPORTS", "SANDALS", "DRESS_SHOES", "CASUAL"];

const brandSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, "브랜드 이름은 필수입니다."],
      trim: true,
      maxlength: [50, "브랜드 이름은 50자 이하여야 합니다."],
    },
    normalizedName: {
      type: String,
      required: true,
      unique: true,
      select: false,
    },
    categories: {
      type: [String],
      enum: {
        values: BRAND_CATEGORY_VALUES,
        message: "올바른 브랜드 카테고리가 아닙니다.",
      },
      default: [],
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
        delete returnedObject.normalizedName;
      },
    },
  },
);

brandSchema.pre("validate", function () {
  if (typeof this.name === "string") {
    this.name = this.name.trim();
    this.normalizedName = this.name.toLocaleLowerCase("ko-KR");
  }
});

const Brand = model("Brand", brandSchema);

export default Brand;
