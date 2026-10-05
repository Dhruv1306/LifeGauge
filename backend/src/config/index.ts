import dotenv from "dotenv";

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || "5000", 10),
  nodeEnv: process.env.NODE_ENV || "development",
  jwtSecret: process.env.JWT_SECRET || "lifegauge_dev_secret_key_change_in_production_2026",
  jwtExpiresIn: "7d",
  cronSecret: process.env.CRON_SECRET || "lifegauge_cron_secret_webhook_2026",
  corsOrigin: process.env.CORS_ORIGIN || "http://localhost:5173",
  databaseUrl: process.env.DATABASE_URL || "mysql://root:password@localhost:3306/lifegauge",
} as const;

