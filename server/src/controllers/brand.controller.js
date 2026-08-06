import Brand from "../models/brand.model.js";

const getNormalizedName = (name) => String(name ?? "").trim().toLocaleLowerCase("ko-KR");

// 브랜드 목록을 조회합니다.
export const getBrands = async (_req, res, next) => {
  try {
    const brands = await Brand.find().sort({ name: 1 });

    return res.json(brands);
  } catch (error) {
    return next(error);
  }
};

// 새 브랜드를 생성합니다.
export const createBrand = async (req, res, next) => {
  try {
    const normalizedName = getNormalizedName(req.body.name);
    const existingBrand = await Brand.findOne({ normalizedName });

    if (existingBrand) {
      return res.status(409).json({
        message: "이미 등록된 브랜드입니다.",
      });
    }

    const brand = await Brand.create({
      name: req.body.name,
      categories: req.body.categories,
    });

    return res.status(201).json(brand);
  } catch (error) {
    return next(error);
  }
};

// 브랜드 이름과 연결된 카테고리를 수정합니다.
export const updateBrand = async (req, res, next) => {
  try {
    const brand = await Brand.findById(req.params.id).select("+normalizedName");

    if (!brand) {
      return res.status(404).json({
        message: "브랜드를 찾을 수 없습니다.",
      });
    }

    if (typeof req.body.name === "string") {
      const normalizedName = getNormalizedName(req.body.name);
      const existingBrand = await Brand.findOne({
        normalizedName,
        _id: { $ne: brand._id },
      });

      if (existingBrand) {
        return res.status(409).json({
          message: "이미 등록된 브랜드입니다.",
        });
      }

      brand.name = req.body.name;
    }

    if (Array.isArray(req.body.categories)) {
      brand.categories = [...new Set(req.body.categories)];
    }

    await brand.save();

    return res.json(brand);
  } catch (error) {
    return next(error);
  }
};
