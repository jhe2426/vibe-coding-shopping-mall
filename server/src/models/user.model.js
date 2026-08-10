import mongoose from "mongoose";

const deliveryAddressSchema = new mongoose.Schema(
  {
    label: {
      type: String,
      trim: true,
      default: "배송지",
      maxlength: 30,
    },
    recipientName: {
      type: String,
      required: [true, "수령인 이름은 필수입니다."],
      trim: true,
    },
    phoneNumber: {
      type: String,
      required: [true, "수령인 연락처는 필수입니다."],
      trim: true,
    },
    postalCode: {
      type: String,
      required: [true, "우편번호는 필수입니다."],
      trim: true,
    },
    address: {
      type: String,
      required: [true, "기본 주소는 필수입니다."],
      trim: true,
    },
    addressDetail: {
      type: String,
      default: "",
      trim: true,
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

const userSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: [true, "아이디는 필수입니다."],
      unique: true,
      lowercase: true,
      trim: true,
    },
    name: {
      type: String,
      required: [true, "이름은 필수입니다."],
      trim: true,
    },
    password: {
      type: String,
      required: [true, "비밀번호는 필수입니다."],
      select: false,
    },
    phoneNumber: {
      type: String,
      required: [true, "전화번호는 필수입니다."],
      trim: true,
    },
    userType: {
      type: String,
      required: [true, "유저 타입은 필수입니다."],
      enum: {
        values: ["admin", "customer"],
        message: "유저 타입은 admin 또는 customer만 가능합니다.",
      },
    },
    address: {
      type: String,
      trim: true,
      default: "",
    },
    deliveryAddresses: {
      type: [deliveryAddressSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  },
);

const User = mongoose.model("User", userSchema);

export default User;
