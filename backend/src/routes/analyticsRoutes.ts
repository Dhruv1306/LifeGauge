import { Router } from "express";
import {
  getDailyAnalytics,
  getMomentumTimeSeries,
  getPeriodComparison,
} from "../controllers/analyticsController";
import { requireAuth } from "../middleware/auth";

const router = Router();

// All analytics routes require authentication
router.use(requireAuth);

router.get("/daily", getDailyAnalytics);
router.get("/momentum", getMomentumTimeSeries);
router.get("/comparison", getPeriodComparison);

export default router;
