import { buildAuthHeaders } from "./auth-storage.js";

const GUEST_CART_KEY = "strideGuestCart";

const getProductId = (product) => product?.productId || product?.id;
const getProductPrice = (product) => Number(product?.salePrice ?? product?.regularPrice ?? 0);
const getItemId = (productId, size) => `guest-${productId}-${size}`;

const getProductSnapshot = (product) => ({
  productId: getProductId(product),
  name: product?.name || "상품",
  targetGender: product?.targetGender,
  category: product?.category,
  cardImages: product?.cardImages || {},
  sizes: Array.isArray(product?.sizes) ? product.sizes : [],
});

const getStockQuantity = (product, size) => (
  product?.sizes?.find((sizeItem) => Number(sizeItem.size) === Number(size))?.stockQuantity ?? 99
);

const toCart = (items) => ({
  id: "guest-cart",
  items,
  totalAmount: items.reduce((total, item) => total + (item.unitPrice * item.quantity), 0),
});

const saveItems = (items) => {
  localStorage.setItem(GUEST_CART_KEY, JSON.stringify(items));
  return toCart(items);
};

export const getGuestCart = () => {
  try {
    const storedItems = JSON.parse(localStorage.getItem(GUEST_CART_KEY) || "[]");

    if (!Array.isArray(storedItems)) {
      return toCart([]);
    }

    const items = storedItems.filter((item) => (
      item
      && item.productId
      && Number.isInteger(Number(item.size))
      && Number.isInteger(Number(item.quantity))
      && Number(item.quantity) > 0
      && item.product
    ));

    return toCart(items);
  } catch {
    return toCart([]);
  }
};

export const getGuestCartItemCount = () => (
  getGuestCart().items.reduce((count, item) => count + item.quantity, 0)
);

export const addGuestCartItem = ({ product, size, quantity }) => {
  const productId = getProductId(product);
  const parsedSize = Number(size);
  const parsedQuantity = Number(quantity);

  if (!productId || !Number.isInteger(parsedSize) || !Number.isInteger(parsedQuantity) || parsedQuantity < 1) {
    throw new Error("장바구니에 담을 상품 정보가 올바르지 않습니다.");
  }

  const cart = getGuestCart();
  const existingItem = cart.items.find((item) => item.productId === productId && Number(item.size) === parsedSize);
  const nextQuantity = (existingItem?.quantity || 0) + parsedQuantity;
  const stockQuantity = getStockQuantity(product, parsedSize);

  if (nextQuantity > stockQuantity) {
    throw new Error("재고 수량을 초과했습니다.");
  }

  const nextItems = existingItem
    ? cart.items.map((item) => (
      item.id === existingItem.id
        ? {
          ...item,
          product: getProductSnapshot(product),
          quantity: nextQuantity,
          unitPrice: getProductPrice(product),
        }
        : item
    ))
    : [
      ...cart.items,
      {
        id: getItemId(productId, parsedSize),
        productId,
        product: getProductSnapshot(product),
        size: parsedSize,
        quantity: parsedQuantity,
        unitPrice: getProductPrice(product),
      },
    ];

  return saveItems(nextItems);
};

export const updateGuestCartItem = (itemId, quantity) => {
  const parsedQuantity = Number(quantity);
  const cart = getGuestCart();
  const item = cart.items.find((cartItem) => cartItem.id === itemId);

  if (!item || !Number.isInteger(parsedQuantity) || parsedQuantity < 1) {
    throw new Error("수량을 변경하지 못했습니다.");
  }

  if (parsedQuantity > getStockQuantity(item.product, item.size)) {
    throw new Error("재고 수량을 초과했습니다.");
  }

  return saveItems(cart.items.map((cartItem) => (
    cartItem.id === itemId ? { ...cartItem, quantity: parsedQuantity } : cartItem
  )));
};

export const deleteGuestCartItem = (itemId) => {
  const cart = getGuestCart();
  return saveItems(cart.items.filter((item) => item.id !== itemId));
};

export const clearGuestCart = () => {
  localStorage.removeItem(GUEST_CART_KEY);
  return toCart([]);
};

// 로그인 성공 후 비회원 장바구니를 기존 회원 장바구니에 병합합니다.
export const mergeGuestCartToAccount = async (apiBaseUrl) => {
  const guestCart = getGuestCart();

  if (guestCart.items.length === 0) {
    return { mergedCount: 0, failedCount: 0 };
  }

  const failedItems = [];

  for (const item of guestCart.items) {
    try {
      const response = await fetch(`${apiBaseUrl}/cart/items`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...buildAuthHeaders(),
        },
        body: JSON.stringify({
          productId: item.productId,
          size: item.size,
          quantity: item.quantity,
        }),
      });

      if (!response.ok) {
        failedItems.push(item);
      }
    } catch {
      failedItems.push(item);
    }
  }

  if (failedItems.length > 0) {
    saveItems(failedItems);
  } else {
    clearGuestCart();
  }

  return {
    mergedCount: guestCart.items.length - failedItems.length,
    failedCount: failedItems.length,
  };
};
