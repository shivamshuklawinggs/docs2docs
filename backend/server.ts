import dotenv from "dotenv";
import app from "./src/app";
import connectDB from "./src/config/db";

dotenv.config();

const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Docks2Doc API listening on http://localhost:${PORT}`);
  });
});
