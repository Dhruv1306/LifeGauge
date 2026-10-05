import { Router } from "express";
import {
  getHabits,
  createHabit,
  updateHabit,
  deleteHabit,
  toggleHabit,
  getHabitMatrix,
} from "../controllers/habitController";
import { requireAuth } from "../middleware/auth";

const router = Router();

// All habit routes require authentication
router.use(requireAuth);

router.get("/", getHabits);
router.post("/", createHabit);
router.get("/matrix", getHabitMatrix);
router.patch("/:id", updateHabit);
router.delete("/:id", deleteHabit);
router.post("/:id/toggle", toggleHabit);

export default router;
