import mongoose from "mongoose";

import ProductLike from "../models/product-like.model.js";
import Product from "../models/product.model.js";

const buildProductFilter = (id) => (
  mongoose.isValidObjectId(id) ? { _id: id } : { productId: id }
);

const serializeLike = (like) => ({
  id: like._id.toString(),
  productId: like.productId,
  product: like.product?.toJSON?.() || like.product,
  createdAt: like.createdAt,
});

const findProduct = (id) => Product.findOne(buildProductFilter(id));

const ensureProductCanBeLiked = (product) => {
  if (product.status !== "SELLING") {
    const error = new Error("판매 중지된 상품은 찜할 수 없습니다.");
    error.status = 400;
    throw error;
  }
};

// 로그인한 사용자가 좋아요한 상품 전체를 조회합니다.
export const getProductLikes = async (req, res, next) => {
  try {
    const likes = await ProductLike.find({ user: req.authUser.id })
      .populate("product")
      .sort({ createdAt: -1 });

    return res.json(likes.map(serializeLike));
  } catch (error) {
    return next(error);
  }
};

// 특정 상품의 좋아요 여부를 조회합니다.
export const getProductLike = async (req, res, next) => {
  try {
    const product = await findProduct(req.params.productId);

    if (!product) {
      return res.status(404).json({ message: "상품을 찾을 수 없습니다." });
    }

    const like = await ProductLike.findOne({ user: req.authUser.id, product: product._id });

    return res.json({ liked: Boolean(like), like: like ? serializeLike(like) : null });
  } catch (error) {
    return next(error);
  }
};

// 상품에 좋아요를 등록합니다.
export const createProductLike = async (req, res, next) => {
  try {
    const product = await findProduct(req.body.productId);

    if (!product) {
      return res.status(404).json({ message: "상품을 찾을 수 없습니다." });
    }

    ensureProductCanBeLiked(product);

    const existingLike = await ProductLike.findOne({ user: req.authUser.id, product: product._id });

    if (existingLike) {
      return res.status(409).json({ message: "이미 좋아요한 상품입니다." });
    }

    const like = await ProductLike.create({
      user: req.authUser.id,
      product: product._id,
      productId: product.productId,
    });

    return res.status(201).json({ liked: true, like: serializeLike(like) });
  } catch (error) {
    return next(error);
  }
};

// 좋아요 상태를 true 또는 false로 설정합니다.
export const updateProductLike = async (req, res, next) => {
  try {
    const product = await findProduct(req.params.productId);

    if (!product) {
      return res.status(404).json({ message: "상품을 찾을 수 없습니다." });
    }

    if (typeof req.body.liked !== "boolean") {
      return res.status(400).json({ message: "liked 값은 true 또는 false여야 합니다." });
    }

    if (!req.body.liked) {
      await ProductLike.deleteOne({ user: req.authUser.id, product: product._id });
      return res.json({ liked: false, like: null });
    }

    ensureProductCanBeLiked(product);

    const like = await ProductLike.findOneAndUpdate(
      { user: req.authUser.id, product: product._id },
      { $setOnInsert: { productId: product.productId } },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );

    return res.json({ liked: true, like: serializeLike(like) });
  } catch (error) {
    return next(error);
  }
};

// 상품 좋아요를 취소합니다.
export const deleteProductLike = async (req, res, next) => {
  try {
    const product = await findProduct(req.params.productId);

    if (!product) {
      return res.status(404).json({ message: "상품을 찾을 수 없습니다." });
    }

    await ProductLike.deleteOne({ user: req.authUser.id, product: product._id });

    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
};
