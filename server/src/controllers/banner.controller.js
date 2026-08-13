import Banner from "../models/banner.model.js";
import Product from "../models/product.model.js";

const getBannerFilter = (id) => ({ _id: id });

const validateLinkedProduct = async (linkedProductId) => {
  const product = await Product.findOne({ productId: String(linkedProductId || "").trim() });

  if (!product) {
    const error = new Error("연결할 상품을 찾을 수 없습니다.");
    error.status = 400;
    throw error;
  }
};

// 고객 메인에 노출할 배너만 조회합니다.
export const getVisibleBanners = async (_req, res, next) => {
  try {
    const banners = await Banner.find({ isVisible: true }).sort({ displayOrder: 1, createdAt: -1 });
    return res.json(banners);
  } catch (error) {
    return next(error);
  }
};

// 관리자용 전체 배너 목록입니다.
export const getAdminBanners = async (_req, res, next) => {
  try {
    const banners = await Banner.find().sort({ displayOrder: 1, createdAt: -1 });
    return res.json(banners);
  } catch (error) {
    return next(error);
  }
};

export const createBanner = async (req, res, next) => {
  try {
    await validateLinkedProduct(req.body.linkedProductId);
    const banner = await Banner.create(req.body);
    return res.status(201).json(banner);
  } catch (error) {
    return next(error);
  }
};

export const updateBanner = async (req, res, next) => {
  try {
    const banner = await Banner.findOne(getBannerFilter(req.params.id));

    if (!banner) {
      return res.status(404).json({ message: "배너를 찾을 수 없습니다." });
    }

    if (req.body.linkedProductId !== undefined) {
      await validateLinkedProduct(req.body.linkedProductId);
    }

    banner.set(req.body);
    await banner.save();
    return res.json(banner);
  } catch (error) {
    return next(error);
  }
};

export const deleteBanner = async (req, res, next) => {
  try {
    const banner = await Banner.findOneAndDelete(getBannerFilter(req.params.id));

    if (!banner) {
      return res.status(404).json({ message: "배너를 찾을 수 없습니다." });
    }

    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
};
