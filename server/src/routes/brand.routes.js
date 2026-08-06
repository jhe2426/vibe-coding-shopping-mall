import { Router } from "express";

import { createBrand, getBrands, updateBrand } from "../controllers/brand.controller.js";

const router = Router();

router.get("/", getBrands);
router.post("/", createBrand);
router.put("/:id", updateBrand);

export default router;
