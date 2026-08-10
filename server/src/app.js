import cors from "cors";
import express from "express";
import morgan from "morgan";

import authRouter from "./routes/auth.routes.js";
import brandRouter from "./routes/brand.routes.js";
import cartRouter from "./routes/cart.routes.js";
import orderRouter from "./routes/order.routes.js";
import productRouter from "./routes/product.routes.js";
import productLikeRouter from "./routes/product-like.routes.js";
import productQuestionRouter from "./routes/product-question.routes.js";
import userRouter from "./routes/user.routes.js";

const app = express();

app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || "http://localhost:3000",
    credentials: true,
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));

app.get("/", (_req, res) => {
  res.json({
    message: "Shopping mall API server is running",
  });
});

app.use("/api/auth", authRouter);
app.use("/api/brands", brandRouter);
app.use("/api/cart", cartRouter);
app.use("/api/likes", productLikeRouter);
app.use("/api/orders", orderRouter);
app.use("/api/products/:productId/questions", productQuestionRouter);
app.use("/api/products", productRouter);
app.use("/api/users", userRouter);

app.use((req, res) => {
  res.status(404).json({
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

app.use((err, _req, res, _next) => {
  console.error(err);

  if (err.name === "ValidationError") {
    return res.status(400).json({
      message: Object.values(err.errors)
        .map((error) => error.message)
        .join(" "),
    });
  }

  if (err.code === 11000) {
    if (err.keyPattern?.normalizedName) {
      return res.status(409).json({
        message: "이미 등록된 브랜드입니다.",
      });
    }

    if (err.keyPattern?.productId) {
      return res.status(409).json({
        message: "이미 사용 중인 상품 아이디입니다.",
      });
    }

    return res.status(409).json({
      message: "이미 사용 중인 아이디입니다.",
    });
  }

  res.status(err.status || 500).json({
    message: err.message || "Internal server error",
  });
});

export default app;
