import { Router } from "express";

import {
  createBanner,
  deleteBanner,
  getAdminBanners,
  getVisibleBanners,
  updateBanner,
} from "../controllers/banner.controller.js";
import { authenticateToken, requireAdmin } from "../middlewares/auth.middleware.js";

const router = Router();

router.get("/", getVisibleBanners);
router.get("/admin/all", authenticateToken, requireAdmin, getAdminBanners);
router.post("/", authenticateToken, requireAdmin, createBanner);
router.patch("/:id", authenticateToken, requireAdmin, updateBanner);
router.delete("/:id", authenticateToken, requireAdmin, deleteBanner);

export default router;
