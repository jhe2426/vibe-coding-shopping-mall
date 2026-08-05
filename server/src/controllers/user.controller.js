import mongoose from "mongoose";

import User from "../models/user.model.js";
import { hashPassword } from "../utils/password.js";

const buildUserFilter = (id) => {
  if (mongoose.isValidObjectId(id)) {
    return { _id: id };
  }

  return { userId: id };
};

const hasOwnProperty = (target, key) => Object.prototype.hasOwnProperty.call(target, key);

// 요청 body에 비밀번호가 들어오면 DB 저장 전에 안전한 해시 값으로 바꿉니다.
const buildUserPayload = async (body) => {
  const payload = { ...body };

  if (hasOwnProperty(payload, "password") && String(payload.password || "").trim()) {
    payload.password = await hashPassword(payload.password);
  }

  return payload;
};

export const createUser = async (req, res, next) => {
  try {
    const user = await User.create(await buildUserPayload(req.body));
    const createdUser = await User.findById(user._id);

    res.status(201).json(createdUser);
  } catch (error) {
    next(error);
  }
};

export const getUsers = async (_req, res, next) => {
  try {
    const users = await User.find().sort({ createdAt: -1 });

    res.json(users);
  } catch (error) {
    next(error);
  }
};

export const getUser = async (req, res, next) => {
  try {
    const user = await User.findOne(buildUserFilter(req.params.id));

    if (!user) {
      return res.status(404).json({
        message: "유저를 찾을 수 없습니다.",
      });
    }

    return res.json(user);
  } catch (error) {
    return next(error);
  }
};

export const updateUser = async (req, res, next) => {
  try {
    const user = await User.findOneAndUpdate(buildUserFilter(req.params.id), await buildUserPayload(req.body), {
      new: true,
      runValidators: true,
    });

    if (!user) {
      return res.status(404).json({
        message: "유저를 찾을 수 없습니다.",
      });
    }

    return res.json(user);
  } catch (error) {
    return next(error);
  }
};

export const deleteUser = async (req, res, next) => {
  try {
    const user = await User.findOneAndDelete(buildUserFilter(req.params.id));

    if (!user) {
      return res.status(404).json({
        message: "유저를 찾을 수 없습니다.",
      });
    }

    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
};
