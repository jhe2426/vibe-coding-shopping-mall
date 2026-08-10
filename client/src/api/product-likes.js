import { buildAuthHeaders } from "../utils/auth-storage.js";

export const WISHLIST_CHANGE_EVENT = "stride-wishlist-change";

export const getProductLikeKey = (product) => product?.productId || product?.id || product?._id;

export const fetchProductLikes = async (apiBaseUrl) => {
  const response = await fetch(`${apiBaseUrl}/likes`, {
    headers: {
      ...buildAuthHeaders(),
    },
  });
  const data = await response.json().catch(() => []);

  if (!response.ok) {
    throw new Error(data.message || "찜한 상품을 불러오지 못했습니다.");
  }

  return Array.isArray(data) ? data : [];
};

export const updateProductLikeStatus = async (apiBaseUrl, productId, liked) => {
  const response = await fetch(`${apiBaseUrl}/likes/${productId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...buildAuthHeaders(),
    },
    body: JSON.stringify({ liked }),
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || "찜 상태를 변경하지 못했습니다.");
  }

  window.dispatchEvent(new Event(WISHLIST_CHANGE_EVENT));
  return data;
};

export const deleteProductLike = async (apiBaseUrl, productId) => {
  const response = await fetch(`${apiBaseUrl}/likes/${productId}`, {
    method: "DELETE",
    headers: {
      ...buildAuthHeaders(),
    },
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.message || "찜한 상품을 삭제하지 못했습니다.");
  }

  window.dispatchEvent(new Event(WISHLIST_CHANGE_EVENT));
};
