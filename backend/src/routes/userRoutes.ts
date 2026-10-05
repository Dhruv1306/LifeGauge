import { Router } from "express";
import { getMe, updateWeights } from "../controllers/authController";
import { requireAuth } from "../middleware/auth";

const router = Router();

// Canonical user profile and settings endpoints
router.get("/profile", requireAuth, getMe);
router.put("/weights", requireAuth, updateWeights);

export default router;
