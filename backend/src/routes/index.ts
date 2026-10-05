import { Router } from "express";
import authRoutes from "./authRoutes";

const router = Router();

router.get("/health", (_req, res) => {
  res.status(200).json({
    status: "ok",
    service: "LifeGauge API",
    timestamp: new Date().toISOString(),
  });
});

router.use("/auth", authRoutes);

export default router;
