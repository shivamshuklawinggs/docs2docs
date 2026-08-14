import express from "express";
import cors from "cors";
import morgan from "morgan";
import swaggerUi from 'swagger-ui-express';

import routes from "./routes";
import { notFound, errorHandler } from "./middleware/errorHandler";
import swaggerSpec from './config/swagger';

const app = express();

const allowedOrigins = (
  process.env.CORS_ORIGIN || "http://localhost:3000"
)
  .split(",")
  .map((origin) => origin.trim());

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);
app.use(express.json());
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

app.get("/health", (req, res) => res.json({ ok: true, service: "docks2doc-backend" }));

// Swagger API Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use("/api", routes);

app.use(notFound);
app.use(errorHandler);

export default app;
