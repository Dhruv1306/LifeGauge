import { Router } from "express";
import { register, login, getMe, updateWeights } from "../controllers/authController";
import { requireAuth } from "../middleware/auth";
import { loginRateLimiter } from "../middleware/rateLimiter";

const router = Router();

router.post("/register", register);
router.post("/login", loginRateLimiter, login);
router.get("/me", requireAuth, getMe);
router.put("/weights", requireAuth, updateWeights);

export default router;
