import mongoose from "mongoose";

const MONGO_URI = process.env.MONGO_URI || "mongodb://mongo:27017/klymo";

export async function connectMongo() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("MongoDB connected:", MONGO_URI);
  } catch (err) {
    console.error("MongoDB connection error:", err);
    throw err;
  }
}
