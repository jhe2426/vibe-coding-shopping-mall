import mongoose from "mongoose";

const { Schema, model } = mongoose;

const cartItemSchema = new Schema(
  {
    product: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: [true, "장바구니 상품은 필수입니다."],
    },
    productId: {
      type: String,
      required: [true, "상품 아이디는 필수입니다."],
      trim: true,
    },
    size: {
      type: Number,
      required: [true, "선택한 사이즈는 필수입니다."],
      min: [100, "올바른 상품 사이즈를 선택해주세요."],
    },
    unitPrice: {
      type: Number,
      required: [true, "상품 단가는 필수입니다."],
      min: [0, "상품 단가는 0원 이상이어야 합니다."],
    },
    quantity: {
      type: Number,
      required: [true, "상품 수량은 필수입니다."],
      min: [1, "상품 수량은 1개 이상이어야 합니다."],
      max: [99, "상품 수량은 99개 이하여야 합니다."],
      default: 1,
    },
  },
  {
    timestamps: true,
  },
);

const cartSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "장바구니 사용자는 필수입니다."],
      unique: true,
      index: true,
    },
    items: {
      type: [cartItemSchema],
      default: [],
    },
    totalAmount: {
      type: Number,
      required: true,
      min: [0, "장바구니 총액은 0원 이상이어야 합니다."],
      default: 0,
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

// 같은 상품의 같은 사이즈는 장바구니에 한 줄만 유지합니다.
cartSchema.pre("validate", function () {
  const itemKeys = this.items.map((item) => `${item.productId}:${item.size}`);

  if (new Set(itemKeys).size !== itemKeys.length) {
    throw new Error("같은 상품과 사이즈는 장바구니에 중복으로 담을 수 없습니다.");
  }

  this.totalAmount = this.items.reduce(
    (total, item) => total + item.unitPrice * item.quantity,
    0,
  );
});

const Cart = model("Cart", cartSchema);

export default Cart;
