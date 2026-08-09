import mongoose from "mongoose";

import Product from "../models/product.model.js";
import ProductQuestion from "../models/product-question.model.js";
import ProductQuestionReply from "../models/product-question-reply.model.js";
import User from "../models/user.model.js";

const buildProductFilter = (id) => (
  mongoose.isValidObjectId(id) ? { _id: id } : { productId: id }
);

const maskAuthorName = (authorName) => {
  const trimmedName = String(authorName || "").trim();

  if (trimmedName.length <= 1) return "*";

  return `${trimmedName.slice(0, 1)}${"*".repeat(Math.max(1, trimmedName.length - 1))}`;
};

const serializeReply = (reply) => ({
  id: reply._id.toString(),
  authorName: reply.authorName,
  content: reply.content,
  createdAt: reply.createdAt,
});

const serializeQuestionListItem = (question, replies = []) => ({
  id: question._id.toString(),
  title: question.title,
  isSecret: question.isSecret,
  authorName: maskAuthorName(question.authorName),
  content: question.isSecret ? null : question.content,
  replies: question.isSecret ? [] : replies.map(serializeReply),
  createdAt: question.createdAt,
});

const findProduct = (id) => Product.findOne(buildProductFilter(id));

// 누구나 상품 문의의 제목과 공개 본문을 조회할 수 있습니다.
export const getProductQuestions = async (req, res, next) => {
  try {
    const product = await findProduct(req.params.productId);

    if (!product) {
      return res.status(404).json({ message: "상품을 찾을 수 없습니다." });
    }

    const questions = await ProductQuestion.find({ productId: product.productId }).sort({ createdAt: -1 });
    const replies = await ProductQuestionReply.find({
      question: { $in: questions.map((question) => question._id) },
    }).sort({ createdAt: 1 });
    const repliesByQuestionId = new Map();

    replies.forEach((reply) => {
      const questionId = reply.question.toString();
      const questionReplies = repliesByQuestionId.get(questionId) || [];

      questionReplies.push(reply);
      repliesByQuestionId.set(questionId, questionReplies);
    });

    return res.json(questions.map((question) => (
      serializeQuestionListItem(question, repliesByQuestionId.get(question._id.toString()) || [])
    )));
  } catch (error) {
    return next(error);
  }
};

// 로그인한 사용자가 공개 또는 비공개 상품 문의를 등록합니다.
export const createProductQuestion = async (req, res, next) => {
  try {
    const product = await findProduct(req.params.productId);

    if (!product) {
      return res.status(404).json({ message: "상품을 찾을 수 없습니다." });
    }

    const author = await User.findById(req.authUser.id);

    if (!author) {
      return res.status(401).json({ message: "로그인 정보를 확인할 수 없습니다." });
    }

    const question = await ProductQuestion.create({
      productId: product.productId,
      author: author._id,
      authorName: author.name,
      title: req.body.title,
      content: req.body.content,
      isSecret: req.body.isSecret === true || req.body.isSecret === "true",
    });

    return res.status(201).json(serializeQuestionListItem(question));
  } catch (error) {
    return next(error);
  }
};

// 비공개 문의 본문은 관리자만 선택해서 확인할 수 있습니다.
export const getProductQuestionDetail = async (req, res, next) => {
  try {
    if (req.authUser.userType !== "admin") {
      return res.status(403).json({ message: "비공개 문의는 관리자만 확인할 수 있습니다." });
    }

    const product = await findProduct(req.params.productId);

    if (!product) {
      return res.status(404).json({ message: "상품을 찾을 수 없습니다." });
    }

    const question = await ProductQuestion.findOne({
      _id: req.params.questionId,
      productId: product.productId,
    });

    if (!question) {
      return res.status(404).json({ message: "문의글을 찾을 수 없습니다." });
    }

    const replies = await ProductQuestionReply.find({ question: question._id }).sort({ createdAt: 1 });

    return res.json({
      id: question._id.toString(),
      title: question.title,
      content: question.content,
      isSecret: question.isSecret,
      authorName: maskAuthorName(question.authorName),
      replies: replies.map(serializeReply),
      createdAt: question.createdAt,
    });
  } catch (error) {
    return next(error);
  }
};

// 관리자만 선택한 문의 아래에 답글을 등록할 수 있습니다.
export const createProductQuestionReply = async (req, res, next) => {
  try {
    if (req.authUser.userType !== "admin") {
      return res.status(403).json({ message: "답글은 관리자만 등록할 수 있습니다." });
    }

    const product = await findProduct(req.params.productId);

    if (!product) {
      return res.status(404).json({ message: "상품을 찾을 수 없습니다." });
    }

    const question = await ProductQuestion.findOne({
      _id: req.params.questionId,
      productId: product.productId,
    });

    if (!question) {
      return res.status(404).json({ message: "문의글을 찾을 수 없습니다." });
    }

    const author = await User.findById(req.authUser.id);

    if (!author) {
      return res.status(401).json({ message: "로그인 정보를 확인할 수 없습니다." });
    }

    const reply = await ProductQuestionReply.create({
      question: question._id,
      productId: product.productId,
      author: author._id,
      authorName: author.name,
      content: req.body.content,
    });

    return res.status(201).json(serializeReply(reply));
  } catch (error) {
    return next(error);
  }
};
