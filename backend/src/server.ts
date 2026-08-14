import dotenv from "dotenv";
import app from "./app";
import connectDB from "./config/db";

dotenv.config();

const PORT = process.env.PORT || 7002;

async function startServer() {
  try {
    await connectDB();
    app.listen(PORT, () => {
      console.log(`Docks2Doc API listening on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

startServer();
