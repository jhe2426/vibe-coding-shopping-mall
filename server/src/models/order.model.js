import mongoose from "mongoose";

const { Schema, model } = mongoose;

const orderItemSchema = new Schema(
  {
    product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    productId: { type: String, required: true, trim: true },
    productName: { type: String, required: true, trim: true },
    imageUrl: { type: String, default: "" },
    size: { type: Number, required: true },
    unitPrice: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1, max: 99 },
    lineAmount: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const deliverySchema = new Schema(
  {
    recipientName: { type: String, required: true, trim: true },
    phoneNumber: { type: String, required: true, trim: true },
    postalCode: { type: String, required: true, trim: true },
    address: { type: String, required: true, trim: true },
    addressDetail: { type: String, default: "", trim: true },
    deliveryMemo: { type: String, default: "", trim: true },
  },
  { _id: false },
);

const paymentSchema = new Schema(
  {
    provider: {
      type: String,
      enum: ["PORTONE"],
      default: "PORTONE",
    },
    method: {
      type: String,
      enum: ["EXTERNAL", "CARD", "BANK_TRANSFER"],
      default: "EXTERNAL",
    },
    status: {
      type: String,
      enum: ["READY", "PAID", "FAILED", "CANCELED", "REFUNDED"],
      default: "READY",
      index: true,
    },
    merchantUid: {
      type: String,
      trim: true,
      required() {
        return this.status === "PAID";
      },
    },
    impUid: {
      type: String,
      trim: true,
      required() {
        return this.status === "PAID";
      },
    },
    pgTid: { type: String, default: "", trim: true },
    paidAmount: {
      type: Number,
      min: 0,
      required() {
        return this.status === "PAID";
      },
    },
    approvedAt: { type: Date, default: null },
  },
  { _id: false },
);

const orderSchema = new Schema(
  {
    orderNumber: { type: String, required: true, unique: true, index: true },
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    items: {
      type: [orderItemSchema],
      validate: {
        validator: (items) => Array.isArray(items) && items.length > 0,
        message: "주문 상품은 하나 이상이어야 합니다.",
      },
    },
    delivery: { type: deliverySchema, required: true },
    productAmount: { type: Number, required: true, min: 0 },
    discountAmount: { type: Number, required: true, min: 0, default: 0 },
    deliveryFee: { type: Number, required: true, min: 0, default: 0 },
    totalAmount: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: ["PAYMENT_PENDING", "PAID", "PREPARING", "SHIPPED", "DELIVERED", "CANCELED"],
      default: "PAYMENT_PENDING",
      index: true,
    },
    payment: { type: paymentSchema, default: () => ({}) },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

// 서버가 최종 금액을 상품 스냅샷 기준으로 계산해 클라이언트 금액 조작을 막습니다.
orderSchema.pre("validate", function () {
  this.items.forEach((item) => {
    item.lineAmount = item.unitPrice * item.quantity;
  });
  this.productAmount = this.items.reduce((total, item) => total + (item.unitPrice * item.quantity), 0);
  this.totalAmount = this.productAmount - this.discountAmount + this.deliveryFee;
});

// 하나의 포트원 거래는 한 주문에만 연결될 수 있습니다.
orderSchema.index({ "payment.impUid": 1 }, { unique: true, sparse: true });

const Order = model("Order", orderSchema);

export default Order;
