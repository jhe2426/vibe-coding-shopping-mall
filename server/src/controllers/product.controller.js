import mongoose from "mongoose";

import Product from "../models/product.model.js";

const buildProductFilter = (id) => {
  if (mongoose.isValidObjectId(id)) {
    return { _id: id };
  }

  return { productId: id };
};

const buildProductListFilter = (query) => {
  const filter = {};
  const filterKeys = ["brand", "targetGender", "category", "activity", "status"];

  filterKeys.forEach((key) => {
    if (query[key]) {
      filter[key] = query[key];
    }
  });

  if (query.collection) {
    filter.collections = query.collection;
  }

  return filter;
};

// 새 상품을 생성합니다.
export const createProduct = async (req, res, next) => {
  try {
    const product = await Product.create(req.body);

    return res.status(201).json(product);
  } catch (error) {
    return next(error);
  }
};

// 전체 상품 목록을 조회합니다.
export const getProducts = async (req, res, next) => {
  try {
    const products = await Product.find(buildProductListFilter(req.query)).sort({ createdAt: -1 });

    return res.json(products);
  } catch (error) {
    return next(error);
  }
};

// 특정 상품을 MongoDB _id 또는 productId로 조회합니다.
export const getProduct = async (req, res, next) => {
  try {
    const product = await Product.findOne(buildProductFilter(req.params.id));

    if (!product) {
      return res.status(404).json({
        message: "상품을 찾을 수 없습니다.",
      });
    }

    return res.json(product);
  } catch (error) {
    return next(error);
  }
};

// 특정 상품 정보를 수정합니다.
export const updateProduct = async (req, res, next) => {
  try {
    const product = await Product.findOne(buildProductFilter(req.params.id));

    if (!product) {
      return res.status(404).json({
        message: "상품을 찾을 수 없습니다.",
      });
    }

    product.set(req.body);
    await product.save();

    return res.json(product);
  } catch (error) {
    return next(error);
  }
};

// 특정 상품을 삭제합니다.
export const deleteProduct = async (req, res, next) => {
  try {
    const product = await Product.findOneAndDelete(buildProductFilter(req.params.id));

    if (!product) {
      return res.status(404).json({
        message: "상품을 찾을 수 없습니다.",
      });
    }

    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
};
