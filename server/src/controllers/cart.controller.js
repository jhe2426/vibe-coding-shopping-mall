import mongoose from "mongoose";

import Cart from "../models/cart.model.js";
import Product from "../models/product.model.js";

const buildProductFilter = (id) => (
  mongoose.isValidObjectId(id) ? { _id: id } : { productId: id }
);

const getProductPrice = (product) => product.salePrice ?? product.regularPrice;

const getCartForUser = (userId) => Cart.findOne({ user: userId }).populate("items.product");

const serializeCart = (cart) => (cart ? cart.toJSON() : {
  id: null,
  items: [],
  totalAmount: 0,
});

const validateQuantity = (quantity) => {
  const parsedQuantity = Number(quantity);

  if (!Number.isInteger(parsedQuantity) || parsedQuantity < 1 || parsedQuantity > 99) {
    const error = new Error("상품 수량은 1개 이상 99개 이하여야 합니다.");
    error.status = 400;
    throw error;
  }

  return parsedQuantity;
};

const findProductSize = (product, size) => {
  const parsedSize = Number(size);
  const sizeItem = product.sizes.find((item) => item.size === parsedSize);

  if (!sizeItem) {
    const error = new Error("선택한 사이즈를 찾을 수 없습니다.");
    error.status = 400;
    throw error;
  }

  return sizeItem;
};

// 로그인한 사용자의 장바구니를 조회합니다.
export const getCart = async (req, res, next) => {
  try {
    const cart = await getCartForUser(req.authUser.id);

    return res.json(serializeCart(cart));
  } catch (error) {
    return next(error);
  }
};

// 상품과 사이즈를 장바구니에 담습니다. 이미 담긴 항목이면 수량을 합칩니다.
export const addCartItem = async (req, res, next) => {
  try {
    const product = await Product.findOne(buildProductFilter(req.body.productId));

    if (!product) {
      return res.status(404).json({ message: "상품을 찾을 수 없습니다." });
    }

    const quantity = validateQuantity(req.body.quantity ?? 1);
    const sizeItem = findProductSize(product, req.body.size);
    let cart = await getCartForUser(req.authUser.id);

    if (!cart) {
      cart = new Cart({ user: req.authUser.id, items: [] });
    }

    const existingItem = cart.items.find((item) => (
      item.productId === product.productId && item.size === sizeItem.size
    ));
    const nextQuantity = (existingItem?.quantity || 0) + quantity;

    if (nextQuantity > sizeItem.stockQuantity) {
      return res.status(400).json({ message: "재고 수량을 초과했습니다." });
    }

    if (existingItem) {
      existingItem.quantity = nextQuantity;
      existingItem.unitPrice = getProductPrice(product);
    } else {
      cart.items.push({
        product: product._id,
        productId: product.productId,
        size: sizeItem.size,
        unitPrice: getProductPrice(product),
        quantity,
      });
    }

    await cart.save();
    await cart.populate("items.product");

    return res.status(201).json(serializeCart(cart));
  } catch (error) {
    return next(error);
  }
};

// 장바구니 항목의 수량을 변경합니다.
export const updateCartItem = async (req, res, next) => {
  try {
    const cart = await getCartForUser(req.authUser.id);

    if (!cart) {
      return res.status(404).json({ message: "장바구니를 찾을 수 없습니다." });
    }

    const item = cart.items.id(req.params.itemId);

    if (!item) {
      return res.status(404).json({ message: "장바구니 상품을 찾을 수 없습니다." });
    }

    const product = await Product.findOne({ productId: item.productId });

    if (!product) {
      return res.status(404).json({ message: "상품을 찾을 수 없습니다." });
    }

    const quantity = validateQuantity(req.body.quantity);
    const sizeItem = findProductSize(product, item.size);

    if (quantity > sizeItem.stockQuantity) {
      return res.status(400).json({ message: "재고 수량을 초과했습니다." });
    }

    item.quantity = quantity;
    item.unitPrice = getProductPrice(product);
    await cart.save();
    await cart.populate("items.product");

    return res.json(serializeCart(cart));
  } catch (error) {
    return next(error);
  }
};

// 장바구니에서 특정 상품을 삭제합니다.
export const deleteCartItem = async (req, res, next) => {
  try {
    const cart = await getCartForUser(req.authUser.id);

    if (!cart) {
      return res.status(404).json({ message: "장바구니를 찾을 수 없습니다." });
    }

    const item = cart.items.id(req.params.itemId);

    if (!item) {
      return res.status(404).json({ message: "장바구니 상품을 찾을 수 없습니다." });
    }

    item.deleteOne();
    await cart.save();
    await cart.populate("items.product");

    return res.json(serializeCart(cart));
  } catch (error) {
    return next(error);
  }
};

// 로그인한 사용자의 장바구니를 비웁니다.
export const clearCart = async (req, res, next) => {
  try {
    const cart = await getCartForUser(req.authUser.id);

    if (!cart) {
      return res.json(serializeCart(null));
    }

    cart.items = [];
    await cart.save();

    return res.json(serializeCart(cart));
  } catch (error) {
    return next(error);
  }
};
