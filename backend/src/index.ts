import express from "express";
import cors from "cors";
import { config } from "./config";
import routes from "./routes";
import { errorHandler } from "./middleware/errorHandler";
import { prisma } from "./lib/prisma";

const app = express();

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, postman) or configured origin
      if (!origin || origin === config.corsOrigin || origin.startsWith("http://localhost")) {
        callback(null, true);
      } else {
        callback(null, true); // Allow during development, configurable for production
      }
    },
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization", "X-Cron-Secret"],
  })
);

app.use(express.json());

// API Routes
app.use("/api", routes);

// Global Error Handler
app.use(errorHandler);

// Only listen if not running in test mode
if (process.env.NODE_ENV !== "test") {
  const server = app.listen(config.port, () => {
    console.log(`[LifeGauge API] Server running on http://localhost:${config.port}`);
    console.log(`[LifeGauge API] Environment: ${config.nodeEnv}`);
  });

  const shutdown = async (signal: string) => {
    console.log(`[LifeGauge API] ${signal} received; closing server and database connections`);
    server.close(async () => {
      await prisma.$disconnect();
      process.exit(0);
    });
  };

  process.once("SIGINT", () => void shutdown("SIGINT"));
  process.once("SIGTERM", () => void shutdown("SIGTERM"));
}

export default app;
