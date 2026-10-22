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
  // Google Calendar OAuth 2.0 — fill in after creating credentials in Google Cloud Console
  googleClientId: process.env.GOOGLE_CLIENT_ID || "",
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
  googleRedirectUri: process.env.GOOGLE_REDIRECT_URI || "http://localhost:5000/api/calendar/google/callback",
  // 32-byte hex key for AES-256-GCM encryption of stored refresh tokens.
  // Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  calendarEncryptionKey: process.env.CALENDAR_ENCRYPTION_KEY || "0000000000000000000000000000000000000000000000000000000000000000",
} as const;

