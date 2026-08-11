import { Router } from "express";

import { createBrand, getBrands, updateBrand } from "../controllers/brand.controller.js";
import { authenticateToken, requireAdmin } from "../middlewares/auth.middleware.js";

const router = Router();

router.get("/", getBrands);
router.post("/", authenticateToken, requireAdmin, createBrand);
router.put("/:id", authenticateToken, requireAdmin, updateBrand);

export default router;
