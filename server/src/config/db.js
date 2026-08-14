import mongoose from "mongoose";

export const connectDB = async () => {
  const mongoUri =
    process.env.MONGODB_ATLAS_URL || "mongodb://127.0.0.1:27017/shopping-mall";

  mongoose.connection.on("connected", () => {
    console.log("MongoDB connected");
  });

  mongoose.connection.on("error", (error) => {
    console.error("MongoDB connection error:", error);
  });

  mongoose.connection.on("disconnected", () => {
    console.warn("MongoDB disconnected");
  });

  await mongoose.connect(mongoUri, {
    serverSelectionTimeoutMS: 5000,
  });
};
