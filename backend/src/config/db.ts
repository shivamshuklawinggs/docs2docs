import mongoose from "mongoose";

async function connectDB(): Promise<void> {
  const uri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/docks2doc";
  try {
    await mongoose.connect(uri);
    console.log(`MongoDB connected -> ${uri}`);
  } catch (err) {
    console.error("MongoDB connection error:", (err as Error).message);
    process.exit(1);
  }
}

export default connectDB;
