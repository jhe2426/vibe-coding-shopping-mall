import mongoose from "mongoose";

import Brand from "../models/brand.model.js";
import Product from "../models/product.model.js";

const getNormalizedBrandName = (name) => String(name ?? "").trim().toLocaleLowerCase("ko-KR");
const escapeRegularExpression = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const serializeProductWithInventory = (product) => {
  const serializedProduct = product.toJSON();
  const totalStockQuantity = (serializedProduct.sizes || []).reduce(
    (total, size) => total + size.stockQuantity,
    0,
  );

  return {
    ...serializedProduct,
    // 기존 품절 데이터는 판매중지 상태로 읽어 새 상태 체계로 자연스럽게 전환한다.
    status: serializedProduct.status === "SOLD_OUT" ? "STOPPED" : serializedProduct.status,
    totalStockQuantity,
    inventoryStatus: totalStockQuantity > 0 ? "IN_STOCK" : "SOLD_OUT",
  };
};

const validateBrandCategory = async (brandName, category) => {
  const brand = await Brand.findOne({ normalizedName: getNormalizedBrandName(brandName) });

  if (!brand) {
    const error = new Error("등록된 브랜드를 선택해주세요.");
    error.status = 400;
    throw error;
  }

  if (!brand.categories.includes(category)) {
    const error = new Error("선택한 브랜드에 등록된 카테고리만 상품에 지정할 수 있습니다.");
    error.status = 400;
    throw error;
  }
};

const buildProductFilter = (id) => {
  if (mongoose.isValidObjectId(id)) {
    return { _id: id };
  }

  return { productId: id };
};

const buildProductListFilter = (query) => {
  const filter = {};
  const filterKeys = ["brand", "targetGender", "category", "status"];

  filterKeys.forEach((key) => {
    if (query[key]) {
      filter[key] = key === "status" && query[key] === "STOPPED"
        ? { $in: ["STOPPED", "SOLD_OUT"] }
        : query[key];
    }
  });

  if (query.collection) {
    filter.collections = query.collection;
  }

  if (query.name) {
    filter.name = {
      $regex: escapeRegularExpression(query.name.trim()),
      $options: "i",
    };
  }

  return filter;
};

const bulkChangeableStatuses = new Set(["SELLING", "STOPPED"]);
const LOW_STOCK_THRESHOLD = 10;

// 새 상품을 생성합니다.
export const createProduct = async (req, res, next) => {
  try {
    await validateBrandCategory(req.body.brand, req.body.category);
    const product = await Product.create(req.body);

    return res.status(201).json(serializeProductWithInventory(product));
  } catch (error) {
    return next(error);
  }
};

// 전체 상품 목록을 조회합니다.
export const getProducts = async (req, res, next) => {
  try {
    const products = await Product.find(buildProductListFilter(req.query)).sort({ createdAt: -1 });
    const serializedProducts = products.map(serializeProductWithInventory);
    const filteredProducts = req.query.inventoryStatus === "SOLD_OUT"
      ? serializedProducts.filter((product) => product.inventoryStatus === "SOLD_OUT")
      : req.query.inventoryStatus === "LOW_STOCK"
        ? serializedProducts.filter((product) => product.sizes.some(
          (size) => size.stockQuantity <= LOW_STOCK_THRESHOLD,
        ))
        : req.query.status === "SELLING"
          ? serializedProducts.filter((product) => product.inventoryStatus === "IN_STOCK")
          : serializedProducts;

    return res.json(filteredProducts);
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

    return res.json(serializeProductWithInventory(product));
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
    await validateBrandCategory(product.brand, product.category);
    await product.save();

    return res.json(serializeProductWithInventory(product));
  } catch (error) {
    return next(error);
  }
};

// 선택한 상품의 판매 상태를 한 번에 변경합니다.
export const updateProductStatuses = async (req, res, next) => {
  try {
    const { productIds, status } = req.body;

    if (!Array.isArray(productIds) || productIds.length === 0) {
      return res.status(400).json({
        message: "변경할 상품을 선택해주세요.",
      });
    }

    if (!bulkChangeableStatuses.has(status)) {
      return res.status(400).json({
        message: "판매중 또는 판매중지 상태만 일괄 변경할 수 있습니다.",
      });
    }

    const uniqueProductIds = [...new Set(productIds.filter(Boolean))];
    const result = await Product.updateMany(
      { $or: uniqueProductIds.map(buildProductFilter) },
      { $set: { status } },
    );

    return res.json({
      message: `${result.modifiedCount}개 상품의 판매 상태를 변경했습니다.`,
      modifiedCount: result.modifiedCount,
    });
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
