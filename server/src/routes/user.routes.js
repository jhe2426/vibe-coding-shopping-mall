import { Router } from "express";

import {
  createUser,
  deleteUser,
  getUser,
  getUsers,
  updateUser,
} from "../controllers/user.controller.js";

const router = Router();

// 새 유저를 생성합니다.
router.post("/", createUser);

// 전체 유저 목록을 조회합니다.
router.get("/", getUsers);

// 특정 유저를 MongoDB _id 또는 userId로 조회합니다.
router.get("/:id", getUser);

// 특정 유저 정보를 전체 수정합니다.
router.put("/:id", updateUser);

// 특정 유저 정보를 일부 수정합니다.
router.patch("/:id", updateUser);

// 특정 유저를 삭제합니다.
router.delete("/:id", deleteUser);

export default router;
