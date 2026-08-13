import mongoose from "mongoose";

const { Schema, model } = mongoose;

/**
 * 사이즈별 재고 스키마
 */
const sizeSchema = new Schema(
  {
    size: {
      type: Number,
      required: [true, "상품 사이즈는 필수입니다."],
      min: [100, "올바른 상품 사이즈를 입력해주세요."],
    },

    stockQuantity: {
      type: Number,
      required: [true, "재고 수량은 필수입니다."],
      min: [0, "재고 수량은 0보다 작을 수 없습니다."],
      default: 0,
    },
  },
  {
    _id: false,
  },
);

/**
 * 상품 상세 페이지 이미지 스키마
 */
const detailImageSchema = new Schema(
  {
    imageUrl: {
      type: String,
      required: [true, "상세 이미지 주소는 필수입니다."],
      trim: true,
    },

    altText: {
      type: String,
      trim: true,
      default: "",
    },

    displayOrder: {
      type: Number,
      required: true,
      min: 1,
    },
  },
  {
    _id: false,
  },
);

/**
 * 상품 스키마
 */
const productSchema = new Schema(
  {
    /**
     * 상품 고유 아이디
     */
    productId: {
      type: String,
      required: [true, "상품 아이디는 필수입니다."],
      unique: true,
      trim: true,
    },

    /**
     * 상품명
     */
    name: {
      type: String,
      required: [true, "상품 이름은 필수입니다."],
      trim: true,
      maxlength: [100, "상품 이름은 100자 이하여야 합니다."],
      index: true,
    },

    /**
     * 브랜드
     */
    brand: {
      type: String,
      required: [true, "상품 브랜드는 필수입니다."],
      trim: true,
      maxlength: [50, "상품 브랜드는 50자 이하여야 합니다."],
      index: true,
    },

    /**
     * 정상 가격
     */
    regularPrice: {
      type: Number,
      required: [true, "정상 가격은 필수입니다."],
      min: [0, "정상 가격은 0보다 작을 수 없습니다."],
    },

    /**
     * 할인 가격
     */
    salePrice: {
      type: Number,
      min: [0, "할인 가격은 0보다 작을 수 없습니다."],
      default: null,
    },

    /**
     * 할인 시작 일시
     */
    saleStartAt: {
      type: Date,
      default: null,
    },

    /**
     * 할인 종료 일시
     */
    saleEndAt: {
      type: Date,
      default: null,
    },

    /**
     * MEN / WOMEN 메뉴 구분
     */
    targetGender: {
      type: String,
      enum: {
        values: ["MEN", "WOMEN", "UNISEX"],
        message: "올바른 대상 성별이 아닙니다.",
      },
      required: [true, "대상 성별은 필수입니다."],
      index: true,
    },

    /**
     * 상품 카테고리
     */
    category: {
      type: String,
      enum: {
        values: ["SNEAKERS", "SPORTS", "SANDALS", "DRESS_SHOES", "CASUAL"],
        message: "올바른 상품 카테고리가 아닙니다.",
      },
      required: [true, "상품 카테고리는 필수입니다."],
      index: true,
    },

    /**
     * 메인 추천 상품 노출 여부
     */
    isRecommended: {
      type: Boolean,
      default: false,
      index: true,
    },

    /**
     * 상품이 포함된 컬렉션
     */
    collections: {
      type: [String],
      default: [],
      index: true,
    },

    /**
     * 상품 목록 카드 이미지
     */
    cardImages: {
      defaultImage: {
        type: String,
        required: [true, "상품 카드 기본 이미지는 필수입니다."],
        trim: true,
      },

      hoverImage: {
        type: String,
        required: [true, "상품 카드 호버 이미지는 필수입니다."],
        trim: true,
      },
    },

    /**
     * 사이즈별 재고
     */
    sizes: {
      type: [sizeSchema],
      required: [true, "상품 사이즈 정보는 필수입니다."],
      validate: {
        validator(sizes) {
          if (!Array.isArray(sizes) || sizes.length === 0) {
            return false;
          }

          const sizeSet = new Set(sizes.map((sizeItem) => sizeItem.size));

          return sizeSet.size === sizes.length;
        },
        message: "사이즈는 하나 이상 등록해야 하며 같은 사이즈를 중복 등록할 수 없습니다.",
      },
    },

    /**
     * 상품 상세 페이지 이미지
     */
    detailImages: {
      type: [detailImageSchema],
      default: [],
    },

    /**
     * 상품 판매 상태
     */
    status: {
      type: String,
      enum: {
        values: ["SELLING", "HIDDEN", "STOPPED"],
        message: "올바른 상품 판매 상태가 아닙니다.",
      },
      default: "SELLING",
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

/**
 * 할인 정보 검증
 */
productSchema.pre("validate", function () {
  const hasSalePrice = this.salePrice !== null;

  if (hasSalePrice && this.regularPrice !== undefined && this.salePrice > this.regularPrice) {
    throw new Error("판매 가격은 정상 가격보다 높을 수 없습니다.");
  }

  const hasSaleStartAt = this.saleStartAt !== null;
  const hasSaleEndAt = this.saleEndAt !== null;

  if (hasSaleStartAt !== hasSaleEndAt) {
    throw new Error("할인 시작 일시와 할인 종료 일시는 함께 입력해야 합니다.");
  }

  if (hasSaleStartAt && hasSaleEndAt && this.saleEndAt <= this.saleStartAt) {
    throw new Error("할인 종료 일시는 할인 시작 일시보다 이후여야 합니다.");
  }

  if ((hasSaleStartAt || hasSaleEndAt) && !hasSalePrice) {
    throw new Error("할인 기간을 설정하려면 할인 가격도 입력해야 합니다.");
  }
});

/**
 * 자주 사용하는 조회 조건을 위한 복합 인덱스
 */
productSchema.index({
  brand: 1,
  targetGender: 1,
  category: 1,
  status: 1,
});

/**
 * 할인 상품 조회를 위한 인덱스
 */
productSchema.index({
  status: 1,
  saleStartAt: 1,
  saleEndAt: 1,
});

const Product = model("Product", productSchema);

export default Product;
