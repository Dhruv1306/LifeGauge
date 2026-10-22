import { Router } from "express";
import authRoutes from "./authRoutes";
import userRoutes from "./userRoutes";
import taskRoutes from "./taskRoutes";
import habitRoutes from "./habitRoutes";
import timeEntryRoutes from "./timeEntryRoutes";
import analyticsRoutes from "./analyticsRoutes";
import calendarRoutes from "./calendarRoutes";

const router = Router();

router.get("/health", (_req, res) => {
  res.status(200).json({
    status: "ok",
    service: "LifeGauge API",
    timestamp: new Date().toISOString(),
  });
});

router.use("/auth", authRoutes);
router.use("/user", userRoutes);
router.use("/tasks", taskRoutes);
router.use("/habits", habitRoutes);
router.use("/time-entries", timeEntryRoutes);
router.use("/analytics", analyticsRoutes);
router.use("/calendar", calendarRoutes);

export default router;
